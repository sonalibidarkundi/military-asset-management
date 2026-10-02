import { query } from '../config/db.js';

// Helper function to resolve and enforce RBAC base filter
const resolveBaseScope = (req, targetBaseId) => {
  if (req.user.role === 'base_commander') {
    if (!req.user.base_id) {
      throw { status: 403, message: 'Access denied: Commander is not assigned to a command base.' };
    }
    if (targetBaseId && parseInt(targetBaseId, 10) !== req.user.base_id) {
      throw { status: 403, message: 'Access denied: Base Commander cannot access data from another base.' };
    }
    return req.user.base_id;
  }
  return targetBaseId ? parseInt(targetBaseId, 10) : null;
};

// @desc    Get Comprehensive Reports & Analytics Summary
// @route   GET /api/reports/summary
// @access  Private
export const getReportSummary = async (req, res, next) => {
  try {
    const { date_from, date_to, base_id, equipment_type_id } = req.query;

    // Enforce RBAC Base Scope
    const effectiveBaseId = resolveBaseScope(req, base_id);
    const eqTypeId = equipment_type_id ? parseInt(equipment_type_id, 10) : null;
    const dateFrom = date_from || null;
    const dateTo = date_to || null;

    // 1. Fetch available bases (Scoped for Base Commander)
    let basesSql = `SELECT id, name, code, location FROM bases`;
    const basesParams = [];
    if (effectiveBaseId) {
      basesParams.push(effectiveBaseId);
      basesSql += ` WHERE id = $1`;
    }
    basesSql += ` ORDER BY name ASC`;
    const basesRes = await query(basesSql, basesParams);
    const basesList = basesRes.rows;

    // 2. Fetch available equipment types
    let eqSql = `SELECT id, name, category, unit FROM equipment_types`;
    const eqParams = [];
    if (eqTypeId) {
      eqParams.push(eqTypeId);
      eqSql += ` WHERE id = $1`;
    }
    eqSql += ` ORDER BY name ASC`;
    const eqRes = await query(eqSql, eqParams);
    const equipmentTypesList = eqRes.rows;

    // 3. Fetch Current Physical Asset Stock per base & equipment type
    let stockSql = `SELECT base_id, equipment_type_id, COALESCE(SUM(quantity), 0)::INTEGER AS total FROM assets WHERE status = 'AVAILABLE'`;
    const stockParams = [];
    if (effectiveBaseId) {
      stockParams.push(effectiveBaseId);
      stockSql += ` AND base_id = $${stockParams.length}`;
    }
    if (eqTypeId) {
      stockParams.push(eqTypeId);
      stockSql += ` AND equipment_type_id = $${stockParams.length}`;
    }
    stockSql += ` GROUP BY base_id, equipment_type_id`;
    const stockRes = await query(stockSql, stockParams);
    const stockMap = {};
    stockRes.rows.forEach((row) => {
      stockMap[`${row.base_id}_${row.equipment_type_id}`] = parseInt(row.total, 10) || 0;
    });

    // Helper to query aggregations for a specified date filter
    const fetchAggregations = async (isPriorOnly = false) => {
      // --- PURCHASES ---
      let pSql = `SELECT base_id, equipment_type_id, COALESCE(SUM(quantity), 0)::INTEGER AS total FROM purchases WHERE 1=1`;
      const pParams = [];
      if (effectiveBaseId) {
        pParams.push(effectiveBaseId);
        pSql += ` AND base_id = $${pParams.length}`;
      }
      if (eqTypeId) {
        pParams.push(eqTypeId);
        pSql += ` AND equipment_type_id = $${pParams.length}`;
      }
      if (isPriorOnly && dateFrom) {
        pParams.push(dateFrom);
        pSql += ` AND purchase_date < $${pParams.length}`;
      } else {
        if (dateFrom) {
          pParams.push(dateFrom);
          pSql += ` AND purchase_date >= $${pParams.length}`;
        }
        if (dateTo) {
          pParams.push(dateTo);
          pSql += ` AND purchase_date <= $${pParams.length}`;
        }
      }
      pSql += ` GROUP BY base_id, equipment_type_id`;

      // --- TRANSFERS IN ---
      let tinSql = `SELECT to_base_id AS base_id, equipment_type_id, COALESCE(SUM(quantity), 0)::INTEGER AS total FROM transfers WHERE status IN ('COMPLETED', 'IN_TRANSIT')`;
      const tinParams = [];
      if (effectiveBaseId) {
        tinParams.push(effectiveBaseId);
        tinSql += ` AND to_base_id = $${tinParams.length}`;
      }
      if (eqTypeId) {
        tinParams.push(eqTypeId);
        tinSql += ` AND equipment_type_id = $${tinParams.length}`;
      }
      if (isPriorOnly && dateFrom) {
        tinParams.push(dateFrom);
        tinSql += ` AND transfer_date < $${tinParams.length}`;
      } else {
        if (dateFrom) {
          tinParams.push(dateFrom);
          tinSql += ` AND transfer_date >= $${tinParams.length}`;
        }
        if (dateTo) {
          tinParams.push(dateTo);
          tinSql += ` AND transfer_date <= $${tinParams.length}`;
        }
      }
      tinSql += ` GROUP BY to_base_id, equipment_type_id`;

      // --- TRANSFERS OUT ---
      let toutSql = `SELECT from_base_id AS base_id, equipment_type_id, COALESCE(SUM(quantity), 0)::INTEGER AS total FROM transfers WHERE status IN ('COMPLETED', 'IN_TRANSIT')`;
      const toutParams = [];
      if (effectiveBaseId) {
        toutParams.push(effectiveBaseId);
        toutSql += ` AND from_base_id = $${toutParams.length}`;
      }
      if (eqTypeId) {
        toutParams.push(eqTypeId);
        toutSql += ` AND equipment_type_id = $${toutParams.length}`;
      }
      if (isPriorOnly && dateFrom) {
        toutParams.push(dateFrom);
        toutSql += ` AND transfer_date < $${toutParams.length}`;
      } else {
        if (dateFrom) {
          toutParams.push(dateFrom);
          toutSql += ` AND transfer_date >= $${toutParams.length}`;
        }
        if (dateTo) {
          toutParams.push(dateTo);
          toutSql += ` AND transfer_date <= $${toutParams.length}`;
        }
      }
      toutSql += ` GROUP BY from_base_id, equipment_type_id`;

      // --- ASSIGNMENTS ---
      let assSql = `
        SELECT asn.base_id, a.equipment_type_id, COALESCE(SUM(asn.quantity), 0)::INTEGER AS total 
        FROM assignments asn
        JOIN assets a ON asn.asset_id = a.id
        WHERE asn.status = 'ACTIVE'
      `;
      const assParams = [];
      if (effectiveBaseId) {
        assParams.push(effectiveBaseId);
        assSql += ` AND asn.base_id = $${assParams.length}`;
      }
      if (eqTypeId) {
        assParams.push(eqTypeId);
        assSql += ` AND a.equipment_type_id = $${assParams.length}`;
      }
      if (isPriorOnly && dateFrom) {
        assParams.push(dateFrom);
        assSql += ` AND asn.assignment_date < $${assParams.length}`;
      } else {
        if (dateFrom) {
          assParams.push(dateFrom);
          assSql += ` AND asn.assignment_date >= $${assParams.length}`;
        }
        if (dateTo) {
          assParams.push(dateTo);
          assSql += ` AND asn.assignment_date <= $${assParams.length}`;
        }
      }
      assSql += ` GROUP BY asn.base_id, a.equipment_type_id`;

      // --- EXPENDITURES ---
      let expSql = `
        SELECT exp.base_id, a.equipment_type_id, COALESCE(SUM(exp.quantity), 0)::INTEGER AS total 
        FROM expenditures exp
        JOIN assets a ON exp.asset_id = a.id
        WHERE 1=1
      `;
      const expParams = [];
      if (effectiveBaseId) {
        expParams.push(effectiveBaseId);
        expSql += ` AND exp.base_id = $${expParams.length}`;
      }
      if (eqTypeId) {
        expParams.push(eqTypeId);
        expSql += ` AND a.equipment_type_id = $${expParams.length}`;
      }
      if (isPriorOnly && dateFrom) {
        expParams.push(dateFrom);
        expSql += ` AND exp.expenditure_date < $${expParams.length}`;
      } else {
        if (dateFrom) {
          expParams.push(dateFrom);
          expSql += ` AND exp.expenditure_date >= $${expParams.length}`;
        }
        if (dateTo) {
          expParams.push(dateTo);
          expSql += ` AND exp.expenditure_date <= $${expParams.length}`;
        }
      }
      expSql += ` GROUP BY exp.base_id, a.equipment_type_id`;

      const [pRes, tinRes, toutRes, assRes, expRes] = await Promise.all([
        query(pSql, pParams),
        query(tinSql, tinParams),
        query(toutSql, toutParams),
        query(assSql, assParams),
        query(expSql, expParams),
      ]);

      return {
        purchases: pRes.rows,
        transferIn: tinRes.rows,
        transferOut: toutRes.rows,
        assigned: assRes.rows,
        expended: expRes.rows,
      };
    };

    // Fetch Current Period metrics and Prior Period metrics
    const currentPeriod = await fetchAggregations(false);
    const priorPeriod = dateFrom ? await fetchAggregations(true) : null;

    const makeKey = (bId, eqId) => `${bId}_${eqId}`;
    const currentMap = {};
    const priorMap = {};

    const populateMap = (mapObj, data, metricName) => {
      data.forEach((row) => {
        const key = makeKey(row.base_id, row.equipment_type_id);
        if (!mapObj[key]) {
          mapObj[key] = { purchases: 0, transferIn: 0, transferOut: 0, assigned: 0, expended: 0 };
        }
        mapObj[key][metricName] = parseInt(row.total, 10) || 0;
      });
    };

    populateMap(currentMap, currentPeriod.purchases, 'purchases');
    populateMap(currentMap, currentPeriod.transferIn, 'transferIn');
    populateMap(currentMap, currentPeriod.transferOut, 'transferOut');
    populateMap(currentMap, currentPeriod.assigned, 'assigned');
    populateMap(currentMap, currentPeriod.expended, 'expended');

    if (priorPeriod) {
      populateMap(priorMap, priorPeriod.purchases, 'purchases');
      populateMap(priorMap, priorPeriod.transferIn, 'transferIn');
      populateMap(priorMap, priorPeriod.transferOut, 'transferOut');
      populateMap(priorMap, priorPeriod.assigned, 'assigned');
      populateMap(priorMap, priorPeriod.expended, 'expended');
    }

    // Process Equipment Breakdown
    const equipment_breakdown = equipmentTypesList.map((eq) => {
      let eqOpening = 0;
      let eqPurchases = 0;
      let eqTransferIn = 0;
      let eqTransferOut = 0;
      let eqAssigned = 0;
      let eqExpended = 0;
      let eqStock = 0;

      basesList.forEach((b) => {
        const key = makeKey(b.id, eq.id);
        const cur = currentMap[key] || { purchases: 0, transferIn: 0, transferOut: 0, assigned: 0, expended: 0 };
        const pri = priorMap[key] || { purchases: 0, transferIn: 0, transferOut: 0, assigned: 0, expended: 0 };
        const physStock = stockMap[key] || 0;

        eqPurchases += cur.purchases;
        eqTransferIn += cur.transferIn;
        eqTransferOut += cur.transferOut;
        eqAssigned += cur.assigned;
        eqExpended += cur.expended;
        eqStock += physStock;

        if (dateFrom) {
          const priorNet = pri.purchases + pri.transferIn - pri.transferOut - pri.assigned - pri.expended;
          eqOpening += Math.max(0, priorNet);
        }
      });

      const net_movement = eqPurchases + eqTransferIn - eqTransferOut;
      
      let closing_balance = 0;
      if (dateFrom) {
        closing_balance = eqOpening + net_movement - eqAssigned - eqExpended;
      } else {
        closing_balance = eqStock;
        eqOpening = Math.max(0, closing_balance - net_movement + eqAssigned + eqExpended);
      }

      return {
        equipment_type_id: eq.id,
        equipment_name: eq.name,
        category: eq.category,
        unit: eq.unit,
        opening_balance: eqOpening,
        purchases: eqPurchases,
        transfer_in: eqTransferIn,
        transfer_out: eqTransferOut,
        net_movement,
        assigned: eqAssigned,
        expended: eqExpended,
        closing_balance,
      };
    });

    // Process Base Breakdown
    const base_breakdown = basesList.map((b) => {
      let bOpening = 0;
      let bPurchases = 0;
      let bTransferIn = 0;
      let bTransferOut = 0;
      let bAssigned = 0;
      let bExpended = 0;
      let bStock = 0;

      equipmentTypesList.forEach((eq) => {
        const key = makeKey(b.id, eq.id);
        const cur = currentMap[key] || { purchases: 0, transferIn: 0, transferOut: 0, assigned: 0, expended: 0 };
        const pri = priorMap[key] || { purchases: 0, transferIn: 0, transferOut: 0, assigned: 0, expended: 0 };
        const physStock = stockMap[key] || 0;

        bPurchases += cur.purchases;
        bTransferIn += cur.transferIn;
        bTransferOut += cur.transferOut;
        bAssigned += cur.assigned;
        bExpended += cur.expended;
        bStock += physStock;

        if (dateFrom) {
          const priorNet = pri.purchases + pri.transferIn - pri.transferOut - pri.assigned - pri.expended;
          bOpening += Math.max(0, priorNet);
        }
      });

      const net_movement = bPurchases + bTransferIn - bTransferOut;

      let closing_balance = 0;
      if (dateFrom) {
        closing_balance = bOpening + net_movement - bAssigned - bExpended;
      } else {
        closing_balance = bStock;
        bOpening = Math.max(0, closing_balance - net_movement + bAssigned + bExpended);
      }

      return {
        base_id: b.id,
        base_name: b.name,
        base_code: b.code,
        opening_balance: bOpening,
        purchases: bPurchases,
        transfer_in: bTransferIn,
        transfer_out: bTransferOut,
        net_movement,
        assigned: bAssigned,
        expended: bExpended,
        closing_balance,
      };
    });

    // Aggregate Summary
    const summary = {
      opening_balance: equipment_breakdown.reduce((acc, row) => acc + row.opening_balance, 0),
      purchases: equipment_breakdown.reduce((acc, row) => acc + row.purchases, 0),
      transfer_in: equipment_breakdown.reduce((acc, row) => acc + row.transfer_in, 0),
      transfer_out: equipment_breakdown.reduce((acc, row) => acc + row.transfer_out, 0),
      net_movement: equipment_breakdown.reduce((acc, row) => acc + row.net_movement, 0),
      assigned: equipment_breakdown.reduce((acc, row) => acc + row.assigned, 0),
      expended: equipment_breakdown.reduce((acc, row) => acc + row.expended, 0),
      closing_balance: equipment_breakdown.reduce((acc, row) => acc + row.closing_balance, 0),
    };

    // Movement Chart Data
    const movement_data = [
      { category: 'Purchases', value: summary.purchases },
      { category: 'Transfer In', value: summary.transfer_in },
      { category: 'Transfer Out', value: summary.transfer_out },
      { category: 'Assigned', value: summary.assigned },
      { category: 'Expended', value: summary.expended },
    ];

    res.json({
      success: true,
      data: {
        summary,
        equipment_breakdown,
        base_breakdown,
        movement_data,
      },
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    next(err);
  }
};
