import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || '',
  },
});

// Verify SMTP connection during startup in development mode
if (process.env.NODE_ENV !== 'production') {
  if (process.env.SMTP_USER && process.env.SMTP_PASSWORD && process.env.SMTP_USER !== 'your-gmail-address@gmail.com') {
    transporter.verify((error) => {
      if (error) {
        console.warn('⚠️ SMTP mail service connection failed:', error.message);
      } else {
        console.log('✉️  SMTP mail service is ready.');
      }
    });
  } else {
    console.log('ℹ️  SMTP mail service using development placeholders.');
  }
}

export default transporter;
