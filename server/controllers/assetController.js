import { query, pool } from '../config/db.js';
import logAudit from '../utils/auditLogger.js';

// @desc    Get all assets (Filtered by Base Commander scope & query parameters)
// @route   GET /api/assets
// @access  Private
export const getAssets = async (req, res, next) => {
  try {
    let sql = `
      SELECT 
        a.id,
        a.serial_number,
        a.quantity,
        a.status,
        a.created_at,
        a.updated_at,
        et.id AS equipment_type_id,
        et.name AS equipment_name,
        et.category,
        et.unit,
        b.id AS base_id,
        b.name AS base_name,
        b.code AS base_code
      FROM assets a
      JOIN equipment_types et ON a.equipment_type_id = et.id
      JOIN bases b ON a.base_id = b.id
    `;

    const whereClauses = [];
    const params = [];

    // RBAC Scope Check: Base Commander can only access assets of their assigned base
    if (req.user.role === 'base_commander') {
      if (!req.user.base_id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Commander is not assigned to a command base.',
        });
      }
      params.push(req.user.base_id);
      whereClauses.push(`a.base_id = $${params.length}`);
    } else if (req.query.base_id) {
      params.push(parseInt(req.query.base_id, 10));
      whereClauses.push(`a.base_id = $${params.length}`);
    }

    if (req.query.equipment_type_id) {
      params.push(parseInt(req.query.equipment_type_id, 10));
      whereClauses.push(`a.equipment_type_id = $${params.length}`);
    }

    if (req.query.status) {
      params.push(req.query.status);
      whereClauses.push(`a.status = $${params.length}`);
    }

    if (req.query.category) {
      params.push(req.query.category);
      whereClauses.push(`et.category = $${params.length}`);
    }

    if (req.query.search) {
      const searchTerm = `%${req.query.search.trim()}%`;
      params.push(searchTerm);
      const searchIndex = params.length;
      whereClauses.push(
        `(CAST(a.id AS TEXT) ILIKE $${searchIndex} OR a.serial_number ILIKE $${searchIndex} OR et.name ILIKE $${searchIndex} OR b.name ILIKE $${searchIndex})`
      );
    }

    if (whereClauses.length > 0) {
      sql += ' WHERE ' + whereClauses.join(' AND ');
    }

    sql += ' ORDER BY a.id DESC';

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

// @desc    Get asset by ID along with related history (Assignments, Expenditures, Transfers)
// @route   GET /api/assets/:id
// @access  Private
export const getAssetById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT 
        a.id,
        a.serial_number,
        a.quantity,
        a.status,
        a.created_at,
        a.updated_at,
        et.id AS equipment_type_id,
        et.name AS equipment_name,
        et.category,
        et.unit,
        b.id AS base_id,
        b.name AS base_name,
        b.code AS base_code
      FROM assets a
      JOIN equipment_types et ON a.equipment_type_id = et.id
      JOIN bases b ON a.base_id = b.id
      WHERE a.id = $1
    `;

    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found.',
      });
    }

    const asset = result.rows[0];

    // RBAC: Base Commander isolation check
    if (req.user.role === 'base_commander' && asset.base_id !== req.user.base_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to view assets belonging to another base.',
      });
    }

    // Fetch related assignments for this asset
    const assignmentsSql = `
      SELECT id, personnel_name, quantity, assignment_date, purpose, status, created_at
      FROM assignments
      WHERE asset_id = $1
      ORDER BY assignment_date DESC
    `;
    const assignmentsRes = await query(assignmentsSql, [id]);

    // Fetch related expenditures for this asset
    const expendituresSql = `
      SELECT id, quantity, expenditure_date, reason, created_at
      FROM expenditures
      WHERE asset_id = $1
      ORDER BY expenditure_date DESC
    `;
    const expendituresRes = await query(expendituresSql, [id]);

    // Fetch related transfers for this equipment type & base
    const transfersSql = `
      SELECT t.id, t.quantity, t.transfer_date, t.status, t.reference_number,
             fb.name AS from_base_name, tb.name AS to_base_name
      FROM transfers t
      JOIN bases fb ON t.from_base_id = fb.id
      JOIN bases tb ON t.to_base_id = tb.id
      WHERE t.equipment_type_id = $1 AND (t.from_base_id = $2 OR t.to_base_id = $2)
      ORDER BY t.transfer_date DESC
    `;
    const transfersRes = await query(transfersSql, [asset.equipment_type_id, asset.base_id]);

    res.json({
      success: true,
      data: {
        ...asset,
        assignments: assignmentsRes.rows,
        expenditures: expendituresRes.rows,
        transfers: transfersRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new asset record
// @route   POST /api/assets
// @access  Private (Admin, Logistics Officer, Base Commander)
export const createAsset = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { equipment_type_id, base_id, serial_number, quantity, status } = req.body;

    if (!equipment_type_id || !base_id || quantity === undefined || quantity === null) {
      return res.status(400).json({
        success: false,
        message: 'Equipment type, base, and quantity are required.',
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

    // RBAC: Base Commander scope check
    if (req.user.role === 'base_commander' && targetBaseId !== req.user.base_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Cannot create asset for a base other than your assigned command.',
      });
    }

    const validStatuses = ['AVAILABLE', 'ASSIGNED', 'EXPENDED', 'IN_TRANSIT'];
    const assetStatus = status ? status.toUpperCase() : 'AVAILABLE';
    if (!validStatuses.includes(assetStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid asset status. Valid options are: ${validStatuses.join(', ')}`,
      });
    }

    await client.query('BEGIN');

    const insertSql = `
      INSERT INTO assets (equipment_type_id, base_id, serial_number, quantity, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *;
    `;

    const result = await client.query(insertSql, [
      equipment_type_id,
      targetBaseId,
      serial_number ? serial_number.trim() : null,
      numQuantity,
      assetStatus,
    ]);

    const newAsset = result.rows[0];

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entityType: 'ASSET',
      entityId: newAsset.id,
      details: { equipment_type_id, base_id: targetBaseId, serial_number, quantity: numQuantity, status: assetStatus },
      ipAddress: req.ip,
      client,
    });

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: newAsset,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// @desc    Update existing asset record
// @route   PUT /api/assets/:id
// @access  Private (Admin, Logistics Officer, Base Commander)
export const updateAsset = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { equipment_type_id, base_id, serial_number, quantity, status } = req.body;

    await client.query('BEGIN');

    // 1. Fetch asset to check existence & authorization
    const checkSql = 'SELECT * FROM assets WHERE id = $1 FOR UPDATE';
    const checkRes = await client.query(checkSql, [id]);

    if (checkRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Asset not found.',
      });
    }

    const currentAsset = checkRes.rows[0];

    // RBAC Check for Base Commander
    if (req.user.role === 'base_commander' && currentAsset.base_id !== req.user.base_id) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to edit assets from another base.',
      });
    }

    // Target base check
    const newBaseId = base_id ? parseInt(base_id, 10) : currentAsset.base_id;
    if (req.user.role === 'base_commander' && newBaseId !== req.user.base_id) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Access denied: Cannot transfer asset ownership to another base via edit.',
      });
    }

    let numQuantity = currentAsset.quantity;
    if (quantity !== undefined && quantity !== null) {
      numQuantity = parseInt(quantity, 10);
      if (isNaN(numQuantity) || numQuantity < 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Quantity must be zero or a positive integer.',
        });
      }
    }

    const validStatuses = ['AVAILABLE', 'ASSIGNED', 'EXPENDED', 'IN_TRANSIT'];
    const newStatus = status ? status.toUpperCase() : currentAsset.status;
    if (!validStatuses.includes(newStatus)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Invalid asset status. Valid options are: ${validStatuses.join(', ')}`,
      });
    }

    const newEqTypeId = equipment_type_id ? parseInt(equipment_type_id, 10) : currentAsset.equipment_type_id;
    const newSerialNumber = serial_number !== undefined ? (serial_number ? serial_number.trim() : null) : currentAsset.serial_number;

    // 2. Perform Update
    const updateSql = `
      UPDATE assets
      SET equipment_type_id = $1,
          base_id = $2,
          serial_number = $3,
          quantity = $4,
          status = $5,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *;
    `;

    const updateRes = await client.query(updateSql, [
      newEqTypeId,
      newBaseId,
      newSerialNumber,
      numQuantity,
      newStatus,
      id,
    ]);

    const updatedAsset = updateRes.rows[0];

    // 3. Log Audit
    await logAudit({
      userId: req.user.id,
      action: 'UPDATE',
      entityType: 'ASSET',
      entityId: updatedAsset.id,
      details: {
        previous: {
          equipment_type_id: currentAsset.equipment_type_id,
          base_id: currentAsset.base_id,
          quantity: currentAsset.quantity,
          status: currentAsset.status,
        },
        updated: {
          equipment_type_id: newEqTypeId,
          base_id: newBaseId,
          quantity: numQuantity,
          status: newStatus,
        },
      },
      ipAddress: req.ip,
      client,
    });

    await client.query('COMMIT');

    res.json({
      success: true,
      data: updatedAsset,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// @desc    Delete asset record
// @route   DELETE /api/assets/:id
// @access  Private (Admin only)
export const deleteAsset = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Fetch asset to verify existence & audit details
    const checkSql = 'SELECT * FROM assets WHERE id = $1 FOR UPDATE';
    const checkRes = await client.query(checkSql, [id]);

    if (checkRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Asset not found.',
      });
    }

    const assetToDelete = checkRes.rows[0];

    // Delete asset
    await client.query('DELETE FROM assets WHERE id = $1', [id]);

    // Log Audit
    await logAudit({
      userId: req.user.id,
      action: 'DELETE',
      entityType: 'ASSET',
      entityId: parseInt(id, 10),
      details: {
        equipment_type_id: assetToDelete.equipment_type_id,
        base_id: assetToDelete.base_id,
        serial_number: assetToDelete.serial_number,
        quantity: assetToDelete.quantity,
      },
      ipAddress: req.ip,
      client,
    });

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Asset record deleted successfully.',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};
