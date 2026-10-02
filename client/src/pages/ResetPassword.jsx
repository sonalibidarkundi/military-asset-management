import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { Shield, Lock, Eye, EyeOff, ArrowLeft, CheckCircle2, AlertCircle, RefreshCw, ShieldAlert } from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isTokenInvalid, setIsTokenInvalid] = useState(!token);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!token) {
      setIsTokenInvalid(true);
      setErrorMessage('This password reset link is invalid or has expired. Please request a new password reset link.');
      return;
    }

    if (!password || password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('New password and confirm password do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authAPI.resetPassword(token, password);

      if (response.data && response.data.success) {
        setSuccessMessage('Your password has been reset successfully. You can now log in.');
      } else {
        const msg = response.data?.message || 'Password reset failed.';
        if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('expired')) {
          setIsTokenInvalid(true);
        }
        setErrorMessage(msg);
      }
    } catch (err) {
      console.error('Reset password error:', err);
      const serverMsg = err.response?.data?.message || 'Password reset failed.';
      if (serverMsg.toLowerCase().includes('invalid') || serverMsg.toLowerCase().includes('expired')) {
        setIsTokenInvalid(true);
      }
      setErrorMessage(serverMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      {/* Background Grids & Radar Rings */}
      <div className="bg-tactical-grid" aria-hidden="true"></div>
      <div className="bg-radar-circle circle-1" aria-hidden="true"></div>
      <div className="bg-radar-circle circle-2" aria-hidden="true"></div>

      <div className="login-layout">
        {/* Left Section - Tactical Visual */}
        <section className="login-visual-section">
          <div className="visual-content">
            <div className="visual-badge">
              <Shield size={20} className="shield-icon" />
              <span>DEFENSE LOGISTICS & COMMAND</span>
            </div>

            <h1 className="visual-title">AEGIS MAMS</h1>
            <h2 className="visual-subtitle">Military Asset & Strategic Logistics Command</h2>

            <p className="visual-description">
              Encrypted credential update and password reset verification portal.
            </p>

            <div className="tactical-graphic-card">
              <div className="graphic-header">
                <div className="status-indicator">
                  <span className="pulse-dot"></span>
                  <span className="status-label">ENCRYPTION: BCRYPT (SALT=10)</span>
                </div>
                <span className="graphic-code">SEC-PASS // 2026</span>
              </div>
              <div className="graphic-metrics">
                <div className="metric-box">
                  <span className="metric-title">MIN LENGTH</span>
                  <span className="metric-val">8 CHARS</span>
                </div>
                <div className="metric-box">
                  <span className="metric-title">TOKEN STATUS</span>
                  <span className="metric-val">{isTokenInvalid ? 'INVALID' : 'ACTIVE'}</span>
                </div>
                <div className="metric-box">
                  <span className="metric-title">SINGLE USE</span>
                  <span className="metric-val">ENFORCED</span>
                </div>
              </div>
              <div className="graphic-footer-line">
                <div className="progress-bar-fill"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Right Section - Form Card */}
        <section className="login-card-section">
          <div className="login-card">
            <div className="login-card-header">
              <div className="card-brand-logo">
                <Shield className="brand-shield" size={28} />
              </div>
              <h2 className="card-heading">AEGIS MAMS</h2>
              <h3 className="card-subheading">Reset Password</h3>
              <p className="card-subtitle">
                Enter your new password to restore access to your account.
              </p>
            </div>

            {/* Error Message Banner */}
            {errorMessage && (
              <div className="login-error-banner" role="alert">
                <AlertCircle size={18} className="error-icon" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success Message Banner */}
            {successMessage ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ background: '#064e3b', color: '#6ee7b7', border: '1px solid #047857', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
                  <span>{successMessage}</span>
                </div>

                <button
                  type="button"
                  className="submit-btn"
                  onClick={() => navigate('/login')}
                >
                  Back to Login
                </button>
              </div>
            ) : isTokenInvalid ? (
              /* Invalid Token View */
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ background: '#450a0a', color: '#fca5a5', border: '1px solid #991b1b', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                  This password reset link is invalid or has expired. Please request a new password reset link.
                </div>

                <Link
                  to="/forgot-password"
                  className="submit-btn"
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <RefreshCw size={16} />
                  <span>Request New Reset Link</span>
                </Link>

                <div style={{ marginTop: '1.25rem' }}>
                  <Link to="/login" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>
                    Back to Login
                  </Link>
                </div>
              </div>
            ) : (
              /* Reset Password Form */
              <form onSubmit={handleSubmit} className="login-form" noValidate>
                {/* New Password */}
                <div className="form-group">
                  <label htmlFor="new-password" className="form-label">
                    New Password
                  </label>
                  <div className="input-wrapper">
                    <Lock className="input-icon" size={18} />
                    <input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter new password (min. 8 characters)"
                      className="form-input"
                      autoComplete="new-password"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="form-group">
                  <label htmlFor="confirm-password" className="form-label">
                    Confirm Password
                  </label>
                  <div className="input-wrapper">
                    <Lock className="input-icon" size={18} />
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="form-input"
                      autoComplete="new-password"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="submit-btn"
                >
                  {isSubmitting ? 'Updating Password...' : 'Reset Password'}
                </button>

                <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
                  <Link to="/login" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <ArrowLeft size={16} />
                    <span>Back to Login</span>
                  </Link>
                </div>
              </form>
            )}

            <div className="login-card-footer">
              <ShieldAlert size={14} className="notice-icon" />
              <span>Authorized personnel credential update</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
