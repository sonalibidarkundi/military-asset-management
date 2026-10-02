import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authAPI } from '../services/api';
import { Shield, Lock, Mail, User, Building2, ShieldAlert, AlertCircle, CheckCircle2, Eye, EyeOff, UserCheck, Plus, X } from 'lucide-react';

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

  // New Organization modal state
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgCode, setOrgCode] = useState('');
  const [orgLocation, setOrgLocation] = useState('');
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [orgError, setOrgError] = useState('');

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

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    setOrgError('');

    if (!orgName.trim()) {
      setOrgError('Organization name is required.');
      return;
    }

    setIsCreatingOrg(true);

    try {
      const response = await authAPI.createBase({
        name: orgName.trim(),
        code: orgCode.trim(),
        location: orgLocation.trim(),
      });

      if (response.data && response.data.base) {
        const newOrg = response.data.base;
        setBases((prev) => [...prev, newOrg]);
        setBaseId(newOrg.id.toString());
        setShowOrgModal(false);
        setOrgName('');
        setOrgCode('');
        setOrgLocation('');
      } else {
        setOrgError('Failed to create organization.');
      }
    } catch (err) {
      console.error('Error creating organization:', err);
      setOrgError(err.response?.data?.message || 'Failed to create organization.');
    } finally {
      setIsCreatingOrg(false);
    }
  };

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

        if (response.data.token && response.data.user) {
          localStorage.setItem('aegis_token', response.data.token);
          localStorage.setItem('aegis_user', JSON.stringify(response.data.user));
          setTimeout(() => {
            window.location.href = '/';
          }, 1200);
        } else {
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
                  <span className="metric-title">ORGANIZATION</span>
                  <span className="metric-val">MULTI-BASE</span>
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
          <div className="login-card" style={{ maxWidth: '500px' }}>
            <div className="login-card-header">
              <div className="card-brand-logo">
                <UserCheck className="brand-shield" size={28} />
              </div>
              <h2 className="card-heading">AEGIS MAMS</h2>
              <h3 className="card-subheading">Create Account</h3>
              <p className="card-subtitle">Set up your profile with your email ID & Organization</p>
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

                {/* Base / Organization Select */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label htmlFor="baseId" className="form-label" style={{ marginBottom: 0 }}>
                      Organization / Base
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowOrgModal(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#38bdf8',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                        padding: 0,
                      }}
                    >
                      <Plus size={12} /> New
                    </button>
                  </div>
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

      {/* Create Organization Modal */}
      {showOrgModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(11, 15, 25, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '12px',
              padding: '1.75rem',
              width: '100%',
              maxWidth: '420px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={20} style={{ color: '#38bdf8' }} />
                <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.1rem', fontWeight: 700 }}>
                  Create Organization / Base
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowOrgModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {orgError && (
              <div
                style={{
                  background: '#451a03',
                  color: '#fde047',
                  border: '1px solid #b45309',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  fontSize: '0.825rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <AlertCircle size={16} />
                <span>{orgError}</span>
              </div>
            )}

            <form onSubmit={handleCreateOrg}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Organization Name</label>
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Strategic Defense Command"
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">Org Code (optional)</label>
                  <input
                    type="text"
                    value={orgCode}
                    onChange={(e) => setOrgCode(e.target.value)}
                    placeholder="e.g. SDC-01"
                    className="form-input"
                    style={{ width: '100%' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Location (optional)</label>
                  <input
                    type="text"
                    value={orgLocation}
                    onChange={(e) => setOrgLocation(e.target.value)}
                    placeholder="e.g. Sector 7 Command"
                    className="form-input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowOrgModal(false)}
                  className="btn"
                  style={{
                    background: '#334155',
                    color: '#f8fafc',
                    padding: '0.6rem 1.25rem',
                    borderRadius: '6px',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingOrg}
                  style={{
                    background: '#0284c7',
                    color: '#ffffff',
                    padding: '0.6rem 1.25rem',
                    borderRadius: '6px',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {isCreatingOrg ? 'Creating...' : 'Save Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
