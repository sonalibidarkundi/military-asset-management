import { query, pool } from '../config/db.js';
import logAudit from '../utils/auditLogger.js';

// @desc    Get personnel assignments list with search and filters
// @route   GET /api/assignments
// @access  Private
export const getAssignments = async (req, res, next) => {
  try {
    let sql = `
      SELECT 
        asn.id,
        asn.personnel_name,
        asn.quantity,
        asn.assignment_date,
        asn.purpose,
        asn.status,
        asn.created_at,
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
      FROM assignments asn
      JOIN bases b ON asn.base_id = b.id
      JOIN assets a ON asn.asset_id = a.id
      JOIN equipment_types et ON a.equipment_type_id = et.id
      LEFT JOIN users u ON asn.created_by = u.id
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
      whereClauses.push(`asn.base_id = $${params.length}`);
    } else if (req.query.base_id) {
      params.push(parseInt(req.query.base_id, 10));
      whereClauses.push(`asn.base_id = $${params.length}`);
    }

    if (req.query.equipment_type_id) {
      params.push(parseInt(req.query.equipment_type_id, 10));
      whereClauses.push(`et.id = $${params.length}`);
    }

    if (req.query.status) {
      params.push(req.query.status.toUpperCase());
      whereClauses.push(`asn.status = $${params.length}`);
    }

    if (req.query.date_from) {
      params.push(req.query.date_from);
      whereClauses.push(`asn.assignment_date >= $${params.length}`);
    }

    if (req.query.date_to) {
      params.push(req.query.date_to);
      whereClauses.push(`asn.assignment_date <= $${params.length}`);
    }

    if (req.query.date && !req.query.date_from && !req.query.date_to) {
      params.push(req.query.date);
      whereClauses.push(`asn.assignment_date = $${params.length}`);
    }

    if (req.query.search) {
      const searchTerm = `%${req.query.search.trim()}%`;
      params.push(searchTerm);
      const idx = params.length;
      whereClauses.push(
        `(asn.personnel_name ILIKE $${idx} OR CAST(a.id AS TEXT) ILIKE $${idx} OR a.serial_number ILIKE $${idx} OR et.name ILIKE $${idx} OR asn.purpose ILIKE $${idx})`
      );
    }

    if (whereClauses.length > 0) {
      sql += ' WHERE ' + whereClauses.join(' AND ');
    }

    sql += ' ORDER BY asn.assignment_date DESC, asn.id DESC';

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

// @desc    Get single assignment details
// @route   GET /api/assignments/:id
// @access  Private
export const getAssignmentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT 
        asn.id,
        asn.personnel_name,
        asn.quantity,
        asn.assignment_date,
        asn.purpose,
        asn.status,
        asn.created_at,
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
      FROM assignments asn
      JOIN bases b ON asn.base_id = b.id
      JOIN assets a ON asn.asset_id = a.id
      JOIN equipment_types et ON a.equipment_type_id = et.id
      LEFT JOIN users u ON asn.created_by = u.id
      WHERE asn.id = $1
    `;

    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assignment record not found.',
      });
    }

    const assignment = result.rows[0];

    // RBAC: Base Commander scope check
    if (req.user.role === 'base_commander' && assignment.base_id !== req.user.base_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to view assignments belonging to another base.',
      });
    }

    res.json({
      success: true,
      data: assignment,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Assign asset to personnel (Transaction protected)
// @route   POST /api/assignments
// @access  Private (Admin, Logistics Officer, Base Commander)
export const createAssignment = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { asset_id, personnel_name, base_id, quantity, purpose, assignment_date, status } = req.body;

    if (!asset_id || !personnel_name || !quantity || !purpose) {
      return res.status(400).json({
        success: false,
        message: 'Asset, personnel name, quantity, and purpose are required.',
      });
    }

    if (!personnel_name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Personnel Name cannot be empty.',
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

    // 1. Lock and fetch asset details to verify base & stock
    const assetCheckSql = `
      SELECT a.id, a.quantity, a.status, a.base_id, et.name AS equipment_name
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
        message: 'You are not authorized to create this assignment.',
      });
    }

    // 2. Inventory Availability Check
    if (asset.quantity < numQty) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Insufficient available quantity for this asset.',
      });
    }

    const initialStatus = status ? status.toUpperCase() : 'ACTIVE';

    // 3. Deduct stock from assets if active assignment
    if (initialStatus === 'ACTIVE') {
      await client.query(
        'UPDATE assets SET quantity = quantity - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [numQty, asset.id]
      );
    }

    // 4. Create Assignment
    const assignSql = `
      INSERT INTO assignments (asset_id, personnel_name, base_id, quantity, assignment_date, purpose, status, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;

    const assignResult = await client.query(assignSql, [
      asset.id,
      personnel_name.trim(),
      targetBaseId,
      numQty,
      assignment_date || new Date().toISOString().split('T')[0],
      purpose.trim(),
      initialStatus,
      req.user.id,
    ]);

    const newAssignment = assignResult.rows[0];

    // 5. Log Audit
    await logAudit({
      userId: req.user.id,
      action: 'CREATE_ASSIGNMENT',
      entityType: 'ASSIGNMENT',
      entityId: newAssignment.id,
      details: {
        asset_id: asset.id,
        personnel_name: personnel_name.trim(),
        quantity: numQty,
        base_id: targetBaseId,
        purpose: purpose.trim(),
        status: initialStatus,
      },
      ipAddress: req.ip,
      client,
    });

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: newAssignment,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// @desc    Return / Close active assignment (Restores stock)
// @route   PUT /api/assignments/:id/return
// @access  Private (Admin, Logistics Officer, Base Commander)
export const returnAssignment = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // 1. Lock and fetch assignment record
    const fetchSql = `
      SELECT asn.*, a.base_id AS asset_base_id
      FROM assignments asn
      JOIN assets a ON asn.asset_id = a.id
      WHERE asn.id = $1
      FOR UPDATE;
    `;
    const fetchRes = await client.query(fetchSql, [id]);

    if (fetchRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Assignment record not found.',
      });
    }

    const assignment = fetchRes.rows[0];

    // RBAC: Base Commander scope check
    if (req.user.role === 'base_commander' && assignment.base_id !== req.user.base_id) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to modify assignments belonging to another base.',
      });
    }

    if (assignment.status !== 'ACTIVE') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Assignment cannot be returned because its current status is '${assignment.status}'.`,
      });
    }

    // 2. Update assignment status to RETURNED
    const updateAssignSql = `
      UPDATE assignments
      SET status = 'RETURNED'
      WHERE id = $1
      RETURNING *;
    `;
    const updateAssignRes = await client.query(updateAssignSql, [id]);
    const updatedAssignment = updateAssignRes.rows[0];

    // 3. Restore asset stock quantity
    await client.query(
      'UPDATE assets SET quantity = quantity + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [assignment.quantity, assignment.asset_id]
    );

    // 4. Log Audit
    await logAudit({
      userId: req.user.id,
      action: 'RETURN_ASSIGNMENT',
      entityType: 'ASSIGNMENT',
      entityId: updatedAssignment.id,
      details: {
        asset_id: assignment.asset_id,
        personnel_name: assignment.personnel_name,
        restored_quantity: assignment.quantity,
        base_id: assignment.base_id,
      },
      ipAddress: req.ip,
      client,
    });

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Assignment returned successfully. Asset stock restored.',
      data: updatedAssignment,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};
