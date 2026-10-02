import { query } from '../config/db.js';

// Helper function to build RBAC base filter and validate permissions
const resolveBaseId = (req, targetBaseId) => {
  if (req.user.role === 'base_commander') {
    if (!req.user.base_id) {
      throw { status: 403, message: 'Access denied: Commander is not assigned to a base.' };
    }
    if (targetBaseId && parseInt(targetBaseId, 10) !== req.user.base_id) {
      throw { status: 403, message: 'Access denied: You can only access data for your assigned command base.' };
    }
    return req.user.base_id;
  }
  return targetBaseId ? parseInt(targetBaseId, 10) : null;
};

// @desc    Get Dashboard Summary Metrics
// @route   GET /api/dashboard/summary
// @access  Private
export const getDashboardSummary = async (req, res, next) => {
  try {
    const { date, baseId: queryBaseId, equipmentTypeId } = req.query;

    const effectiveBaseId = resolveBaseId(req, queryBaseId);
    const eqTypeId = equipmentTypeId ? parseInt(equipmentTypeId, 10) : null;

    // 1. Calculate Purchases
    let purchasesSql = `
      SELECT COALESCE(SUM(quantity), 0)::INTEGER AS total 
      FROM purchases 
      WHERE 1=1
    `;
    const purchasesParams = [];
    if (effectiveBaseId) {
      purchasesParams.push(effectiveBaseId);
      purchasesSql += ` AND base_id = $${purchasesParams.length}`;
    }
    if (eqTypeId) {
      purchasesParams.push(eqTypeId);
      purchasesSql += ` AND equipment_type_id = $${purchasesParams.length}`;
    }
    if (date) {
      purchasesParams.push(date);
      purchasesSql += ` AND purchase_date <= $${purchasesParams.length}`;
    }
    const purchasesRes = await query(purchasesSql, purchasesParams);
    const purchases = purchasesRes.rows[0].total;

    // 2. Calculate Transfer In
    let transferInSql = `
      SELECT COALESCE(SUM(quantity), 0)::INTEGER AS total 
      FROM transfers 
      WHERE status IN ('COMPLETED', 'IN_TRANSIT')
    `;
    const transferInParams = [];
    if (effectiveBaseId) {
      transferInParams.push(effectiveBaseId);
      transferInSql += ` AND to_base_id = $${transferInParams.length}`;
    }
    if (eqTypeId) {
      transferInParams.push(eqTypeId);
      transferInSql += ` AND equipment_type_id = $${transferInParams.length}`;
    }
    if (date) {
      transferInParams.push(date);
      transferInSql += ` AND transfer_date <= $${transferInParams.length}`;
    }
    const transferInRes = await query(transferInSql, transferInParams);
    const transferIn = transferInRes.rows[0].total;

    // 3. Calculate Transfer Out
    let transferOutSql = `
      SELECT COALESCE(SUM(quantity), 0)::INTEGER AS total 
      FROM transfers 
      WHERE status IN ('COMPLETED', 'IN_TRANSIT')
    `;
    const transferOutParams = [];
    if (effectiveBaseId) {
      transferOutParams.push(effectiveBaseId);
      transferOutSql += ` AND from_base_id = $${transferOutParams.length}`;
    }
    if (eqTypeId) {
      transferOutParams.push(eqTypeId);
      transferOutSql += ` AND equipment_type_id = $${transferOutParams.length}`;
    }
    if (date) {
      transferOutParams.push(date);
      transferOutSql += ` AND transfer_date <= $${transferOutParams.length}`;
    }
    const transferOutRes = await query(transferOutSql, transferOutParams);
    const transferOut = transferOutRes.rows[0].total;

    // 4. Calculate Assigned Assets
    let assignedSql = `
      SELECT COALESCE(SUM(quantity), 0)::INTEGER AS total 
      FROM assignments 
      WHERE status = 'ACTIVE'
    `;
    const assignedParams = [];
    if (effectiveBaseId) {
      assignedParams.push(effectiveBaseId);
      assignedSql += ` AND base_id = $${assignedParams.length}`;
    }
    if (eqTypeId) {
      assignedParams.push(eqTypeId);
      assignedSql += ` AND asset_id IN (SELECT id FROM assets WHERE equipment_type_id = $${assignedParams.length})`;
    }
    if (date) {
      assignedParams.push(date);
      assignedSql += ` AND assignment_date <= $${assignedParams.length}`;
    }
    const assignedRes = await query(assignedSql, assignedParams);
    const assigned = assignedRes.rows[0].total;

    // 5. Calculate Expended Assets
    let expendedSql = `
      SELECT COALESCE(SUM(quantity), 0)::INTEGER AS total 
      FROM expenditures 
      WHERE 1=1
    `;
    const expendedParams = [];
    if (effectiveBaseId) {
      expendedParams.push(effectiveBaseId);
      expendedSql += ` AND base_id = $${expendedParams.length}`;
    }
    if (eqTypeId) {
      expendedParams.push(eqTypeId);
      expendedSql += ` AND asset_id IN (SELECT id FROM assets WHERE equipment_type_id = $${expendedParams.length})`;
    }
    if (date) {
      expendedParams.push(date);
      expendedSql += ` AND expenditure_date <= $${expendedParams.length}`;
    }
    const expendedRes = await query(expendedSql, expendedParams);
    const expended = expendedRes.rows[0].total;

    // 6. Calculate Assets Current Stock Balance
    let assetsSql = `
      SELECT COALESCE(SUM(quantity), 0)::INTEGER AS total 
      FROM assets 
      WHERE 1=1
    `;
    const assetsParams = [];
    if (effectiveBaseId) {
      assetsParams.push(effectiveBaseId);
      assetsSql += ` AND base_id = $${assetsParams.length}`;
    }
    if (eqTypeId) {
      assetsParams.push(eqTypeId);
      assetsSql += ` AND equipment_type_id = $${assetsParams.length}`;
    }
    const assetsRes = await query(assetsSql, assetsParams);
    const currentAvailableStock = assetsRes.rows[0].total;

    // Calculations:
    // Net Movement = Purchases + Transfer In - Transfer Out
    const netMovement = purchases + transferIn - transferOut;

    // Closing Balance = Current available assets stock
    const closingBalance = currentAvailableStock;

    // Closing Balance = Opening Balance + Net Movement - Assigned - Expended
    // Opening Balance = Closing Balance - Net Movement + Assigned + Expended
    const rawOpeningBalance = closingBalance - netMovement + assigned + expended;
    const openingBalance = Math.max(0, rawOpeningBalance);

    res.json({
      success: true,
      data: {
        openingBalance,
        purchases,
        transferIn,
        transferOut,
        netMovement,
        assigned,
        expended,
        closingBalance,
      },
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    next(err);
  }
};

// @desc    Get Dashboard Movement Chart Data
// @route   GET /api/dashboard/movement
// @access  Private
export const getDashboardMovement = async (req, res, next) => {
  try {
    const { date, baseId: queryBaseId, equipmentTypeId } = req.query;
    const effectiveBaseId = resolveBaseId(req, queryBaseId);
    const eqTypeId = equipmentTypeId ? parseInt(equipmentTypeId, 10) : null;

    // Purchases
    let purchasesSql = `SELECT COALESCE(SUM(quantity), 0)::INTEGER AS total FROM purchases WHERE 1=1`;
    const pParams = [];
    if (effectiveBaseId) { pParams.push(effectiveBaseId); purchasesSql += ` AND base_id = $${pParams.length}`; }
    if (eqTypeId) { pParams.push(eqTypeId); purchasesSql += ` AND equipment_type_id = $${pParams.length}`; }
    if (date) { pParams.push(date); purchasesSql += ` AND purchase_date <= $${pParams.length}`; }
    const pRes = await query(purchasesSql, pParams);

    // Transfer In
    let tInSql = `SELECT COALESCE(SUM(quantity), 0)::INTEGER AS total FROM transfers WHERE status IN ('COMPLETED', 'IN_TRANSIT')`;
    const tInParams = [];
    if (effectiveBaseId) { tInParams.push(effectiveBaseId); tInSql += ` AND to_base_id = $${tInParams.length}`; }
    if (eqTypeId) { tInParams.push(eqTypeId); tInSql += ` AND equipment_type_id = $${tInParams.length}`; }
    if (date) { tInParams.push(date); tInSql += ` AND transfer_date <= $${tInParams.length}`; }
    const tInRes = await query(tInSql, tInParams);

    // Transfer Out
    let tOutSql = `SELECT COALESCE(SUM(quantity), 0)::INTEGER AS total FROM transfers WHERE status IN ('COMPLETED', 'IN_TRANSIT')`;
    const tOutParams = [];
    if (effectiveBaseId) { tOutParams.push(effectiveBaseId); tOutSql += ` AND from_base_id = $${tOutParams.length}`; }
    if (eqTypeId) { tOutParams.push(eqTypeId); tOutSql += ` AND equipment_type_id = $${tOutParams.length}`; }
    if (date) { tOutParams.push(date); tOutSql += ` AND transfer_date <= $${tOutParams.length}`; }
    const tOutRes = await query(tOutSql, tOutParams);

    // Assigned
    let assSql = `SELECT COALESCE(SUM(quantity), 0)::INTEGER AS total FROM assignments WHERE status = 'ACTIVE'`;
    const assParams = [];
    if (effectiveBaseId) { assParams.push(effectiveBaseId); assSql += ` AND base_id = $${assParams.length}`; }
    if (eqTypeId) { assParams.push(eqTypeId); assSql += ` AND asset_id IN (SELECT id FROM assets WHERE equipment_type_id = $${assParams.length})`; }
    if (date) { assParams.push(date); assSql += ` AND assignment_date <= $${assParams.length}`; }
    const assRes = await query(assSql, assParams);

    // Expended
    let expSql = `SELECT COALESCE(SUM(quantity), 0)::INTEGER AS total FROM expenditures WHERE 1=1`;
    const expParams = [];
    if (effectiveBaseId) { expParams.push(effectiveBaseId); expSql += ` AND base_id = $${expParams.length}`; }
    if (eqTypeId) { expParams.push(eqTypeId); expSql += ` AND asset_id IN (SELECT id FROM assets WHERE equipment_type_id = $${expParams.length})`; }
    if (date) { expParams.push(date); expSql += ` AND expenditure_date <= $${expParams.length}`; }
    const expRes = await query(expSql, expParams);

    const movementData = [
      { category: 'Purchases', value: pRes.rows[0].total },
      { category: 'Transfer In', value: tInRes.rows[0].total },
      { category: 'Transfer Out', value: tOutRes.rows[0].total },
      { category: 'Assigned', value: assRes.rows[0].total },
      { category: 'Expended', value: expRes.rows[0].total },
    ];

    res.json({
      success: true,
      data: movementData,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    next(err);
  }
};

// @desc    Get Net Movement Itemized Details
// @route   GET /api/dashboard/movement-details
// @access  Private
export const getDashboardMovementDetails = async (req, res, next) => {
  try {
    const { date, baseId: queryBaseId, equipmentTypeId } = req.query;
    const effectiveBaseId = resolveBaseId(req, queryBaseId);
    const eqTypeId = equipmentTypeId ? parseInt(equipmentTypeId, 10) : null;

    // 1. Fetch Purchases
    let purchasesSql = `
      SELECT p.id, p.purchase_date AS date, p.quantity, p.reference_number, p.supplier,
             b.name AS base_name, et.name AS equipment_name, et.category
      FROM purchases p
      JOIN bases b ON p.base_id = b.id
      JOIN equipment_types et ON p.equipment_type_id = et.id
      WHERE 1=1
    `;
    const pParams = [];
    if (effectiveBaseId) { pParams.push(effectiveBaseId); purchasesSql += ` AND p.base_id = $${pParams.length}`; }
    if (eqTypeId) { pParams.push(eqTypeId); purchasesSql += ` AND p.equipment_type_id = $${pParams.length}`; }
    if (date) { pParams.push(date); purchasesSql += ` AND p.purchase_date <= $${pParams.length}`; }
    purchasesSql += ' ORDER BY p.purchase_date DESC LIMIT 100';

    // 2. Fetch Transfers In
    let transferInSql = `
      SELECT t.id, t.transfer_date AS date, t.quantity, t.reference_number, t.status,
             fb.name AS from_base_name, tb.name AS base_name, et.name AS equipment_name, et.category
      FROM transfers t
      JOIN bases fb ON t.from_base_id = fb.id
      JOIN bases tb ON t.to_base_id = tb.id
      JOIN equipment_types et ON t.equipment_type_id = et.id
      WHERE t.status IN ('COMPLETED', 'IN_TRANSIT')
    `;
    const tInParams = [];
    if (effectiveBaseId) { tInParams.push(effectiveBaseId); transferInSql += ` AND t.to_base_id = $${tInParams.length}`; }
    if (eqTypeId) { tInParams.push(eqTypeId); transferInSql += ` AND t.equipment_type_id = $${tInParams.length}`; }
    if (date) { tInParams.push(date); transferInSql += ` AND t.transfer_date <= $${tInParams.length}`; }
    transferInSql += ' ORDER BY t.transfer_date DESC LIMIT 100';

    // 3. Fetch Transfers Out
    let transferOutSql = `
      SELECT t.id, t.transfer_date AS date, t.quantity, t.reference_number, t.status,
             fb.name AS base_name, tb.name AS to_base_name, et.name AS equipment_name, et.category
      FROM transfers t
      JOIN bases fb ON t.from_base_id = fb.id
      JOIN bases tb ON t.to_base_id = tb.id
      JOIN equipment_types et ON t.equipment_type_id = et.id
      WHERE t.status IN ('COMPLETED', 'IN_TRANSIT')
    `;
    const tOutParams = [];
    if (effectiveBaseId) { tOutParams.push(effectiveBaseId); transferOutSql += ` AND t.from_base_id = $${tOutParams.length}`; }
    if (eqTypeId) { tOutParams.push(eqTypeId); transferOutSql += ` AND t.equipment_type_id = $${tOutParams.length}`; }
    if (date) { tOutParams.push(date); transferOutSql += ` AND t.transfer_date <= $${tOutParams.length}`; }
    transferOutSql += ' ORDER BY t.transfer_date DESC LIMIT 100';

    const [purchasesRes, tInRes, tOutRes] = await Promise.all([
      query(purchasesSql, pParams),
      query(transferInSql, tInParams),
      query(transferOutSql, tOutParams),
    ]);

    res.json({
      success: true,
      data: {
        purchases: purchasesRes.rows,
        transferIn: tInRes.rows,
        transferOut: tOutRes.rows,
      },
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    next(err);
  }
};

// @desc    Get Dashboard Filter Options (Bases & Equipment Types)
// @route   GET /api/dashboard/filters
// @access  Private
export const getDashboardFilters = async (req, res, next) => {
  try {
    const basesSql = `SELECT id, name, code, location FROM bases ORDER BY name ASC`;
    const eqTypesSql = `SELECT id, name, category, unit FROM equipment_types ORDER BY name ASC`;

    const [basesRes, eqTypesRes] = await Promise.all([
      query(basesSql),
      query(eqTypesSql),
    ]);

    let userAssignedBase = null;
    if (req.user.role === 'base_commander' && req.user.base_id) {
      const assignedBase = basesRes.rows.find((b) => b.id === req.user.base_id);
      userAssignedBase = assignedBase || null;
    }

    res.json({
      success: true,
      bases: basesRes.rows,
      equipmentTypes: eqTypesRes.rows,
      userAssignedBase,
    });
  } catch (err) {
    next(err);
  }
};
