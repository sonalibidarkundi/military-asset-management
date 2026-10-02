import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { Shield, Mail, ArrowLeft, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authAPI.forgotPassword(email);
      if (response.data && response.data.success) {
        setSuccessMessage(
          response.data.message ||
            'If an account exists for this email, password reset instructions have been sent.'
        );
      } else {
        setErrorMessage('Unable to process password reset request. Please try again.');
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      // Even on error, show friendly safe message without revealing internal issues
      setSuccessMessage('If an account exists for this email, password reset instructions have been sent.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      {/* Tactical Background Effects */}
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
              Secure identity recovery and password reset authorization portal.
            </p>

            <div className="tactical-graphic-card">
              <div className="graphic-header">
                <div className="status-indicator">
                  <span className="pulse-dot"></span>
                  <span className="status-label">IDENTITY GATEWAY: SECURE</span>
                </div>
                <span className="graphic-code">AUTH-REC // 2026</span>
              </div>
              <div className="graphic-metrics">
                <div className="metric-box">
                  <span className="metric-title">LINK EXPIRATION</span>
                  <span className="metric-val">30 MINUTES</span>
                </div>
                <div className="metric-box">
                  <span className="metric-title">TOKEN HASHING</span>
                  <span className="metric-val">SHA-256</span>
                </div>
                <div className="metric-box">
                  <span className="metric-title">ENUMERATION</span>
                  <span className="metric-val">PROTECTED</span>
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
              <h3 className="card-subheading">Forgot Password</h3>
              <p className="card-subtitle">
                Enter your registered email address and we'll send password reset instructions.
              </p>
            </div>

            {/* Notifications */}
            {errorMessage && (
              <div className="login-error-banner" role="alert">
                <AlertCircle size={18} className="error-icon" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="login-success-banner" role="status" style={{ background: '#064e3b', color: '#6ee7b7', border: '1px solid #047857', padding: '0.85rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.875rem', display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form" noValidate>
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Registered Email Address
                </label>
                <div className="input-wrapper">
                  <Mail className="input-icon" size={18} />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    className="form-input"
                    autoComplete="email"
                    disabled={isSubmitting || !!successMessage}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !!successMessage}
                className="submit-btn"
              >
                {isSubmitting ? 'Sending Reset Instructions...' : 'Send Reset Link'}
              </button>
            </form>

            <div className="back-to-login-container" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <Link to="/login" className="back-to-login-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>
                <ArrowLeft size={16} />
                <span>Back to Login</span>
              </Link>
            </div>

            <div className="login-card-footer">
              <ShieldAlert size={14} className="notice-icon" />
              <span>Authorized personnel identity verification</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
