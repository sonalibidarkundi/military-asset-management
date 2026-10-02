import { query, pool } from './config/db.js';

const newEmail = process.argv[2] ? process.argv[2].trim().toLowerCase() : null;

if (!newEmail || !newEmail.includes('@')) {
  console.log('Usage: node update-admin-email.js <new-admin-email@example.com>');
  process.exit(1);
}

async function updateAdminEmail() {
  try {
    console.log(`--- Updating Admin Email to: ${newEmail} ---`);

    // Check if email is already taken by another user
    const checkRes = await query('SELECT id, role FROM users WHERE LOWER(email) = $1', [newEmail]);
    if (checkRes.rows.length > 0 && checkRes.rows[0].role !== 'admin') {
      console.error(`❌ Error: Email ${newEmail} is already assigned to a non-admin account.`);
      process.exit(1);
    }

    const updateRes = await query(
      `UPDATE users SET email = $1, updated_at = CURRENT_TIMESTAMP WHERE role = 'admin' RETURNING id, name, email, role;`,
      [newEmail]
    );

    if (updateRes.rows.length === 0) {
      console.error('❌ No Admin account found in database.');
    } else {
      console.log('✅ Admin email updated successfully!');
      console.log('Updated Account:', updateRes.rows[0]);
    }
  } catch (err) {
    console.error('❌ Database update error:', err.message);
  } finally {
    await pool.end();
  }
}

updateAdminEmail();
