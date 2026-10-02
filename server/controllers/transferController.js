import { query, pool } from '../config/db.js';
import logAudit from '../utils/auditLogger.js';

// @desc    Get transfers list with search and multi-field filters
// @route   GET /api/transfers
// @access  Private
export const getTransfers = async (req, res, next) => {
  try {
    let sql = `
      SELECT 
        t.id,
        t.quantity,
        t.transfer_date,
        t.status,
        t.reference_number,
        t.notes,
        t.created_at,
        fb.id AS from_base_id,
        fb.name AS from_base_name,
        fb.code AS from_base_code,
        tb.id AS to_base_id,
        tb.name AS to_base_name,
        tb.code AS to_base_code,
        et.id AS equipment_type_id,
        et.name AS equipment_name,
        et.category,
        et.unit,
        u.name AS created_by_name
      FROM transfers t
      JOIN bases fb ON t.from_base_id = fb.id
      JOIN bases tb ON t.to_base_id = tb.id
      JOIN equipment_types et ON t.equipment_type_id = et.id
      LEFT JOIN users u ON t.created_by = u.id
    `;

    const whereClauses = [];
    const params = [];

    // RBAC Scope Check for Base Commander: must involve their base
    if (req.user.role === 'base_commander') {
      if (!req.user.base_id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Commander is not assigned to a command base.',
        });
      }
      params.push(req.user.base_id);
      whereClauses.push(`(t.from_base_id = $${params.length} OR t.to_base_id = $${params.length})`);
    } else {
      if (req.query.from_base_id) {
        params.push(parseInt(req.query.from_base_id, 10));
        whereClauses.push(`t.from_base_id = $${params.length}`);
      }
      if (req.query.to_base_id) {
        params.push(parseInt(req.query.to_base_id, 10));
        whereClauses.push(`t.to_base_id = $${params.length}`);
      }
    }

    if (req.query.equipment_type_id) {
      params.push(parseInt(req.query.equipment_type_id, 10));
      whereClauses.push(`t.equipment_type_id = $${params.length}`);
    }

    if (req.query.status) {
      params.push(req.query.status.toUpperCase());
      whereClauses.push(`t.status = $${params.length}`);
    }

    if (req.query.date_from) {
      params.push(req.query.date_from);
      whereClauses.push(`t.transfer_date >= $${params.length}`);
    }

    if (req.query.date_to) {
      params.push(req.query.date_to);
      whereClauses.push(`t.transfer_date <= $${params.length}`);
    }

    if (req.query.date && !req.query.date_from && !req.query.date_to) {
      params.push(req.query.date);
      whereClauses.push(`t.transfer_date = $${params.length}`);
    }

    if (req.query.search) {
      const searchTerm = `%${req.query.search.trim()}%`;
      params.push(searchTerm);
      const sIndex = params.length;
      whereClauses.push(
        `(t.reference_number ILIKE $${sIndex} OR et.name ILIKE $${sIndex} OR fb.name ILIKE $${sIndex} OR tb.name ILIKE $${sIndex})`
      );
    }

    if (whereClauses.length > 0) {
      sql += ' WHERE ' + whereClauses.join(' AND ');
    }

    sql += ' ORDER BY t.transfer_date DESC, t.id DESC';

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

// @desc    Get transfer detail by ID
// @route   GET /api/transfers/:id
// @access  Private
export const getTransferById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT 
        t.id,
        t.quantity,
        t.transfer_date,
        t.status,
        t.reference_number,
        t.notes,
        t.created_at,
        fb.id AS from_base_id,
        fb.name AS from_base_name,
        fb.code AS from_base_code,
        tb.id AS to_base_id,
        tb.name AS to_base_name,
        tb.code AS to_base_code,
        et.id AS equipment_type_id,
        et.name AS equipment_name,
        et.category,
        et.unit,
        u.name AS created_by_name
      FROM transfers t
      JOIN bases fb ON t.from_base_id = fb.id
      JOIN bases tb ON t.to_base_id = tb.id
      JOIN equipment_types et ON t.equipment_type_id = et.id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.id = $1
    `;

    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transfer record not found.',
      });
    }

    const transfer = result.rows[0];

    // RBAC: Base Commander isolation check (must involve their base)
    if (
      req.user.role === 'base_commander' &&
      transfer.from_base_id !== req.user.base_id &&
      transfer.to_base_id !== req.user.base_id
    ) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this transfer.',
      });
    }

    res.json({
      success: true,
      data: transfer,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Record equipment transfer & update inventory in a transaction
// @route   POST /api/transfers
// @access  Private (Admin, Logistics Officer, Base Commander)
export const createTransfer = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { from_base_id, to_base_id, equipment_type_id, quantity, reference_number, notes, transfer_date, status } = req.body;

    // Required Field Validation
    if (!from_base_id || !to_base_id || !equipment_type_id || quantity === undefined || quantity === null || !reference_number || !transfer_date) {
      return res.status(400).json({
        success: false,
        message: 'Transfer Date, From Base, To Base, Equipment Type, Quantity, and Reference Number are required.',
      });
    }

    const fromId = parseInt(from_base_id, 10);
    const toId = parseInt(to_base_id, 10);
    const eqTypeId = parseInt(equipment_type_id, 10);
    const numQuantity = parseInt(quantity, 10);

    if (fromId === toId) {
      return res.status(400).json({
        success: false,
        message: 'From Base cannot equal To Base.',
      });
    }

    if (isNaN(numQuantity) || numQuantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive integer greater than zero.',
      });
    }

    const transferStatus = status ? status.toUpperCase() : 'COMPLETED';
    const validStatuses = ['PENDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(transferStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid transfer status. Valid options are: ${validStatuses.join(', ')}`,
      });
    }

    // RBAC Scope Check: Base Commander can only initiate transfers originating from their base
    if (req.user.role === 'base_commander' && fromId !== req.user.base_id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to perform this transfer.',
      });
    }

    await client.query('BEGIN');

    // If status affects inventory (COMPLETED or IN_TRANSIT)
    if (transferStatus === 'COMPLETED' || transferStatus === 'IN_TRANSIT') {
      // 1. Lock and check source inventory availability
      const stockSql = `
        SELECT id, quantity FROM assets 
        WHERE base_id = $1 AND equipment_type_id = $2 AND status = 'AVAILABLE'
        FOR UPDATE;
      `;
      const stockResult = await client.query(stockSql, [fromId, eqTypeId]);

      if (stockResult.rows.length === 0 || stockResult.rows[0].quantity < numQuantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Insufficient inventory at the source base.',
        });
      }

      const sourceAsset = stockResult.rows[0];

      // 2. Reduce source inventory
      await client.query(
        'UPDATE assets SET quantity = quantity - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [numQuantity, sourceAsset.id]
      );

      // 3. Update or create destination inventory
      const destStockSql = `
        SELECT id, quantity FROM assets 
        WHERE base_id = $1 AND equipment_type_id = $2 AND status = 'AVAILABLE'
        FOR UPDATE;
      `;
      const destResult = await client.query(destStockSql, [toId, eqTypeId]);

      if (destResult.rows.length > 0) {
        await client.query(
          'UPDATE assets SET quantity = quantity + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [numQuantity, destResult.rows[0].id]
        );
      } else {
        await client.query(
          `INSERT INTO assets (equipment_type_id, base_id, quantity, status, created_at, updated_at)
           VALUES ($1, $2, $3, 'AVAILABLE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [eqTypeId, toId, numQuantity]
        );
      }
    }

    // 4. Create Transfer Record
    const transferSql = `
      INSERT INTO transfers (from_base_id, to_base_id, equipment_type_id, quantity, transfer_date, status, reference_number, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;

    const transferResult = await client.query(transferSql, [
      fromId,
      toId,
      eqTypeId,
      numQuantity,
      transfer_date,
      transferStatus,
      reference_number.trim(),
      notes ? notes.trim() : null,
      req.user.id,
    ]);

    const newTransfer = transferResult.rows[0];

    // 5. Log Audit Record
    await logAudit({
      userId: req.user.id,
      action: 'TRANSFER',
      entityType: 'TRANSFER',
      entityId: newTransfer.id,
      details: {
        from_base_id: fromId,
        to_base_id: toId,
        equipment_type_id: eqTypeId,
        quantity: numQuantity,
        reference_number: newTransfer.reference_number,
        status: transferStatus,
      },
      ipAddress: req.ip,
      client,
    });

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: newTransfer,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Reference number already exists in transfer records.',
      });
    }
    next(err);
  } finally {
    client.release();
  }
};
