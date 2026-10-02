import React from 'react';
import { X, History, ShieldAlert } from 'lucide-react';

export default function AuditDetailModal({ isOpen, onClose, auditLog }) {
  if (!isOpen || !auditLog) return null;

  const formatDate = (d) => {
    if (!d) return 'N/A';
    try {
      const dateObj = new Date(d);
      return dateObj.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch {
      return String(d);
    }
  };

  const sanitizeDetails = (det) => {
    if (!det) return null;
    let obj = det;
    if (typeof det === 'string') {
      try {
        obj = JSON.parse(det);
      } catch {
        return det;
      }
    }
    if (typeof obj === 'object' && obj !== null) {
      const clean = { ...obj };
      delete clean.password;
      delete clean.password_hash;
      delete clean.token;
      delete clean.jwt;
      delete clean.secret;
      delete clean.authorization;
      return clean;
    }
    return obj;
  };

  const safeDetails = sanitizeDetails(auditLog.details);

  const getActionBadgeClass = (action) => {
    const act = String(action || '').toUpperCase();
    if (act.includes('CREATE') || act.includes('LOGIN') || act.includes('PURCHASE')) return 'badge-success';
    if (act.includes('UPDATE') || act.includes('ASSIGN') || act.includes('TRANSFER')) return 'badge-info';
    if (act.includes('DELETE') || act.includes('EXPEND')) return 'badge-danger';
    if (act.includes('RETURN')) return 'badge-warning';
    return 'badge-secondary';
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container asset-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <History size={22} className="modal-header-icon" />
            <div>
              <h3>Audit Log Record #{auditLog.id}</h3>
              <p>System Security Trail & Transaction Log Payload</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="detail-spec-grid">
            <div className="spec-card">
              <span className="spec-label">Audit Log ID</span>
              <span className="spec-value font-mono">#{auditLog.id}</span>
            </div>
            <div className="spec-card">
              <span className="spec-label">Timestamp</span>
              <span className="spec-value font-mono">{formatDate(auditLog.created_at)}</span>
            </div>
            <div className="spec-card">
              <span className="spec-label">User / Account</span>
              <span className="spec-value font-semibold">
                {auditLog.user_name || 'System'} {auditLog.user_email ? `(${auditLog.user_email})` : ''}
              </span>
            </div>
            <div className="spec-card">
              <span className="spec-label">Action Performed</span>
              <span className="spec-value">
                <span className={`asset-status-badge ${getActionBadgeClass(auditLog.action)}`}>
                  {auditLog.action}
                </span>
              </span>
            </div>
            <div className="spec-card">
              <span className="spec-label">Target Entity Type</span>
              <span className="spec-value font-mono text-emerald">{auditLog.entity_type}</span>
            </div>
            <div className="spec-card">
              <span className="spec-label">Target Entity ID</span>
              <span className="spec-value font-mono">
                {auditLog.entity_id !== null && auditLog.entity_id !== undefined ? `#${auditLog.entity_id}` : 'N/A'}
              </span>
            </div>
            <div className="spec-card full-width">
              <span className="spec-label">Client IP Address</span>
              <span className="spec-value font-mono text-muted">{auditLog.ip_address || '127.0.0.1'}</span>
            </div>

            {/* Formatted JSON Details */}
            <div className="spec-card full-width" style={{ marginTop: '8px' }}>
              <span className="spec-label flex-between">
                <span>Payload Details</span>
                <span className="text-muted font-mono" style={{ fontSize: '11px' }}>JSON payload</span>
              </span>
              <div
                style={{
                  backgroundColor: 'var(--slate-950, #090d16)',
                  border: '1px solid var(--slate-800, #1e293b)',
                  borderRadius: '6px',
                  padding: '12px',
                  marginTop: '6px',
                  maxHeight: '220px',
                  overflowY: 'auto',
                }}
              >
                <pre
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    color: '#38bdf8',
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
                  {typeof safeDetails === 'object'
                    ? JSON.stringify(safeDetails, null, 2)
                    : String(safeDetails || 'No details object recorded.')}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
