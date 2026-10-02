import transporter from '../config/mailer.js';

export const sendPasswordResetEmail = async ({ to, resetUrl }) => {
  const from = process.env.MAIL_FROM || 'AEGIS MAMS <no-reply@aegis.mil>';
  const subject = 'AEGIS MAMS — Password Reset Request';

  const textContent = `Hello,

We received a request to reset your AEGIS MAMS password.

Click or copy the link below to reset your password:
${resetUrl}

This link will expire in 30 minutes.

If you did not request a password reset, you can safely ignore this email.

For security reasons, never share this link with anyone.

Regards,
AEGIS MAMS
Military Asset & Strategic Logistics Command`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0b0f19; color: #f8fafc; margin: 0; padding: 20px; }
    .container { max-width: 580px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .header { text-align: center; border-bottom: 1px solid #334155; padding-bottom: 20px; margin-bottom: 24px; }
    .brand-title { color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 2px; margin: 0; }
    .brand-sub { color: #94a3b8; font-size: 12px; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
    .content { line-height: 1.6; color: #cbd5e1; font-size: 15px; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4); }
    .notice { background: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 24px 0; border-radius: 4px; font-size: 13px; color: #fef08a; }
    .footer { border-top: 1px solid #334155; margin-top: 32px; padding-top: 20px; font-size: 12px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="brand-title">AEGIS MAMS</h1>
      <div class="brand-sub">Military Asset & Strategic Logistics Command</div>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>We received a request to reset your AEGIS MAMS password.</p>
      <div class="btn-container">
        <a href="${resetUrl}" class="btn" target="_blank">Reset Password</a>
      </div>
      <div class="notice">
        ⚡ <strong>This link will expire in 30 minutes.</strong><br>
        If you did not request a password reset, you can safely ignore this email. For security reasons, never share this link with anyone.
      </div>
    </div>
    <div class="footer">
      Regards,<br>
      <strong>AEGIS MAMS Command Center</strong><br>
      Military Asset & Strategic Logistics Command
    </div>
  </div>
</body>
</html>
`;

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text: textContent,
      html: htmlContent,
    });
    console.log(`✉️ Password reset email dispatched to target recipient (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    // Log safe server error without credentials or sensitive secrets
    console.error(`⚠️ Email Delivery Error [Recipient: ${to}]:`, err.message);
    return { success: false, error: err.message };
  }
};

export default {
  sendPasswordResetEmail,
};
