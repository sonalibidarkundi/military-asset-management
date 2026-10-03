import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('CRITICAL ERROR: DATABASE_URL environment variable is missing.');
}

const isCloudDb =
  process.env.DATABASE_URL &&
  !process.env.DATABASE_URL.includes('localhost') &&
  !process.env.DATABASE_URL.includes('127.0.0.1');

export const pool = new Pool({
  connectionString: connectionString || 'postgresql://postgres:postgres@localhost:5432/aegis_mams',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ...(isCloudDb || process.env.VERCEL || process.env.NODE_ENV === 'production'
    ? { ssl: { rejectUnauthorized: false } }
    : {}),
});

pool.on('connect', () => {
  // Connected to PostgreSQL database
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

export const query = (text, params) => pool.query(text, params);

export default {
  pool,
  query,
};
