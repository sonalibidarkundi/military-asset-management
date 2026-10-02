import { query } from '../config/db.js';

// @desc    Get system audit logs with filters and search
// @route   GET /api/audit
// @access  Private (Admin only)
export const getAuditLogs = async (req, res, next) => {
  try {
    let sql = `
      SELECT 
        al.id,
        al.action,
        al.entity_type,
        al.entity_id,
        al.details,
        al.ip_address,
        al.created_at,
        u.id AS user_id,
        u.name AS user_name,
        u.email AS user_email,
        u.role AS user_role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
    `;

    const whereClauses = [];
    const params = [];

    // Filter: Date From
    if (req.query.date_from) {
      params.push(req.query.date_from);
      whereClauses.push(`al.created_at >= $${params.length}::timestamp`);
    }

    // Filter: Date To (up to 23:59:59 of selected date)
    if (req.query.date_to) {
      params.push(`${req.query.date_to} 23:59:59`);
      whereClauses.push(`al.created_at <= $${params.length}::timestamp`);
    }

    // Filter: User (name or email)
    if (req.query.user) {
      params.push(`%${req.query.user.trim()}%`);
      const idx = params.length;
      whereClauses.push(`(u.name ILIKE $${idx} OR u.email ILIKE $${idx})`);
    }

    // Filter: Action
    if (req.query.action) {
      params.push(req.query.action.trim());
      whereClauses.push(`al.action ILIKE $${params.length}`);
    }

    // Filter: Entity Type
    if (req.query.entity_type) {
      params.push(req.query.entity_type.trim());
      whereClauses.push(`al.entity_type ILIKE $${params.length}`);
    }

    // Filter: Search across entity ID, Details JSON text, Action, or User
    if (req.query.search) {
      const searchTerm = `%${req.query.search.trim()}%`;
      params.push(searchTerm);
      const idx = params.length;
      whereClauses.push(
        `(CAST(al.entity_id AS TEXT) ILIKE $${idx} OR CAST(al.details AS TEXT) ILIKE $${idx} OR al.action ILIKE $${idx} OR u.name ILIKE $${idx} OR u.email ILIKE $${idx})`
      );
    }

    if (whereClauses.length > 0) {
      sql += ' WHERE ' + whereClauses.join(' AND ');
    }

    sql += ' ORDER BY al.created_at DESC, al.id DESC LIMIT 1000';

    const result = await query(sql, params);

    // Sanitize output data records to ensure zero exposure of sensitive fields
    const sanitizedRows = result.rows.map((row) => {
      let parsedDetails = row.details;
      if (typeof parsedDetails === 'string') {
        try {
          parsedDetails = JSON.parse(parsedDetails);
        } catch {
          // Keep original string if not valid JSON
        }
      }

      if (parsedDetails && typeof parsedDetails === 'object') {
        delete parsedDetails.password;
        delete parsedDetails.password_hash;
        delete parsedDetails.token;
        delete parsedDetails.jwt;
        delete parsedDetails.secret;
        delete parsedDetails.authorization;
      }

      return {
        ...row,
        details: parsedDetails,
      };
    });

    res.json({
      success: true,
      count: sanitizedRows.length,
      data: sanitizedRows,
    });
  } catch (err) {
    next(err);
  }
};
