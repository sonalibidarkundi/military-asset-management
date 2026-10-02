import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { query } from '../config/db.js';

dotenv.config();

export const protect = async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      token = authHeader.split(' ')[1];

      const secret = process.env.JWT_SECRET || 'aegis_mams_default_secret_key_2026';
      const decoded = jwt.verify(token, secret);

      // Verify user still exists in database
      const userResult = await query(
        'SELECT id, name, email, role, base_id FROM users WHERE id = $1',
        [decoded.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized: User no longer exists.',
        });
      }

      req.user = userResult.rows[0];
      return next();
    } catch (err) {
      console.error('JWT Verification error:', err.message);
      return res.status(401).json({
        success: false,
        message: 'Not authorized: Token verification failed or expired.',
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized: No token provided.',
    });
  }
};

export default protect;
