import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    base_id: user.base_id || null,
  };

  const secret = process.env.JWT_SECRET || 'aegis_mams_default_secret_key_2026';

  return jwt.sign(payload, secret, {
    expiresIn: '24h',
  });
};

export default generateToken;
