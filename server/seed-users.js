import bcrypt from 'bcryptjs';
import { query, pool } from './config/db.js';

const DEMO_USERS = [
  {
    name: 'Admin',
    email: 'admin@aegis.local',
    password: 'Password@123',
    role: 'admin',
    baseCode: 'HQ-01',
  },
  {
    name: 'Base Commander',
    email: 'commander@aegis.local',
    password: 'Password@123',
    role: 'base_commander',
    baseCode: 'NB-02',
  },
  {
    name: 'Logistics Officer',
    email: 'logistics@aegis.local',
    password: 'Password@123',
    role: 'logistics_officer',
    baseCode: 'HQ-01',
  },
];

async function seedUsers() {
  console.log('--- AEGIS MAMS: Seeding Development Users ---');

  try {
    for (const u of DEMO_USERS) {
      // Find base ID by code
      const baseResult = await query('SELECT id FROM bases WHERE code = $1', [u.baseCode]);
      const baseId = baseResult.rows.length > 0 ? baseResult.rows[0].id : null;

      // Hash password using bcryptjs
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(u.password, saltRounds);

      // Upsert user by email
      const upsertSql = `
        INSERT INTO users (name, email, password_hash, role, base_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (email) DO UPDATE 
        SET name = EXCLUDED.name,
            password_hash = EXCLUDED.password_hash,
            role = EXCLUDED.role,
            base_id = EXCLUDED.base_id,
            updated_at = CURRENT_TIMESTAMP
        RETURNING id, name, email, role;
      `;

      const result = await query(upsertSql, [u.name, u.email, hashedPassword, u.role, baseId]);
      console.log(`✔ User seeded: ${result.rows[0].email} (${result.rows[0].role})`);
    }

    console.log('--- User Seeding Completed Successfully ---');
  } catch (err) {
    console.error('✖ Error seeding users:', err.message);
  } finally {
    await pool.end();
  }
}

seedUsers();
