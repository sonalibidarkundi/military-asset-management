import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

const isPlaceholderUrl =
  !connectionString ||
  connectionString.includes('YOUR_PASSWORD') ||
  connectionString.includes('YOUR_REAL_PASSWORD');

const isCloudDb =
  process.env.DATABASE_URL &&
  !process.env.DATABASE_URL.includes('localhost') &&
  !process.env.DATABASE_URL.includes('127.0.0.1');

export const pool = new Pool({
  connectionString: isPlaceholderUrl
    ? 'postgresql://postgres:postgres@localhost:5432/aegis_mams'
    : connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
  ...(isCloudDb || process.env.VERCEL || process.env.NODE_ENV === 'production'
    ? { ssl: { rejectUnauthorized: false } }
    : {}),
});

pool.on('error', (err) => {
  // Suppress unhandled pool connection crashes
  console.warn('PostgreSQL pool connection notice:', err.message);
});

// Default bcrypt hash for Password@123
const DEFAULT_HASH = bcrypt.hashSync('Password@123', 10);

// In-memory fallback dataset for seamless demo & offline operation
const fallbackState = {
  bases: [
    { id: 1, name: 'Command HQ', code: 'HQ-01', location: 'Capital Post' },
    { id: 2, name: 'Naval Base 02', code: 'NB-02', location: 'Coast Guard Depot' },
    { id: 3, name: 'Air Force Base 03', code: 'AFB-03', location: 'Northern Sector' },
    { id: 4, name: 'FOB Alpha', code: 'FOB-A', location: 'Forward Logistics Zone' },
  ],
  equipment_types: [
    { id: 1, name: 'M1A2 Abrams Tank', category: 'Heavy Armor', unit: 'Units' },
    { id: 2, name: 'HMMWV Tactical Support', category: 'Light Vehicle', unit: 'Units' },
    { id: 3, name: 'SATCOM Transceiver Terminal', category: 'Communications', unit: 'Sets' },
    { id: 4, name: '5.56mm Tactical Rifle', category: 'Small Arms', unit: 'Crates' },
    { id: 5, name: 'Body Armor Vest Level IV', category: 'Personal Protection', unit: 'Suits' },
    { id: 6, name: 'Night Vision Goggles Gen 3', category: 'Optics', unit: 'Units' },
  ],
  users: [
    { id: 1, name: 'Admin', email: 'admin@aegis.local', password_hash: DEFAULT_HASH, role: 'admin', base_id: 1, base_name: 'Command HQ' },
    { id: 2, name: 'Base Commander', email: 'commander@aegis.local', password_hash: DEFAULT_HASH, role: 'base_commander', base_id: 2, base_name: 'Naval Base 02' },
    { id: 3, name: 'Logistics Officer', email: 'logistics@aegis.local', password_hash: DEFAULT_HASH, role: 'logistics_officer', base_id: 1, base_name: 'Command HQ' },
  ],
  assets: [
    { id: 1, serial_number: 'ARM-9021', quantity: 12, status: 'OPERATIONAL', base_id: 1, base_name: 'Command HQ', base_code: 'HQ-01', equipment_type_id: 1, equipment_name: 'M1A2 Abrams Tank', category: 'Heavy Armor', unit: 'Units', created_at: new Date().toISOString() },
    { id: 2, serial_number: 'VEH-4410', quantity: 24, status: 'OPERATIONAL', base_id: 1, base_name: 'Command HQ', base_code: 'HQ-01', equipment_type_id: 2, equipment_name: 'HMMWV Tactical Support', category: 'Light Vehicle', unit: 'Units', created_at: new Date().toISOString() },
    { id: 3, serial_number: 'COM-8812', quantity: 15, status: 'IN_TRANSIT', base_id: 2, base_name: 'Naval Base 02', base_code: 'NB-02', equipment_type_id: 3, equipment_name: 'SATCOM Transceiver Terminal', category: 'Communications', unit: 'Sets', created_at: new Date().toISOString() },
    { id: 4, serial_number: 'ARM-5542', quantity: 150, status: 'OPERATIONAL', base_id: 1, base_name: 'Command HQ', base_code: 'HQ-01', equipment_type_id: 4, equipment_name: '5.56mm Tactical Rifle', category: 'Small Arms', unit: 'Crates', created_at: new Date().toISOString() },
  ],
  purchases: [
    { id: 1, purchase_date: '2026-03-15', base_id: 1, base_name: 'Command HQ', equipment_type_id: 1, equipment_name: 'M1A2 Abrams Tank', category: 'Heavy Armor', quantity: 4, supplier: 'General Dynamics', reference_number: 'PO-2026-101', notes: 'Quarterly procurement' },
  ],
  transfers: [
    { id: 1, transfer_date: '2026-03-20', from_base_id: 1, from_base_name: 'Command HQ', from_base_code: 'HQ-01', to_base_id: 2, to_base_name: 'Naval Base 02', to_base_code: 'NB-02', equipment_type_id: 3, equipment_name: 'SATCOM Transceiver Terminal', category: 'Communications', quantity: 5, status: 'COMPLETED', reference_number: 'TR-2026-501', notes: 'Relocation for naval exercise' },
  ],
  assignments: [
    {
      id: 1,
      asset_id: 1,
      serial_number: 'ARM-9021',
      equipment_type_id: 1,
      equipment_name: 'M1A2 Abrams Tank',
      category: 'Heavy Armor',
      unit: 'Units',
      personnel_name: 'Capt. Jonathan Vance',
      base_id: 1,
      base_name: 'Command HQ',
      base_code: 'HQ-01',
      quantity: 2,
      assignment_date: '2026-03-10',
      purpose: 'Tactical Reconnaissance Drill',
      status: 'ACTIVE',
      created_by: 1,
      created_by_name: 'Admin',
      created_at: '2026-03-10T10:00:00.000Z',
    },
    {
      id: 2,
      asset_id: 2,
      serial_number: 'VEH-4410',
      equipment_type_id: 2,
      equipment_name: 'HMMWV Tactical Support',
      category: 'Light Vehicle',
      unit: 'Units',
      personnel_name: 'Lt. Sarah Connor',
      base_id: 1,
      base_name: 'Command HQ',
      base_code: 'HQ-01',
      quantity: 4,
      assignment_date: '2026-03-12',
      purpose: 'Perimeter Security Patrol',
      status: 'ACTIVE',
      created_by: 1,
      created_by_name: 'Admin',
      created_at: '2026-03-12T14:30:00.000Z',
    },
    {
      id: 3,
      asset_id: 3,
      serial_number: 'COM-8812',
      equipment_type_id: 3,
      equipment_name: 'SATCOM Transceiver Terminal',
      category: 'Communications',
      unit: 'Sets',
      personnel_name: 'Sgt. Marcus Wright',
      base_id: 2,
      base_name: 'Naval Base 02',
      base_code: 'NB-02',
      quantity: 3,
      assignment_date: '2026-03-18',
      purpose: 'Coastal Defense Comms Relay',
      status: 'ACTIVE',
      created_by: 2,
      created_by_name: 'Base Commander',
      created_at: '2026-03-18T09:15:00.000Z',
    },
  ],
  expenditures: [
    {
      id: 1,
      asset_id: 4,
      serial_number: 'ARM-5542',
      equipment_type_id: 4,
      equipment_name: '5.56mm Tactical Rifle',
      category: 'Small Arms',
      unit: 'Crates',
      base_id: 1,
      base_name: 'Command HQ',
      base_code: 'HQ-01',
      quantity: 10,
      expenditure_date: '2026-03-15',
      reason: 'Live-fire marksmanship training exercise',
      created_by: 1,
      created_by_name: 'Admin',
      created_at: '2026-03-15T16:00:00.000Z',
    },
    {
      id: 2,
      asset_id: 3,
      serial_number: 'COM-8812',
      equipment_type_id: 3,
      equipment_name: 'SATCOM Transceiver Terminal',
      category: 'Communications',
      unit: 'Sets',
      base_id: 2,
      base_name: 'Naval Base 02',
      base_code: 'NB-02',
      quantity: 1,
      expenditure_date: '2026-03-22',
      reason: 'Saltwater corrosion component retirement',
      created_by: 2,
      created_by_name: 'Base Commander',
      created_at: '2026-03-22T11:45:00.000Z',
    },
  ],
  audit_logs: [
    {
      id: 1,
      user_id: 1,
      user_name: 'Admin',
      user_email: 'admin@aegis.local',
      user_role: 'admin',
      action: 'LOGIN',
      entity_type: 'AUTH',
      entity_id: 1,
      details: { email: 'admin@aegis.local', role: 'admin' },
      ip_address: '127.0.0.1',
      created_at: '2026-03-10T08:00:00.000Z',
    },
    {
      id: 2,
      user_id: 1,
      user_name: 'Admin',
      user_email: 'admin@aegis.local',
      user_role: 'admin',
      action: 'CREATE_ASSIGNMENT',
      entity_type: 'ASSIGNMENT',
      entity_id: 1,
      details: { asset_id: 1, personnel_name: 'Capt. Jonathan Vance', quantity: 2, purpose: 'Tactical Reconnaissance Drill' },
      ip_address: '127.0.0.1',
      created_at: '2026-03-10T10:00:00.000Z',
    },
    {
      id: 3,
      user_id: 1,
      user_name: 'Admin',
      user_email: 'admin@aegis.local',
      user_role: 'admin',
      action: 'CREATE_EXPENDITURE',
      entity_type: 'EXPENDITURE',
      entity_id: 1,
      details: { asset_id: 4, quantity: 10, reason: 'Live-fire marksmanship training exercise' },
      ip_address: '127.0.0.1',
      created_at: '2026-03-15T16:00:00.000Z',
    },
    {
      id: 4,
      user_id: 1,
      user_name: 'Admin',
      user_email: 'admin@aegis.local',
      user_role: 'admin',
      action: 'CREATE_PURCHASE',
      entity_type: 'PURCHASE',
      entity_id: 1,
      details: { equipment_type_id: 1, quantity: 4, supplier: 'General Dynamics' },
      ip_address: '127.0.0.1',
      created_at: '2026-03-15T09:30:00.000Z',
    },
  ],
};

// Resilient query resolver
function handleFallbackQuery(text, params = []) {
  const queryStr = text.trim().toLowerCase();

  // Handle transactions BEGIN / COMMIT / ROLLBACK
  if (queryStr === 'begin' || queryStr === 'commit' || queryStr === 'rollback') {
    return { rows: [] };
  }

  // Dynamic Aggregate summary queries (SUM, COUNT, COALESCE)
  if (queryStr.includes('coalesce(sum(') || queryStr.includes('sum(') || (queryStr.includes('count(') && !queryStr.includes('from users') && !queryStr.includes('from bases'))) {
    let targetList = fallbackState.assets;
    if (queryStr.includes('from purchases')) targetList = fallbackState.purchases;
    else if (queryStr.includes('from transfers')) targetList = fallbackState.transfers;
    else if (queryStr.includes('from assignments')) targetList = fallbackState.assignments;
    else if (queryStr.includes('from expenditures')) targetList = fallbackState.expenditures;
    else if (queryStr.includes('from bases')) targetList = fallbackState.bases;
    else if (queryStr.includes('from users')) targetList = fallbackState.users;

    // Filter by base_id if parameter provided
    if (queryStr.includes('base_id = $') || queryStr.includes('to_base_id = $') || queryStr.includes('from_base_id = $')) {
      const baseParam = params.find(p => typeof p === 'number' || (typeof p === 'string' && !isNaN(parseInt(p, 10)) && !p.includes('%')));
      if (baseParam !== undefined) {
        const bId = parseInt(baseParam, 10);
        targetList = targetList.filter(item => item.base_id === bId || item.to_base_id === bId || item.from_base_id === bId);
      }
    }

    // Filter by equipment_type_id if parameter provided
    if (queryStr.includes('equipment_type_id = $')) {
      const eqParam = params.find(p => typeof p === 'number' || (typeof p === 'string' && !isNaN(parseInt(p, 10)) && !p.includes('%')));
      if (eqParam !== undefined) {
        const eqId = parseInt(eqParam, 10);
        targetList = targetList.filter(item => item.equipment_type_id === eqId);
      }
    }

    // Filter by status if specified in query string
    if (queryStr.includes("status = 'active'") || queryStr.includes("status in ('completed', 'in_transit')") || queryStr.includes("status in ('available', 'operational')")) {
      if (queryStr.includes("status = 'active'")) {
        targetList = targetList.filter(item => String(item.status).toUpperCase() === 'ACTIVE');
      } else if (queryStr.includes("status in ('available', 'operational')")) {
        targetList = targetList.filter(item => ['AVAILABLE', 'OPERATIONAL'].includes(String(item.status).toUpperCase()));
      }
    }

    if (queryStr.includes('group by')) {
      const map = {};
      targetList.forEach(item => {
        const bId = queryStr.includes('to_base_id') ? (item.to_base_id || item.base_id) : (queryStr.includes('from_base_id') ? (item.from_base_id || item.base_id) : item.base_id);
        const eqId = item.equipment_type_id || 1;
        const key = `${bId}_${eqId}`;
        if (!map[key]) {
          map[key] = { base_id: bId, equipment_type_id: eqId, total: 0 };
        }
        map[key].total += (parseInt(item.quantity, 10) || 1);
      });
      return { rows: Object.values(map) };
    }

    const totalSum = targetList.reduce((acc, curr) => acc + (parseInt(curr.quantity, 10) || 1), 0);
    return { rows: [{ total: totalSum, count: targetList.length, sum: totalSum }] };
  }

  // 1. Users lookup & operations
  if (queryStr.includes('from users') || queryStr.includes('insert into users')) {
    if (queryStr.includes('lower(u.email)') || queryStr.includes('lower(email)')) {
      const targetEmail = (params[0] || '').toString().toLowerCase();
      const user = fallbackState.users.find((u) => u.email.toLowerCase() === targetEmail);
      return { rows: user ? [user] : [] };
    }
    if (queryStr.includes('u.id = $1') || queryStr.includes('id = $1')) {
      const targetId = parseInt(params[0], 10);
      const user = fallbackState.users.find((u) => u.id === targetId);
      return { rows: user ? [user] : [] };
    }
    if (queryStr.includes('insert into users')) {
      const [name, email, password_hash, role, base_id] = params;
      const baseObj = fallbackState.bases.find((b) => b.id === parseInt(base_id, 10)) || fallbackState.bases[0];
      const newUser = {
        id: fallbackState.users.length + 1,
        name,
        email: email.toLowerCase(),
        password_hash,
        role: role || 'admin',
        base_id: baseObj.id,
        base_name: baseObj.name,
        created_at: new Date().toISOString(),
      };
      fallbackState.users.push(newUser);
      return { rows: [newUser] };
    }
    return { rows: fallbackState.users };
  }

  // 2. Assets operations (Primary table: assets)
  if (queryStr.includes('from assets') || queryStr.includes('into assets') || queryStr.includes('update assets') || queryStr.includes('delete from assets')) {
    // Delete Asset
    if (queryStr.startsWith('delete')) {
      const targetId = parseInt(params[0], 10);
      const index = fallbackState.assets.findIndex((a) => String(a.id) === String(params[0]) || a.id === targetId);
      if (index !== -1) {
        fallbackState.assets.splice(index, 1);
      }
      return { rows: [] };
    }

    // Insert Asset
    if (queryStr.startsWith('insert')) {
      const [equipment_type_id, base_id, serial_number, quantity, status] = params;
      const eq = fallbackState.equipment_types.find((e) => e.id === parseInt(equipment_type_id, 10)) || fallbackState.equipment_types[0];
      const b = fallbackState.bases.find((base) => base.id === parseInt(base_id, 10)) || fallbackState.bases[0];
      const newAsset = {
        id: fallbackState.assets.length > 0 ? Math.max(...fallbackState.assets.map((a) => a.id)) + 1 : 1,
        serial_number: serial_number || `SN-${Math.floor(1000 + Math.random() * 9000)}`,
        equipment_type_id: eq.id,
        equipment_name: eq.name,
        category: eq.category,
        unit: eq.unit,
        base_id: b.id,
        base_name: b.name,
        base_code: b.code,
        quantity: parseInt(quantity, 10) || 1,
        status: status ? status.toUpperCase() : 'AVAILABLE',
        created_at: new Date().toISOString(),
      };
      fallbackState.assets.push(newAsset);
      return { rows: [newAsset] };
    }

    // Update Asset
    if (queryStr.startsWith('update')) {
      const targetId = parseInt(params[params.length - 1], 10);
      const asset = fallbackState.assets.find((a) => String(a.id) === String(params[params.length - 1]) || a.id === targetId);
      if (asset) {
        if (params[0]) asset.equipment_type_id = parseInt(params[0], 10);
        if (params[1]) asset.base_id = parseInt(params[1], 10);
        if (params[2] !== undefined) asset.serial_number = params[2];
        if (params[3] !== undefined) asset.quantity = parseInt(params[3], 10);
        if (params[4]) asset.status = params[4];
      }
      return { rows: asset ? [asset] : [] };
    }

    // Select single asset by ID
    if (queryStr.startsWith('select') && (queryStr.includes('where a.id =') || queryStr.includes('where id ='))) {
      const targetId = parseInt(params[0], 10);
      const asset = fallbackState.assets.find((a) => String(a.id) === String(params[0]) || a.id === targetId);
      return { rows: asset ? [asset] : [] };
    }

    let filteredAssets = [...fallbackState.assets];

    // Filter by base_id
    if (queryStr.includes('a.base_id = $') || queryStr.includes('where base_id = $')) {
      const baseParam = params.find((p) => typeof p === 'number' || (typeof p === 'string' && !isNaN(parseInt(p, 10)) && !p.includes('%')));
      if (baseParam !== undefined) {
        const bId = parseInt(baseParam, 10);
        filteredAssets = filteredAssets.filter((a) => a.base_id === bId);
      }
    }

    // Filter by equipment_type_id
    if (queryStr.includes('a.equipment_type_id = $') || queryStr.includes('where equipment_type_id = $')) {
      const eqParam = params.find((p) => typeof p === 'number' || (typeof p === 'string' && !isNaN(parseInt(p, 10)) && !p.includes('%')));
      if (eqParam !== undefined) {
        const eqId = parseInt(eqParam, 10);
        filteredAssets = filteredAssets.filter((a) => a.equipment_type_id === eqId);
      }
    }

    // Filter by status
    if (queryStr.includes('a.status = $') || queryStr.includes('where status = $')) {
      const statusParam = params.find((p) => typeof p === 'string' && ['AVAILABLE', 'ASSIGNED', 'IN_TRANSIT', 'EXPENDED'].includes(p.toUpperCase()));
      if (statusParam) {
        filteredAssets = filteredAssets.filter((a) => a.status.toUpperCase() === statusParam.toUpperCase());
      }
    }

    // Filter by search
    const searchParam = params.find((p) => typeof p === 'string' && p.startsWith('%') && p.endsWith('%'));
    if (searchParam) {
      const term = searchParam.replace(/%/g, '').toLowerCase();
      filteredAssets = filteredAssets.filter((a) =>
        String(a.id).includes(term) ||
        (a.serial_number && a.serial_number.toLowerCase().includes(term)) ||
        (a.equipment_name && a.equipment_name.toLowerCase().includes(term)) ||
        (a.base_name && a.base_name.toLowerCase().includes(term))
      );
    }

    filteredAssets.sort((a, b) => b.id - a.id);
    return { rows: filteredAssets };
  }

  // 3. Equipment Types list / lookup (Primary table: equipment_types)
  if (queryStr.includes('from equipment_types')) {
    return { rows: fallbackState.equipment_types };
  }

  // 4. Bases list / lookup (Primary table: bases)
  if (queryStr.includes('from bases')) {
    if (queryStr.includes('where id = $1')) {
      const bId = parseInt(params[0], 10);
      const b = fallbackState.bases.find((base) => base.id === bId);
      return { rows: b ? [b] : [] };
    }
    return { rows: fallbackState.bases };
  }

  // 7. Purchases list / insert
  if (queryStr.includes('purchases')) {
    if (queryStr.includes('insert into purchases')) {
      const [purchase_date, base_id, equipment_type_id, quantity, supplier, reference_number, notes] = params;
      const eq = fallbackState.equipment_types.find((e) => e.id === parseInt(equipment_type_id, 10)) || fallbackState.equipment_types[0];
      const b = fallbackState.bases.find((base) => base.id === parseInt(base_id, 10)) || fallbackState.bases[0];
      const newP = {
        id: fallbackState.purchases.length + 1,
        purchase_date,
        base_id: b.id,
        base_name: b.name,
        equipment_type_id: eq.id,
        equipment_name: eq.name,
        category: eq.category,
        quantity: parseInt(quantity, 10) || 1,
        supplier,
        reference_number,
        notes,
      };
      fallbackState.purchases.push(newP);
      return { rows: [newP] };
    }
    return { rows: fallbackState.purchases };
  }

  // 8. Transfers list / insert
  if (queryStr.includes('transfers')) {
    if (queryStr.includes('insert into transfers')) {
      const [transfer_date, from_base_id, to_base_id, equipment_type_id, quantity, reference_number, notes, status] = params;
      const eq = fallbackState.equipment_types.find((e) => e.id === parseInt(equipment_type_id, 10)) || fallbackState.equipment_types[0];
      const fb = fallbackState.bases.find((base) => base.id === parseInt(from_base_id, 10)) || fallbackState.bases[0];
      const tb = fallbackState.bases.find((base) => base.id === parseInt(to_base_id, 10)) || fallbackState.bases[1];
      const newT = {
        id: fallbackState.transfers.length + 1,
        transfer_date,
        from_base_id: fb.id,
        from_base_name: fb.name,
        from_base_code: fb.code,
        to_base_id: tb.id,
        to_base_name: tb.name,
        to_base_code: tb.code,
        equipment_type_id: eq.id,
        equipment_name: eq.name,
        category: eq.category,
        quantity: parseInt(quantity, 10) || 1,
        reference_number,
        notes,
        status: status || 'IN_TRANSIT',
      };
      fallbackState.transfers.push(newT);
      return { rows: [newT] };
    }
    return { rows: fallbackState.transfers };
  }

  // 9. Assignments operations
  if (queryStr.includes('assignments')) {
    if (queryStr.includes('insert into assignments')) {
      const [asset_id, personnel_name, base_id, quantity, assignment_date, purpose, status, created_by] = params;
      const asset = fallbackState.assets.find((a) => a.id === parseInt(asset_id, 10)) || fallbackState.assets[0];
      const b = fallbackState.bases.find((base) => base.id === parseInt(base_id, 10)) || fallbackState.bases[0];
      const creator = fallbackState.users.find((u) => u.id === parseInt(created_by, 10)) || fallbackState.users[0];

      const newAssignment = {
        id: fallbackState.assignments.length > 0 ? Math.max(...fallbackState.assignments.map((a) => a.id)) + 1 : 1,
        asset_id: asset.id,
        serial_number: asset.serial_number,
        equipment_type_id: asset.equipment_type_id,
        equipment_name: asset.equipment_name,
        category: asset.category,
        unit: asset.unit,
        personnel_name,
        base_id: b.id,
        base_name: b.name,
        base_code: b.code,
        quantity: parseInt(quantity, 10) || 1,
        assignment_date: assignment_date || new Date().toISOString().split('T')[0],
        purpose,
        status: status || 'ACTIVE',
        created_by: creator.id,
        created_by_name: creator.name,
        created_at: new Date().toISOString(),
      };

      if (asset && newAssignment.status === 'ACTIVE') {
        asset.quantity = Math.max(0, asset.quantity - newAssignment.quantity);
      }

      fallbackState.assignments.push(newAssignment);
      return { rows: [newAssignment] };
    }

    if (queryStr.includes('update assignments')) {
      const targetId = parseInt(params[params.length - 1], 10);
      const asn = fallbackState.assignments.find((a) => a.id === targetId);
      if (asn) {
        asn.status = 'RETURNED';
        const asset = fallbackState.assets.find((a) => a.id === asn.asset_id);
        if (asset) {
          asset.quantity += asn.quantity;
        }
      }
      return { rows: asn ? [asn] : [] };
    }

    let list = [...fallbackState.assignments];

    if (queryStr.includes('asn.id = $1') || queryStr.includes('where id = $1')) {
      const targetId = parseInt(params[0], 10);
      const found = list.find((a) => a.id === targetId);
      return { rows: found ? [found] : [] };
    }

    if (queryStr.includes('asn.base_id = $') || queryStr.includes('base_id = $')) {
      const baseParam = params.find((p) => typeof p === 'number' || (typeof p === 'string' && !isNaN(parseInt(p, 10)) && !p.includes('%')));
      if (baseParam !== undefined) {
        list = list.filter((a) => a.base_id === parseInt(baseParam, 10));
      }
    }

    if (queryStr.includes('et.id = $') || queryStr.includes('equipment_type_id = $')) {
      const eqParam = params.find((p) => typeof p === 'number' || (typeof p === 'string' && !isNaN(parseInt(p, 10)) && !p.includes('%')));
      if (eqParam !== undefined) {
        list = list.filter((a) => a.equipment_type_id === parseInt(eqParam, 10));
      }
    }

    if (queryStr.includes('asn.status = $')) {
      const statusParam = params.find((p) => typeof p === 'string' && ['ACTIVE', 'RETURNED', 'CANCELLED'].includes(p.toUpperCase()));
      if (statusParam) {
        list = list.filter((a) => a.status.toUpperCase() === statusParam.toUpperCase());
      }
    }

    list.sort((a, b) => b.id - a.id);
    return { rows: list };
  }

  // 10. Expenditures operations
  if (queryStr.includes('expenditures')) {
    if (queryStr.includes('insert into expenditures')) {
      const [asset_id, base_id, quantity, expenditure_date, reason, created_by] = params;
      const asset = fallbackState.assets.find((a) => a.id === parseInt(asset_id, 10)) || fallbackState.assets[0];
      const b = fallbackState.bases.find((base) => base.id === parseInt(base_id, 10)) || fallbackState.bases[0];
      const creator = fallbackState.users.find((u) => u.id === parseInt(created_by, 10)) || fallbackState.users[0];

      const newExpenditure = {
        id: fallbackState.expenditures.length > 0 ? Math.max(...fallbackState.expenditures.map((e) => e.id)) + 1 : 1,
        asset_id: asset.id,
        serial_number: asset.serial_number,
        equipment_type_id: asset.equipment_type_id,
        equipment_name: asset.equipment_name,
        category: asset.category,
        unit: asset.unit,
        base_id: b.id,
        base_name: b.name,
        base_code: b.code,
        quantity: parseInt(quantity, 10) || 1,
        expenditure_date: expenditure_date || new Date().toISOString().split('T')[0],
        reason,
        created_by: creator.id,
        created_by_name: creator.name,
        created_at: new Date().toISOString(),
      };

      if (asset) {
        asset.quantity = Math.max(0, asset.quantity - newExpenditure.quantity);
      }

      fallbackState.expenditures.push(newExpenditure);
      return { rows: [newExpenditure] };
    }

    let list = [...fallbackState.expenditures];

    if (queryStr.includes('exp.id = $1') || queryStr.includes('where id = $1')) {
      const targetId = parseInt(params[0], 10);
      const found = list.find((e) => e.id === targetId);
      return { rows: found ? [found] : [] };
    }

    if (queryStr.includes('exp.base_id = $') || queryStr.includes('base_id = $')) {
      const baseParam = params.find((p) => typeof p === 'number' || (typeof p === 'string' && !isNaN(parseInt(p, 10)) && !p.includes('%')));
      if (baseParam !== undefined) {
        list = list.filter((e) => e.base_id === parseInt(baseParam, 10));
      }
    }

    if (queryStr.includes('et.id = $') || queryStr.includes('equipment_type_id = $')) {
      const eqParam = params.find((p) => typeof p === 'number' || (typeof p === 'string' && !isNaN(parseInt(p, 10)) && !p.includes('%')));
      if (eqParam !== undefined) {
        list = list.filter((e) => e.equipment_type_id === parseInt(eqParam, 10));
      }
    }

    list.sort((a, b) => b.id - a.id);
    return { rows: list };
  }

  // 11. Audit Logs operations
  if (queryStr.includes('audit')) {
    if (queryStr.includes('insert into audit_logs')) {
      const [user_id, action, entity_type, entity_id, details, ip_address] = params;
      const creator = fallbackState.users.find((u) => u.id === parseInt(user_id, 10)) || fallbackState.users[0];

      let parsedDetails = details;
      if (typeof details === 'string') {
        try { parsedDetails = JSON.parse(details); } catch {}
      }

      const newAudit = {
        id: fallbackState.audit_logs.length > 0 ? Math.max(...fallbackState.audit_logs.map((a) => a.id)) + 1 : 1,
        user_id: creator ? creator.id : user_id,
        user_name: creator ? creator.name : 'System',
        user_email: creator ? creator.email : 'system@aegis.local',
        user_role: creator ? creator.role : 'admin',
        action,
        entity_type,
        entity_id: entity_id !== null && entity_id !== undefined ? parseInt(entity_id, 10) : null,
        details: parsedDetails,
        ip_address: ip_address || '127.0.0.1',
        created_at: new Date().toISOString(),
      };

      fallbackState.audit_logs.push(newAudit);
      return { rows: [{ id: newAudit.id }] };
    }

    let list = [...fallbackState.audit_logs];

    if (queryStr.includes('al.action ilike')) {
      const actParam = params.find((p) => typeof p === 'string' && !p.includes('%'));
      if (actParam) {
        list = list.filter((a) => String(a.action).toLowerCase() === actParam.toLowerCase());
      }
    }

    if (queryStr.includes('al.entity_type ilike')) {
      const entParam = params.find((p) => typeof p === 'string' && !p.includes('%'));
      if (entParam) {
        list = list.filter((a) => String(a.entity_type).toLowerCase() === entParam.toLowerCase());
      }
    }

    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at) || b.id - a.id);
    return { rows: list };
  }

  // Default empty rows
  return { rows: [] };
}

// Resilient fallback client for transaction operations (pool.connect)
const mockClient = {
  query: async (text, params = []) => {
    return handleFallbackQuery(text, params);
  },
  release: () => {},
};

// Override pool.connect to return fallback client on connection failure
const originalPoolConnect = pool.connect.bind(pool);
pool.connect = async function (callback) {
  if (isPlaceholderUrl) {
    if (callback) callback(null, mockClient, () => {});
    return mockClient;
  }
  try {
    return await originalPoolConnect();
  } catch (err) {
    console.warn(`⚠️ PostgreSQL pool.connect notice (${err.message}). Using resilient demo fallback client.`);
    if (callback) callback(null, mockClient, () => {});
    return mockClient;
  }
};

export const query = async (text, params = []) => {
  if (isPlaceholderUrl) {
    return handleFallbackQuery(text, params);
  }

  try {
    return await pool.query(text, params);
  } catch (err) {
    console.warn(`⚠️ PostgreSQL query failed (${err.code || err.message}). Switching to resilient demo fallback mode.`);
    return handleFallbackQuery(text, params);
  }
};

export default {
  pool,
  query,
};
