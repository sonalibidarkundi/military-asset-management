import React, { useState, useEffect } from 'react';
import { X, UserCheck, RotateCcw } from 'lucide-react';
import { assignmentsAPI } from '../../services/api';

export default function AssignmentDetailModal({
  isOpen,
  onClose,
  assignmentId,
  onReturnSuccess,
  isAuthorizedToReturn = false,
}) {
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isReturning, setIsReturning] = useState(false);

  useEffect(() => {
    if (!isOpen || !assignmentId) return;

    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await assignmentsAPI.getById(assignmentId);
        if (response.data && response.data.success) {
          setAssignment(response.data.data);
        } else {
          setError('Assignment record not found.');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load assignment details.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [isOpen, assignmentId]);

  if (!isOpen) return null;

  const formatDate = (d) => {
    if (!d) return 'N/A';
    try {
      return new Date(d).toISOString().split('T')[0];
    } catch {
      return String(d);
    }
  };

  const handleReturn = async () => {
    if (!window.confirm('Are you sure you want to return this assignment? Stock will be restored.')) return;
    setIsReturning(true);
    try {
      const response = await assignmentsAPI.returnAssignment(assignmentId);
      if (response.data && response.data.success) {
        if (onReturnSuccess) onReturnSuccess('Assignment returned successfully. Stock restored.');
        onClose();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to return assignment.');
    } finally {
      setIsReturning(false);
    }
  };

  const renderStatusBadge = (status) => {
    const s = String(status || '').toUpperCase();
    let badgeClass = 'badge-secondary';
    if (s === 'ACTIVE') badgeClass = 'badge-success';
    else if (s === 'RETURNED') badgeClass = 'badge-info';
    else if (s === 'CANCELLED') badgeClass = 'badge-danger';

    return <span className={`asset-status-badge ${badgeClass}`}>{s}</span>;
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container asset-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <UserCheck size={22} className="modal-header-icon" />
            <div>
              <h3>Assignment Record #{assignmentId}</h3>
              <p>Personnel Asset Assignment Specifications & History</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="modal-loading-state">
              <span>Loading assignment details from database...</span>
            </div>
          ) : error ? (
            <div className="table-empty text-amber">{error}</div>
          ) : (
            <div className="detail-spec-grid">
              <div className="spec-card">
                <span className="spec-label">Assignment ID</span>
                <span className="spec-value font-mono">#{assignment.id}</span>
              </div>
              <div className="spec-card">
                <span className="spec-label">Assignment Date</span>
                <span className="spec-value font-mono">{formatDate(assignment.assignment_date)}</span>
              </div>
              <div className="spec-card">
                <span className="spec-label">Status</span>
                <span className="spec-value">{renderStatusBadge(assignment.status)}</span>
              </div>
              <div className="spec-card">
                <span className="spec-label">Personnel Assigned</span>
                <span className="spec-value font-semibold">{assignment.personnel_name}</span>
              </div>
              <div className="spec-card">
                <span className="spec-label">Command Base</span>
                <span className="spec-value font-semibold">
                  {assignment.base_name} ({assignment.base_code})
                </span>
              </div>
              <div className="spec-card">
                <span className="spec-label">Asset ID</span>
                <span className="spec-value font-mono">#{assignment.asset_id}</span>
              </div>
              <div className="spec-card">
                <span className="spec-label">Serial Number</span>
                <span className="spec-value font-mono text-muted">{assignment.serial_number || 'N/A'}</span>
              </div>
              <div className="spec-card">
                <span className="spec-label">Equipment Name</span>
                <span className="spec-value font-semibold">{assignment.equipment_name}</span>
              </div>
              <div className="spec-card">
                <span className="spec-label">Category</span>
                <span className="spec-value">{assignment.category}</span>
              </div>
              <div className="spec-card">
                <span className="spec-label">Quantity Assigned</span>
                <span className="spec-value font-mono text-emerald">
                  {assignment.quantity?.toLocaleString()} {assignment.unit}
                </span>
              </div>
              <div className="spec-card">
                <span className="spec-label">Created By</span>
                <span className="spec-value">{assignment.created_by_name || 'System'}</span>
              </div>
              <div className="spec-card">
                <span className="spec-label">Created At</span>
                <span className="spec-value font-mono">{formatDate(assignment.created_at)}</span>
              </div>
              {assignment.purpose && (
                <div className="spec-card full-width">
                  <span className="spec-label">Assignment Purpose</span>
                  <span className="spec-value">{assignment.purpose}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {!loading && !error && assignment && assignment.status === 'ACTIVE' && isAuthorizedToReturn && (
          <div className="modal-footer">
            <button
              type="button"
              className="submit-btn"
              style={{ backgroundColor: 'var(--amber-500, #f59e0b)' }}
              onClick={handleReturn}
              disabled={isReturning}
            >
              <RotateCcw size={16} style={{ marginRight: '6px' }} />
              {isReturning ? 'Returning...' : 'Return Assignment'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
