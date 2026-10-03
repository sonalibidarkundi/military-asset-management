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
  // Prevent unhandled pool errors from crashing Node process
  console.warn('PostgreSQL pool connection event error:', err.message);
});

// Pre-hashed password for Password@123
const DEFAULT_HASH = bcrypt.hashSync('Password@123', 10);

// In-memory fallback state when database connection is not available
const fallbackState = {
  bases: [
    { id: 1, name: 'Command HQ', code: 'HQ-01', location: 'Capital Post' },
    { id: 2, name: 'Naval Base 02', code: 'NB-02', location: 'Coast Guard Depot' },
  ],
  users: [
    { id: 1, name: 'Admin', email: 'admin@aegis.local', password_hash: DEFAULT_HASH, role: 'admin', base_id: 1, base_name: 'Command HQ' },
    { id: 2, name: 'Base Commander', email: 'commander@aegis.local', password_hash: DEFAULT_HASH, role: 'base_commander', base_id: 2, base_name: 'Naval Base 02' },
    { id: 3, name: 'Logistics Officer', email: 'logistics@aegis.local', password_hash: DEFAULT_HASH, role: 'logistics_officer', base_id: 1, base_name: 'Command HQ' },
  ],
  assets: [
    { id: 1, name: 'M1A2 Abrams Tank', category: 'Heavy Armor', status: 'Operational', base_id: 1, base_name: 'Command HQ', serial_number: 'ARM-9021', created_at: new Date().toISOString() },
    { id: 2, name: 'HMMWV Tactical Support', category: 'Light Vehicle', status: 'Operational', base_id: 1, base_name: 'Command HQ', serial_number: 'VEH-4410', created_at: new Date().toISOString() },
    { id: 3, name: 'SATCOM Transceiver Terminal', category: 'Communications', status: 'In Maintenance', base_id: 2, base_name: 'Naval Base 02', serial_number: 'COM-8812', created_at: new Date().toISOString() },
  ],
  purchases: [],
  transfers: [],
  assignments: [],
  expenditures: [],
  audit_logs: [],
};

// Fallback executor for SQL queries when DB connection fails
function handleFallbackQuery(text, params = []) {
  const queryStr = text.trim().toLowerCase();

  // 1. Auth: User lookup by email
  if (queryStr.includes('from users') && (queryStr.includes('lower(u.email)') || queryStr.includes('lower(email)'))) {
    const targetEmail = (params[0] || '').toString().toLowerCase();
    const user = fallbackState.users.find((u) => u.email.toLowerCase() === targetEmail);
    return { rows: user ? [user] : [] };
  }

  // 2. Auth: User lookup by ID
  if (queryStr.includes('from users') && (queryStr.includes('u.id = $1') || queryStr.includes('id = $1'))) {
    const targetId = parseInt(params[0], 10);
    const user = fallbackState.users.find((u) => u.id === targetId);
    return { rows: user ? [user] : [] };
  }

  // 3. Auth: User insert (Register)
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

  // 4. Bases: Select list / lookup
  if (queryStr.includes('from bases')) {
    if (queryStr.includes('where id = $1')) {
      const bId = parseInt(params[0], 10);
      const b = fallbackState.bases.find((base) => base.id === bId);
      return { rows: b ? [b] : [] };
    }
    return { rows: fallbackState.bases };
  }

  // 5. Assets: Select / Count
  if (queryStr.includes('from assets')) {
    if (queryStr.includes('count(')) {
      return { rows: [{ count: fallbackState.assets.length }] };
    }
    return { rows: fallbackState.assets };
  }

  // 6. Generic Fallback: Return empty rows array for other endpoints
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
