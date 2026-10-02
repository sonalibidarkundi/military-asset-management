import { query, pool } from '../config/db.js';
import logAudit from '../utils/auditLogger.js';

// @desc    Get expenditures & consumption list with search and filters
// @route   GET /api/expenditures
// @access  Private
export const getExpenditures = async (req, res, next) => {
  try {
    let sql = `
      SELECT 
        exp.id,
        exp.quantity,
        exp.expenditure_date,
        exp.reason,
        exp.created_at,
        b.id AS base_id,
        b.name AS base_name,
        b.code AS base_code,
        a.id AS asset_id,
        a.serial_number,
        et.id AS equipment_type_id,
        et.name AS equipment_name,
        et.category,
        et.unit,
        u.name AS created_by_name
      FROM expenditures exp
      JOIN bases b ON exp.base_id = b.id
      JOIN assets a ON exp.asset_id = a.id
      JOIN equipment_types et ON a.equipment_type_id = et.id
      LEFT JOIN users u ON exp.created_by = u.id
    `;

    const whereClauses = [];
    const params = [];

    // RBAC Scope Check for Base Commander
    if (req.user.role === 'base_commander') {
      if (!req.user.base_id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Commander is not assigned to a base.',
        });
      }
      params.push(req.user.base_id);
      whereClauses.push(`exp.base_id = $${params.length}`);
    } else if (req.query.base_id) {
      params.push(parseInt(req.query.base_id, 10));
      whereClauses.push(`exp.base_id = $${params.length}`);
    }

    if (req.query.equipment_type_id) {
      params.push(parseInt(req.query.equipment_type_id, 10));
      whereClauses.push(`et.id = $${params.length}`);
    }

    if (req.query.reason) {
      params.push(req.query.reason);
      whereClauses.push(`exp.reason ILIKE $${params.length}`);
    }

    if (req.query.date_from) {
      params.push(req.query.date_from);
      whereClauses.push(`exp.expenditure_date >= $${params.length}`);
    }

    if (req.query.date_to) {
      params.push(req.query.date_to);
      whereClauses.push(`exp.expenditure_date <= $${params.length}`);
    }

    if (req.query.date && !req.query.date_from && !req.query.date_to) {
      params.push(req.query.date);
      whereClauses.push(`exp.expenditure_date = $${params.length}`);
    }

    if (req.query.search) {
      const searchTerm = `%${req.query.search.trim()}%`;
      params.push(searchTerm);
      const idx = params.length;
      whereClauses.push(
        `(CAST(a.id AS TEXT) ILIKE $${idx} OR a.serial_number ILIKE $${idx} OR et.name ILIKE $${idx} OR exp.reason ILIKE $${idx})`
      );
    }

    if (whereClauses.length > 0) {
      sql += ' WHERE ' + whereClauses.join(' AND ');
    }

    sql += ' ORDER BY exp.expenditure_date DESC, exp.id DESC';

    const result = await query(sql, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single expenditure details
// @route   GET /api/expenditures/:id
// @access  Private
export const getExpenditureById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT 
        exp.id,
        exp.quantity,
        exp.expenditure_date,
        exp.reason,
        exp.created_at,
        b.id AS base_id,
        b.name AS base_name,
        b.code AS base_code,
        a.id AS asset_id,
        a.serial_number,
        et.id AS equipment_type_id,
        et.name AS equipment_name,
        et.category,
        et.unit,
        u.name AS created_by_name
      FROM expenditures exp
      JOIN bases b ON exp.base_id = b.id
      JOIN assets a ON exp.asset_id = a.id
      JOIN equipment_types et ON a.equipment_type_id = et.id
      LEFT JOIN users u ON exp.created_by = u.id
      WHERE exp.id = $1
    `;

    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Expenditure record not found.',
      });
    }

    const expenditure = result.rows[0];

    // RBAC Scope Check for Base Commander
    if (req.user.role === 'base_commander' && expenditure.base_id !== req.user.base_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to view expenditures belonging to another base.',
      });
    }

    res.json({
      success: true,
      data: expenditure,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Record asset expenditure / consumption (Transaction protected)
// @route   POST /api/expenditures
// @access  Private (Admin, Logistics Officer, Base Commander)
export const createExpenditure = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { asset_id, base_id, quantity, reason, expenditure_date } = req.body;

    if (!asset_id || !quantity || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Asset, quantity, and reason are required.',
      });
    }

    if (typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Expenditure reason is required.',
      });
    }

    const numQty = parseInt(quantity, 10);
    if (isNaN(numQty) || numQty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive integer greater than zero.',
      });
    }

    await client.query('BEGIN');

    // 1. Lock asset row to check existence, base & stock
    const assetCheckSql = `
      SELECT a.id, a.quantity, a.base_id, et.name AS equipment_name
      FROM assets a
      JOIN equipment_types et ON a.equipment_type_id = et.id
      WHERE a.id = $1
      FOR UPDATE;
    `;
    const assetResult = await client.query(assetCheckSql, [asset_id]);

    if (assetResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Target asset record not found.',
      });
    }

    const asset = assetResult.rows[0];
    const targetBaseId = base_id ? parseInt(base_id, 10) : asset.base_id;

    // RBAC: Base Commander scope check
    if (req.user.role === 'base_commander' && asset.base_id !== req.user.base_id) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to record this expenditure.',
      });
    }

    // 2. Stock Availability Check
    if (asset.quantity < numQty) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Insufficient available quantity for this expenditure.',
      });
    }

    // 3. Deduct stock from assets
    await client.query(
      'UPDATE assets SET quantity = quantity - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [numQty, asset.id]
    );

    // 4. Create Expenditure Record
    const expSql = `
      INSERT INTO expenditures (asset_id, base_id, quantity, expenditure_date, reason, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const expResult = await client.query(expSql, [
      asset.id,
      targetBaseId,
      numQty,
      expenditure_date || new Date().toISOString().split('T')[0],
      reason.trim(),
      req.user.id,
    ]);

    const newExpenditure = expResult.rows[0];

    // 5. Log Audit
    await logAudit({
      userId: req.user.id,
      action: 'CREATE_EXPENDITURE',
      entityType: 'EXPENDITURE',
      entityId: newExpenditure.id,
      details: {
        asset_id: asset.id,
        base_id: targetBaseId,
        quantity: numQty,
        reason: reason.trim(),
        expenditure_date: expenditure_date || new Date().toISOString().split('T')[0],
      },
      ipAddress: req.ip,
      client,
    });

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: newExpenditure,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};
