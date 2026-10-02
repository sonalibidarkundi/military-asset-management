import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authAPI } from '../services/api';
import { Shield, Lock, Mail, User, Building2, ShieldAlert, AlertCircle, CheckCircle2, Eye, EyeOff, UserCheck } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('admin');
  const [baseId, setBaseId] = useState('');
  const [bases, setBases] = useState([]);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Load bases list on component mount
  useEffect(() => {
    async function fetchBases() {
      try {
        const response = await authAPI.getBases();
        if (response.data && response.data.bases) {
          setBases(response.data.bases);
          if (response.data.bases.length > 0) {
            setBaseId(response.data.bases[0].id.toString());
          }
        }
      } catch (err) {
        console.error('Failed to load bases:', err);
      }
    }
    fetchBases();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!name.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authAPI.register({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        base_id: baseId ? parseInt(baseId, 10) : 1,
      });

      if (response.data && response.data.success) {
        setSuccessMessage('Account created successfully! Logging you into AEGIS MAMS...');

        // Automatically authenticate user using returned token or login credentials
        if (response.data.token && response.data.user) {
          localStorage.setItem('aegis_token', response.data.token);
          localStorage.setItem('aegis_user', JSON.stringify(response.data.user));
          setTimeout(() => {
            window.location.href = '/';
          }, 1200);
        } else {
          // Fallback login
          const loginRes = await login(email, password);
          if (loginRes.success) {
            navigate('/');
          } else {
            navigate('/login');
          }
        }
      } else {
        setErrorMessage(response.data?.message || 'Failed to create account. Please try again.');
      }
    } catch (err) {
      console.error('Registration error:', err);
      const apiErrorMsg = err.response?.data?.message || 'Failed to create account. Email may already be registered.';
      setErrorMessage(apiErrorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      {/* Decorative Tactical Background Grids & Radar Rings */}
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
            <h2 className="visual-subtitle">Account Registration & Provisioning</h2>

            <p className="visual-description">
              Create your authorized military personnel account to access the command dashboard and manage operational assets.
            </p>

            <div className="tactical-graphic-card">
              <div className="graphic-header">
                <div className="status-indicator">
                  <span className="pulse-dot"></span>
                  <span className="status-label">REGISTRATION: ACTIVE</span>
                </div>
                <span className="graphic-code">REG-AUTH // 2026</span>
              </div>
              <div className="graphic-metrics">
                <div className="metric-box">
                  <span className="metric-title">SECURITY LEVEL</span>
                  <span className="metric-val">LEVEL 4</span>
                </div>
                <div className="metric-box">
                  <span className="metric-title">ENCRYPTION</span>
                  <span className="metric-val">BCRYPT x10</span>
                </div>
                <div className="metric-box">
                  <span className="metric-title">AUDIT LOGGING</span>
                  <span className="metric-val">ENABLED</span>
                </div>
              </div>
              <div className="graphic-footer-line">
                <div className="progress-bar-fill"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Right Section - Account Registration Form */}
        <section className="login-card-section">
          <div className="login-card" style={{ maxWidth: '480px' }}>
            <div className="login-card-header">
              <div className="card-brand-logo">
                <UserCheck className="brand-shield" size={28} />
              </div>
              <h2 className="card-heading">AEGIS MAMS</h2>
              <h3 className="card-subheading">Create Account</h3>
              <p className="card-subtitle">Set up your profile with your email ID</p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="login-error-banner" role="alert">
                <AlertCircle size={18} className="error-icon" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div
                className="login-success-banner"
                role="status"
                style={{
                  background: '#064e3b',
                  color: '#6ee7b7',
                  border: '1px solid #047857',
                  padding: '0.85rem 1rem',
                  borderRadius: '8px',
                  marginBottom: '1.25rem',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                }}
              >
                <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form" noValidate>
              {/* Name Input */}
              <div className="form-group">
                <label htmlFor="name" className="form-label">
                  Full Name
                </label>
                <div className="input-wrapper">
                  <User className="input-icon" size={18} />
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="form-input"
                    disabled={isSubmitting || !!successMessage}
                  />
                </div>
              </div>

              {/* Email Input */}
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Your Email Address
                </label>
                <div className="input-wrapper">
                  <Mail className="input-icon" size={18} />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="form-input"
                    autoComplete="email"
                    disabled={isSubmitting || !!successMessage}
                  />
                </div>
              </div>

              {/* Role & Base Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Role Select */}
                <div className="form-group">
                  <label htmlFor="role" className="form-label">
                    Role
                  </label>
                  <div className="input-wrapper">
                    <Shield className="input-icon" size={18} />
                    <select
                      id="role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="form-input"
                      style={{ background: 'var(--bg-card, #0f172a)', cursor: 'pointer' }}
                      disabled={isSubmitting || !!successMessage}
                    >
                      <option value="admin">System Admin</option>
                      <option value="base_commander">Base Commander</option>
                      <option value="logistics_officer">Logistics Officer</option>
                    </select>
                  </div>
                </div>

                {/* Base Select */}
                <div className="form-group">
                  <label htmlFor="baseId" className="form-label">
                    Command Base
                  </label>
                  <div className="input-wrapper">
                    <Building2 className="input-icon" size={18} />
                    <select
                      id="baseId"
                      value={baseId}
                      onChange={(e) => setBaseId(e.target.value)}
                      className="form-input"
                      style={{ background: 'var(--bg-card, #0f172a)', cursor: 'pointer' }}
                      disabled={isSubmitting || !!successMessage}
                    >
                      {bases.length > 0 ? (
                        bases.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.code})
                          </option>
                        ))
                      ) : (
                        <option value="1">HQ Command Base</option>
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* Password Input */}
              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Password (min 8 chars)
                </label>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={18} />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="form-input"
                    disabled={isSubmitting || !!successMessage}
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

              {/* Confirm Password Input */}
              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">
                  Confirm Password
                </label>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={18} />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="form-input"
                    disabled={isSubmitting || !!successMessage}
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !!successMessage}
                className="submit-btn"
                style={{ marginTop: '0.5rem' }}
              >
                {isSubmitting ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            {/* Back to Login Link */}
            <div className="register-prompt" style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.875rem', color: '#94a3b8' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: '#38bdf8', fontWeight: 600, textDecoration: 'none' }}>
                Sign In
              </Link>
            </div>

            {/* Footer Notice */}
            <div className="login-card-footer" style={{ marginTop: '1.25rem' }}>
              <ShieldAlert size={14} className="notice-icon" />
              <span>Authorized personnel identity registration</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
