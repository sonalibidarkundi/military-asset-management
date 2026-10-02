import { query, pool } from '../config/db.js';
import logAudit from '../utils/auditLogger.js';

// @desc    Get purchases list with search and multi-field filters
// @route   GET /api/purchases
// @access  Private
export const getPurchases = async (req, res, next) => {
  try {
    let sql = `
      SELECT 
        p.id,
        p.quantity,
        p.purchase_date,
        p.supplier,
        p.reference_number,
        p.notes,
        p.created_at,
        b.id AS base_id,
        b.name AS base_name,
        b.code AS base_code,
        et.id AS equipment_type_id,
        et.name AS equipment_name,
        et.category,
        et.unit,
        u.name AS created_by_name
      FROM purchases p
      JOIN bases b ON p.base_id = b.id
      JOIN equipment_types et ON p.equipment_type_id = et.id
      LEFT JOIN users u ON p.created_by = u.id
    `;

    const whereClauses = [];
    const params = [];

    // RBAC Scope Check: Base Commander
    if (req.user.role === 'base_commander') {
      if (!req.user.base_id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Commander is not assigned to a command base.',
        });
      }
      params.push(req.user.base_id);
      whereClauses.push(`p.base_id = $${params.length}`);
    } else if (req.query.base_id) {
      params.push(parseInt(req.query.base_id, 10));
      whereClauses.push(`p.base_id = $${params.length}`);
    }

    if (req.query.equipment_type_id) {
      params.push(parseInt(req.query.equipment_type_id, 10));
      whereClauses.push(`p.equipment_type_id = $${params.length}`);
    }

    if (req.query.supplier) {
      params.push(`%${req.query.supplier.trim()}%`);
      whereClauses.push(`p.supplier ILIKE $${params.length}`);
    }

    if (req.query.date_from) {
      params.push(req.query.date_from);
      whereClauses.push(`p.purchase_date >= $${params.length}`);
    }

    if (req.query.date_to) {
      params.push(req.query.date_to);
      whereClauses.push(`p.purchase_date <= $${params.length}`);
    }

    if (req.query.date && !req.query.date_from && !req.query.date_to) {
      params.push(req.query.date);
      whereClauses.push(`p.purchase_date = $${params.length}`);
    }

    if (req.query.search) {
      const searchTerm = `%${req.query.search.trim()}%`;
      params.push(searchTerm);
      const sIndex = params.length;
      whereClauses.push(
        `(p.supplier ILIKE $${sIndex} OR p.reference_number ILIKE $${sIndex} OR et.name ILIKE $${sIndex} OR b.name ILIKE $${sIndex})`
      );
    }

    if (whereClauses.length > 0) {
      sql += ' WHERE ' + whereClauses.join(' AND ');
    }

    sql += ' ORDER BY p.purchase_date DESC, p.id DESC';

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

// @desc    Get purchase detail by ID
// @route   GET /api/purchases/:id
// @access  Private
export const getPurchaseById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT 
        p.id,
        p.quantity,
        p.purchase_date,
        p.supplier,
        p.reference_number,
        p.notes,
        p.created_at,
        b.id AS base_id,
        b.name AS base_name,
        b.code AS base_code,
        et.id AS equipment_type_id,
        et.name AS equipment_name,
        et.category,
        et.unit,
        u.name AS created_by_name
      FROM purchases p
      JOIN bases b ON p.base_id = b.id
      JOIN equipment_types et ON p.equipment_type_id = et.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = $1
    `;

    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Purchase record not found.',
      });
    }

    const purchase = result.rows[0];

    // RBAC: Base Commander isolation check
    if (req.user.role === 'base_commander' && purchase.base_id !== req.user.base_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to view purchase records from another command base.',
      });
    }

    res.json({
      success: true,
      data: purchase,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Record a purchase & update inventory quantity in a transaction
// @route   POST /api/purchases
// @access  Private (Admin, Logistics Officer)
export const createPurchase = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { base_id, equipment_type_id, quantity, supplier, reference_number, notes, purchase_date } = req.body;

    // Required Field Validation
    if (!base_id || !equipment_type_id || quantity === undefined || quantity === null || !supplier || !reference_number || !purchase_date) {
      return res.status(400).json({
        success: false,
        message: 'Purchase Date, Base, Equipment Type, Quantity, Supplier, and Reference Number are required.',
      });
    }

    const numQuantity = parseInt(quantity, 10);
    if (isNaN(numQuantity) || numQuantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive integer greater than zero.',
      });
    }

    const targetBaseId = parseInt(base_id, 10);
    const targetEqTypeId = parseInt(equipment_type_id, 10);

    // RBAC: Base Commander scope check
    if (req.user.role === 'base_commander' && targetBaseId !== req.user.base_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Cannot record purchases for another command base.',
      });
    }

    await client.query('BEGIN');

    // 1. Insert Purchase Record
    const purchaseSql = `
      INSERT INTO purchases (base_id, equipment_type_id, quantity, purchase_date, supplier, reference_number, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;

    const purchaseResult = await client.query(purchaseSql, [
      targetBaseId,
      targetEqTypeId,
      numQuantity,
      purchase_date,
      supplier.trim(),
      reference_number.trim(),
      notes ? notes.trim() : null,
      req.user.id,
    ]);

    const newPurchase = purchaseResult.rows[0];

    // 2. Increment stock in `assets` table for `base_id` and `equipment_type_id`
    const assetCheckSql = `
      SELECT id, quantity FROM assets 
      WHERE base_id = $1 AND equipment_type_id = $2 AND status = 'AVAILABLE'
      FOR UPDATE;
    `;
    const assetResult = await client.query(assetCheckSql, [targetBaseId, targetEqTypeId]);

    if (assetResult.rows.length > 0) {
      const existingAsset = assetResult.rows[0];
      await client.query(
        'UPDATE assets SET quantity = quantity + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [numQuantity, existingAsset.id]
      );
    } else {
      await client.query(
        `INSERT INTO assets (equipment_type_id, base_id, quantity, status, created_at, updated_at)
         VALUES ($1, $2, $3, 'AVAILABLE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [targetEqTypeId, targetBaseId, numQuantity]
      );
    }

    // 3. Log Audit Record
    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entityType: 'PURCHASE',
      entityId: newPurchase.id,
      details: {
        reference_number: newPurchase.reference_number,
        supplier: newPurchase.supplier,
        quantity: numQuantity,
        base_id: targetBaseId,
        equipment_type_id: targetEqTypeId,
        purchase_date: newPurchase.purchase_date,
      },
      ipAddress: req.ip,
      client,
    });

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: newPurchase,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Reference number already exists in purchase records.',
      });
    }
    next(err);
  } finally {
    client.release();
  }
};
