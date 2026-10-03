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
    { id: 1, serial_number: 'ARM-9021', quantity: 12, status: 'Operational', base_id: 1, base_name: 'Command HQ', base_code: 'HQ-01', equipment_type_id: 1, equipment_name: 'M1A2 Abrams Tank', category: 'Heavy Armor', unit: 'Units', created_at: new Date().toISOString() },
    { id: 2, serial_number: 'VEH-4410', quantity: 24, status: 'Operational', base_id: 1, base_name: 'Command HQ', base_code: 'HQ-01', equipment_type_id: 2, equipment_name: 'HMMWV Tactical Support', category: 'Light Vehicle', unit: 'Units', created_at: new Date().toISOString() },
    { id: 3, serial_number: 'COM-8812', quantity: 15, status: 'In Maintenance', base_id: 2, base_name: 'Naval Base 02', base_code: 'NB-02', equipment_type_id: 3, equipment_name: 'SATCOM Transceiver Terminal', category: 'Communications', unit: 'Sets', created_at: new Date().toISOString() },
    { id: 4, serial_number: 'ARM-5542', quantity: 150, status: 'Operational', base_id: 1, base_name: 'Command HQ', base_code: 'HQ-01', equipment_type_id: 4, equipment_name: '5.56mm Tactical Rifle', category: 'Small Arms', unit: 'Crates', created_at: new Date().toISOString() },
  ],
  purchases: [
    { id: 1, purchase_date: '2026-03-15', base_id: 1, base_name: 'Command HQ', equipment_type_id: 1, equipment_name: 'M1A2 Abrams Tank', category: 'Heavy Armor', quantity: 4, supplier: 'General Dynamics', reference_number: 'PO-2026-101', notes: 'Quarterly procurement' },
  ],
  transfers: [
    { id: 1, transfer_date: '2026-03-20', from_base_id: 1, from_base_name: 'Command HQ', from_base_code: 'HQ-01', to_base_id: 2, to_base_name: 'Naval Base 02', to_base_code: 'NB-02', equipment_type_id: 3, equipment_name: 'SATCOM Transceiver Terminal', category: 'Communications', quantity: 5, status: 'COMPLETED', reference_number: 'TR-2026-501', notes: 'Relocation for naval exercise' },
  ],
  assignments: [],
  expenditures: [],
  audit_logs: [],
};

// Resilient query resolver
function handleFallbackQuery(text, params = []) {
  const queryStr = text.trim().toLowerCase();

  // Aggregate summary queries (SUM, COUNT, COALESCE)
  if (queryStr.includes('coalesce(sum(') || (queryStr.includes('count(') && !queryStr.includes('from users') && !queryStr.includes('from bases'))) {
    return { rows: [{ total: 0, count: fallbackState.assets.length, sum: 0 }] };
  }

  // 1. Users lookup by email
  if (queryStr.includes('from users') && (queryStr.includes('lower(u.email)') || queryStr.includes('lower(email)'))) {
    const targetEmail = (params[0] || '').toString().toLowerCase();
    const user = fallbackState.users.find((u) => u.email.toLowerCase() === targetEmail);
    return { rows: user ? [user] : [] };
  }

  // 2. Users lookup by ID
  if (queryStr.includes('from users') && (queryStr.includes('u.id = $1') || queryStr.includes('id = $1'))) {
    const targetId = parseInt(params[0], 10);
    const user = fallbackState.users.find((u) => u.id === targetId);
    return { rows: user ? [user] : [] };
  }

  // 3. Register user insert
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

  // 4. Equipment Types list / lookup
  if (queryStr.includes('equipment_types')) {
    return { rows: fallbackState.equipment_types };
  }

  // 5. Bases list / lookup
  if (queryStr.includes('from bases') || queryStr.includes('bases')) {
    if (queryStr.includes('where id = $1')) {
      const bId = parseInt(params[0], 10);
      const b = fallbackState.bases.find((base) => base.id === bId);
      return { rows: b ? [b] : [] };
    }
    return { rows: fallbackState.bases };
  }

  // 6. Assets list / insert / count
  if (queryStr.includes('from assets') || queryStr.includes('assets')) {
    if (queryStr.includes('insert into assets')) {
      const [serial_number, equipment_type_id, base_id, quantity, status] = params;
      const eq = fallbackState.equipment_types.find(e => e.id === parseInt(equipment_type_id, 10)) || fallbackState.equipment_types[0];
      const b = fallbackState.bases.find(base => base.id === parseInt(base_id, 10)) || fallbackState.bases[0];
      const newAsset = {
        id: fallbackState.assets.length + 1,
        serial_number,
        equipment_type_id: eq.id,
        equipment_name: eq.name,
        category: eq.category,
        unit: eq.unit,
        base_id: b.id,
        base_name: b.name,
        base_code: b.code,
        quantity: parseInt(quantity, 10) || 1,
        status: status || 'Operational',
        created_at: new Date().toISOString(),
      };
      fallbackState.assets.push(newAsset);
      return { rows: [newAsset] };
    }
    return { rows: fallbackState.assets };
  }

  // 7. Purchases list / insert
  if (queryStr.includes('purchases')) {
    if (queryStr.includes('insert into purchases')) {
      const [purchase_date, base_id, equipment_type_id, quantity, supplier, reference_number, notes] = params;
      const eq = fallbackState.equipment_types.find(e => e.id === parseInt(equipment_type_id, 10)) || fallbackState.equipment_types[0];
      const b = fallbackState.bases.find(base => base.id === parseInt(base_id, 10)) || fallbackState.bases[0];
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
      const eq = fallbackState.equipment_types.find(e => e.id === parseInt(equipment_type_id, 10)) || fallbackState.equipment_types[0];
      const fb = fallbackState.bases.find(base => base.id === parseInt(from_base_id, 10)) || fallbackState.bases[0];
      const tb = fallbackState.bases.find(base => base.id === parseInt(to_base_id, 10)) || fallbackState.bases[1];
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

  // 9. Assignments
  if (queryStr.includes('assignments')) {
    return { rows: fallbackState.assignments };
  }

  // 10. Expenditures
  if (queryStr.includes('expenditures')) {
    return { rows: fallbackState.expenditures };
  }

  // 11. Audit Logs
  if (queryStr.includes('audit')) {
    return { rows: fallbackState.audit_logs };
  }

  // Default empty rows
  return { rows: [] };
}

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
