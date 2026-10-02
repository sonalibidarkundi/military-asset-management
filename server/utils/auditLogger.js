import { query as defaultQuery } from '../config/db.js';

export const logAudit = async ({
  userId = null,
  action,
  entityType,
  entityId = null,
  details = {},
  ipAddress = null,
  client = null,
}) => {
  try {
    // Sanitize details: strip out any potential sensitive credentials/tokens
    const safeDetails = { ...details };
    delete safeDetails.password;
    delete safeDetails.password_hash;
    delete safeDetails.token;
    delete safeDetails.authorization;
    delete safeDetails.jwt;

    const sql = `
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING id;
    `;

    const values = [
      userId,
      action,
      entityType,
      entityId,
      JSON.stringify(safeDetails),
      ipAddress,
    ];

    const executor = client ? client.query.bind(client) : defaultQuery;
    const result = await executor(sql, values);
    return result.rows[0].id;
  } catch (err) {
    console.error('Audit Log Insertion Failed:', err.message);
    // Audit log failure shouldn't crash primary app flow, but log error
    return null;
  }
};

export default logAudit;
