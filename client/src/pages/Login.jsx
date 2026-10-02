import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Shield, Lock, Mail, AlertCircle, Eye, EyeOff, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const result = await login(email, password);

      if (result.success) {
        navigate('/');
      } else {
        setErrorMessage(result.message || 'Invalid email or password.');
      }
    } catch (err) {
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemoSelect = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrorMessage('');
  };

  return (
    <div className="login-container">
      {/* Decorative CSS-only Background Grids & Radar Rings */}
      <div className="bg-tactical-grid" aria-hidden="true"></div>
      <div className="bg-radar-circle circle-1" aria-hidden="true"></div>
      <div className="bg-radar-circle circle-2" aria-hidden="true"></div>

      <div className="login-layout">
        {/* Left Section - Tactical Visual & Brand Info */}
        <section className="login-visual-section">
          <div className="visual-content">
            <div className="visual-badge">
              <Shield size={20} className="shield-icon" />
              <span>DEFENSE LOGISTICS & COMMAND</span>
            </div>

            <h1 className="visual-title">AEGIS MAMS</h1>
            <h2 className="visual-subtitle">Military Asset Management System</h2>

            <p className="visual-description">
              Centralized military asset movement, assignment and expenditure management.
            </p>

            {/* CSS Military/Logistics Graphical Card Showcase */}
            <div className="tactical-graphic-card">
              <div className="graphic-header">
                <div className="status-indicator">
                  <span className="pulse-dot"></span>
                  <span className="status-label">TACTICAL NET: SECURE</span>
                </div>
                <span className="graphic-code">SYS-DEF // 8080</span>
              </div>
              <div className="graphic-metrics">
                <div className="metric-box">
                  <span className="metric-title">ASSET READINESS</span>
                  <span className="metric-val">99.4%</span>
                </div>
                <div className="metric-box">
                  <span className="metric-title">COMMAND POSTS</span>
                  <span className="metric-val">14 ACTIVE</span>
                </div>
                <div className="metric-box">
                  <span className="metric-title">ENCRYPTION</span>
                  <span className="metric-val">AES-256</span>
                </div>
              </div>
              <div className="graphic-footer-line">
                <div className="progress-bar-fill"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Right Section - Login Form Card */}
        <section className="login-card-section">
          <div className="login-card">
            <div className="login-card-header">
              <div className="card-brand-logo">
                <Shield className="brand-shield" size={28} />
              </div>
              <h2 className="card-heading">AEGIS MAMS</h2>
              <h3 className="card-subheading">Welcome Back</h3>
              <p className="card-subtitle">Sign in to access the command dashboard</p>
            </div>

            {/* Error Message Banner */}
            {errorMessage && (
              <div className="login-error-banner" role="alert">
                <AlertCircle size={18} className="error-icon" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form" noValidate>
              {/* Email Input */}
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email Address
                </label>
                <div className="input-wrapper">
                  <Mail className="input-icon" size={18} />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="form-input"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={18} />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="form-input"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Controls Row: Remember Me & Forgot Password */}
              <div className="form-controls-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="checkbox-input"
                  />
                  <span className="checkbox-custom"></span>
                  <span className="checkbox-text">Remember me</span>
                </label>

                <Link to="/forgot-password" className="forgot-password-btn">
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="submit-btn"
              >
                {isSubmitting ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>

            {/* Quick Demo Credentials Assistant */}
            <div className="demo-credentials-box">
              <span className="demo-title">DEMO CREDENTIALS (CLICK TO FILL)</span>
              <div className="demo-chips">
                <button
                  type="button"
                  className="demo-chip"
                  onClick={() => handleQuickDemoSelect('admin@aegis.local', 'Password@123')}
                >
                  Admin
                </button>
                <button
                  type="button"
                  className="demo-chip"
                  onClick={() => handleQuickDemoSelect('commander@aegis.local', 'Password@123')}
                >
                  Base Commander
                </button>
                <button
                  type="button"
                  className="demo-chip"
                  onClick={() => handleQuickDemoSelect('logistics@aegis.local', 'Password@123')}
                >
                  Logistics Officer
                </button>
              </div>
            </div>

            {/* Create Account Link */}
            <div className="register-prompt" style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.875rem', color: '#94a3b8' }}>
              Don't have an account?{' '}
              <Link to="/register" style={{ color: '#38bdf8', fontWeight: 600, textDecoration: 'none' }}>
                Create Account
              </Link>
            </div>

            {/* Footer Notice */}
            <div className="login-card-footer">
              <ShieldAlert size={14} className="notice-icon" />
              <span>Authorized personnel only</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
