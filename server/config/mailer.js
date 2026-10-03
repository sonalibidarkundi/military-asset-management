// Mock Mailer Transport (Real SMTP integration disabled)

export const transporter = {
  sendMail: async () => ({ success: true, messageId: 'mock-mail-id' }),
  verify: (cb) => cb && cb(null, true),
};

export default transporter;
