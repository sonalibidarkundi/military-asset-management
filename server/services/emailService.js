// Mock Email Service (Real SMTP Email Integration Removed)
// Users can register directly and log in immediately. Real email sending can be re-added in future.

export const sendPasswordResetEmail = async ({ to, resetUrl }) => {
  console.log(`ℹ️ [MOCK EMAIL SERVICE] Password reset requested for: ${to}`);
  console.log(`🔗 [MOCK EMAIL SERVICE] Reset URL: ${resetUrl}`);
  return { success: true };
};

export default {
  sendPasswordResetEmail,
};
