import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query, pool } from '../config/db.js';
import generateToken from '../utils/generateToken.js';
import logAudit from '../utils/auditLogger.js';
import emailService from '../services/emailService.js';

// Simple in-memory rate limiting map for forgot-password abuse protection
const resetRateLimitMap = new Map();

// @desc    Register a new user account
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, role, base_id } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.',
      });
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      });
    }

    // Check duplicate email
    const dupCheck = await query('SELECT id FROM users WHERE LOWER(email) = $1', [trimmedEmail]);
    if (dupCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    // Validate role
    const validRoles = ['admin', 'base_commander', 'logistics_officer'];
    const userRole = role && validRoles.includes(role) ? role : 'admin';

    // Validate base_id or default to first base
    let targetBaseId = base_id ? parseInt(base_id, 10) : 1;
    const baseCheck = await query('SELECT id, name FROM bases WHERE id = $1', [targetBaseId]);
    if (baseCheck.rows.length === 0) {
      const defaultBase = await query('SELECT id FROM bases ORDER BY id ASC LIMIT 1');
      targetBaseId = defaultBase.rows.length > 0 ? defaultBase.rows[0].id : 1;
    }

    // Hash password with Bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert user
    const insertSql = `
      INSERT INTO users (name, email, password_hash, role, base_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, name, email, role, base_id;
    `;
    const insertRes = await query(insertSql, [trimmedName, trimmedEmail, passwordHash, userRole, targetBaseId]);
    const newUser = insertRes.rows[0];

    // Fetch base name for user object
    const baseRes = await query('SELECT name FROM bases WHERE id = $1', [targetBaseId]);
    newUser.base_name = baseRes.rows.length > 0 ? baseRes.rows[0].name : '';

    // Generate JWT token
    const token = generateToken(newUser);

    // Audit log
    await logAudit({
      userId: newUser.id,
      action: 'REGISTER',
      entityType: 'AUTH',
      entityId: newUser.id,
      details: { email: newUser.email, role: newUser.role, name: newUser.name },
      ipAddress: req.ip || req.connection?.remoteAddress,
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: newUser,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get public bases list for registration
// @route   GET /api/auth/bases
// @access  Public
export const getBases = async (req, res, next) => {
  try {
    const result = await query('SELECT id, name, code, location FROM bases ORDER BY id ASC');
    res.json({
      success: true,
      bases: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a new organization / base
// @route   POST /api/auth/bases
// @access  Public
export const createBase = async (req, res, next) => {
  try {
    const { name, code, location } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Organization / Base name is required.',
      });
    }

    const trimmedName = name.trim();
    const generatedCode = code && code.trim() ? code.trim().toUpperCase() : (trimmedName.substring(0, 3).toUpperCase() + '-01');
    const trimmedLocation = location && location.trim() ? location.trim() : 'Command HQ';

    // Insert into bases table
    const result = await query(
      `INSERT INTO bases (name, code, location, created_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       RETURNING id, name, code, location`,
      [trimmedName, generatedCode, trimmedLocation]
    );

    const newBase = result.rows[0];

    // Audit log
    await logAudit({
      userId: req.user?.id || 1,
      action: 'CREATE_ORGANIZATION',
      entityType: 'BASE',
      entityId: newBase.id,
      details: { name: newBase.name, code: newBase.code, location: newBase.location },
      ipAddress: req.ip || req.connection?.remoteAddress,
    });

    res.status(201).json({
      success: true,
      message: 'Organization created successfully.',
      base: newBase,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password.',
      });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Query user and join base name
    const sql = `
      SELECT u.id, u.name, u.email, u.password_hash, u.role, u.base_id, b.name AS base_name
      FROM users u
      LEFT JOIN bases b ON u.base_id = b.id
      WHERE LOWER(u.email) = $1
    `;

    const result = await query(sql, [trimmedEmail]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const user = result.rows[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Generate JWT token
    const token = generateToken(user);

    // Audit log
    await logAudit({
      userId: user.id,
      action: 'LOGIN',
      entityType: 'AUTH',
      entityId: user.id,
      details: { email: user.email, role: user.role },
      ipAddress: req.ip || req.connection.remoteAddress,
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        base_id: user.base_id,
        base_name: user.base_name,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    const sql = `
      SELECT u.id, u.name, u.email, u.role, u.base_id, b.name AS base_name
      FROM users u
      LEFT JOIN bases b ON u.base_id = b.id
      WHERE u.id = $1
    `;

    const result = await query(sql, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    res.json({
      success: true,
      user: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Request Password Reset Email (Forgot Password)
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Generic response message (prevents account enumeration)
    const genericResponse = {
      success: true,
      message: 'If an account exists for this email, password reset instructions have been sent.',
    };

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      // Still return HTTP 200 with generic response if email is blank or malformed to avoid enumeration
      return res.status(200).json(genericResponse);
    }

    const trimmedEmail = email.trim().toLowerCase();
    const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
    const rateLimitKey = `${clientIp}_${trimmedEmail}`;
    const now = Date.now();

    // Rate limit check: max 1 request per 10 seconds per IP/email
    if (resetRateLimitMap.has(rateLimitKey)) {
      const lastTime = resetRateLimitMap.get(rateLimitKey);
      if (now - lastTime < 10000) {
        return res.status(200).json(genericResponse);
      }
    }
    resetRateLimitMap.set(rateLimitKey, now);

    // 1. Lookup user in database
    const userResult = await query('SELECT id, email, name FROM users WHERE LOWER(email) = $1', [trimmedEmail]);

    if (userResult.rows.length === 0) {
      // User not found -> Return generic response without revealing account status
      return res.status(200).json(genericResponse);
    }

    const user = userResult.rows[0];

    // 2. Invalidate / clean up previous active or expired reset tokens for this user
    await query(
      `UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND used_at IS NULL`,
      [user.id]
    );

    // 3. Generate cryptographically secure 256-bit random raw token
    const rawToken = crypto.randomBytes(32).toString('hex');

    // 4. Compute SHA-256 hash of the token for DB storage
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // 5. Token Expiration: 30 minutes
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // 6. Insert hashed token into database
    await query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt]
    );

    // 7. Construct frontend Reset URL (Raw token in URL parameter ONLY)
    const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    // Always log reset URL to server console in development so developers can test immediately
    console.log('\n======================================================');
    console.log(`🔑 PASSWORD RESET LINK FOR [${user.email}]:`);
    console.log(`👉 ${resetUrl}`);
    console.log('======================================================\n');

    // 8. Dispatch Email via Nodemailer (asynchronously)
    emailService.sendPasswordResetEmail({ to: user.email, resetUrl }).catch((err) => {
      console.error('Asynchronous Mail Dispatch Failed:', err.message);
    });

    // 9. Log Audit Event
    await logAudit({
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      entityType: 'AUTH',
      entityId: user.id,
      details: { timestamp: new Date().toISOString() },
      ipAddress: clientIp,
    });

    res.status(200).json(genericResponse);
  } catch (err) {
    next(err);
  }
};

// @desc    Reset Password with Token
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { token, password } = req.body;

    const invalidTokenResponse = {
      success: false,
      message: 'This password reset link is invalid or has expired. Please request a new password reset link.',
    };

    if (!token || typeof token !== 'string' || !token.trim()) {
      return res.status(400).json(invalidTokenResponse);
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      });
    }

    // Hash the incoming raw token using SHA-256 to look up in DB
    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    // Query active, non-expired, unused token
    const tokenQuery = `
      SELECT id, user_id, expires_at, used_at
      FROM password_reset_tokens
      WHERE token_hash = $1
    `;
    const tokenRes = await query(tokenQuery, [tokenHash]);

    if (tokenRes.rows.length === 0) {
      return res.status(400).json(invalidTokenResponse);
    }

    const resetTokenRecord = tokenRes.rows[0];

    // Check if token was already used or expired
    if (resetTokenRecord.used_at !== null || new Date(resetTokenRecord.expires_at) <= new Date()) {
      return res.status(400).json(invalidTokenResponse);
    }

    await client.query('BEGIN');

    // 1. Hash new password with Bcrypt
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(password, saltRounds);

    // 2. Update user's password_hash
    await client.query(
      `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [newPasswordHash, resetTokenRecord.user_id]
    );

    // 3. Mark current token as used
    await client.query(
      `UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [resetTokenRecord.id]
    );

    // 4. Invalidate all other active reset tokens for this user
    await client.query(
      `UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND used_at IS NULL`,
      [resetTokenRecord.user_id]
    );

    // 5. Audit log
    await logAudit({
      userId: resetTokenRecord.user_id,
      action: 'PASSWORD_RESET_COMPLETED',
      entityType: 'AUTH',
      entityId: resetTokenRecord.user_id,
      details: { timestamp: new Date().toISOString() },
      ipAddress: req.ip || req.connection?.remoteAddress,
      client,
    });

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: 'Your password has been reset successfully. You can now log in.',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};
