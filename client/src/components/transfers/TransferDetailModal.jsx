import React, { useState, useEffect } from 'react';
import { X, ArrowLeftRight } from 'lucide-react';
import { transfersAPI } from '../../services/api';

export default function TransferDetailModal({ isOpen, onClose, transferId }) {
  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !transferId) return;

    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await transfersAPI.getById(transferId);
        if (response.data && response.data.success) {
          setTransfer(response.data.data);
        } else {
          setError('Transfer record not found.');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load transfer details.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [isOpen, transferId]);

  if (!isOpen) return null;

  const formatDate = (d) => {
    if (!d) return 'N/A';
    try {
      return new Date(d).toISOString().split('T')[0];
    } catch {
      return String(d);
    }
  };

  const renderStatusBadge = (status) => {
    const s = String(status || '').toUpperCase();
    let badgeClass = 'badge-secondary';
    if (s === 'COMPLETED') badgeClass = 'badge-success';
    else if (s === 'IN_TRANSIT') badgeClass = 'badge-warning';
    else if (s === 'PENDING') badgeClass = 'badge-info';
    else if (s === 'CANCELLED') badgeClass = 'badge-danger';

    return <span className={`asset-status-badge ${badgeClass}`}>{s.replace('_', ' ')}</span>;
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container asset-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <ArrowLeftRight size={22} className="modal-header-icon" />
            <div>
              <h3>Transfer Order #{transferId}</h3>
              <p>Relocation Transaction Manifest & Details</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="modal-loading-state">
              <span>Loading transfer details from database...</span>
            </div>
          ) : error ? (
            <div className="table-empty text-amber">{error}</div>
          ) : (
            <div className="detail-spec-grid">
              <div className="spec-card">
                <span className="spec-label">Transfer ID</span>
                <span className="spec-value font-mono">#{transfer.id}</span>
              </div>
              <div className="spec-card">
                <span className="spec-label">Transfer Date</span>
                <span className="spec-value font-mono">{formatDate(transfer.transfer_date)}</span>
              </div>
              <div className="spec-card">
                <span className="spec-label">Status</span>
                <span className="spec-value">{renderStatusBadge(transfer.status)}</span>
              </div>
              <div className="spec-card">
                <span className="spec-label">Reference Number</span>
                <span className="spec-value font-mono text-muted">{transfer.reference_number}</span>
              </div>
              <div className="spec-card">
                <span className="spec-label">From Base (Source)</span>
                <span className="spec-value font-semibold">
                  {transfer.from_base_name} ({transfer.from_base_code})
                </span>
              </div>
              <div className="spec-card">
                <span className="spec-label">To Base (Destination)</span>
                <span className="spec-value font-semibold">
                  {transfer.to_base_name} ({transfer.to_base_code})
                </span>
              </div>
              <div className="spec-card">
                <span className="spec-label">Equipment Name</span>
                <span className="spec-value font-semibold">{transfer.equipment_name}</span>
              </div>
              <div className="spec-card">
                <span className="spec-label">Category</span>
                <span className="spec-value">{transfer.category}</span>
              </div>
              <div className="spec-card">
                <span className="spec-label">Quantity Transferred</span>
                <span className="spec-value font-mono text-emerald">
                  {transfer.quantity?.toLocaleString()} {transfer.unit}
                </span>
              </div>
              <div className="spec-card">
                <span className="spec-label">Created By</span>
                <span className="spec-value">{transfer.created_by_name || 'System'}</span>
              </div>
              <div className="spec-card full-width">
                <span className="spec-label">Created At</span>
                <span className="spec-value font-mono">{formatDate(transfer.created_at)}</span>
              </div>
              {transfer.notes && (
                <div className="spec-card full-width">
                  <span className="spec-label">Transfer Notes</span>
                  <span className="spec-value">{transfer.notes}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
