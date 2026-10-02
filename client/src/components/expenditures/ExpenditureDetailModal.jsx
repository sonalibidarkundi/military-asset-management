import React, { useState, useEffect } from 'react';
import { X, TrendingDown } from 'lucide-react';
import { expendituresAPI } from '../../services/api';

export default function ExpenditureDetailModal({ isOpen, onClose, expenditureId }) {
  const [expenditure, setExpenditure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !expenditureId) return;

    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await expendituresAPI.getById(expenditureId);
        if (response.data && response.data.success) {
          setExpenditure(response.data.data);
        } else {
          setError('Expenditure record not found.');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load expenditure details.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [isOpen, expenditureId]);

  if (!isOpen) return null;

  const formatDate = (d) => {
    if (!d) return 'N/A';
    try {
      return new Date(d).toISOString().split('T')[0];
    } catch {
      return String(d);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container asset-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <TrendingDown size={22} className="modal-header-icon" />
            <div>
              <h3>Expenditure Record #{expenditureId}</h3>
              <p>Asset Consumption & Expenditure Manifest</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="modal-loading-state">
              <span>Loading expenditure details from database...</span>
            </div>
          ) : error ? (
            <div className="table-empty text-amber">{error}</div>
          ) : (
            <div className="detail-spec-grid">
              <div className="spec-card">
                <span className="spec-label">Expenditure ID</span>
                <span className="spec-value font-mono">#{expenditure.id}</span>
              </div>
              <div className="spec-card">
                <span className="spec-label">Expenditure Date</span>
                <span className="spec-value font-mono">{formatDate(expenditure.expenditure_date)}</span>
              </div>
              <div className="spec-card">
                <span className="spec-label">Command Base</span>
                <span className="spec-value font-semibold">
                  {expenditure.base_name} ({expenditure.base_code})
                </span>
              </div>
              <div className="spec-card">
                <span className="spec-label">Asset ID</span>
                <span className="spec-value font-mono">#{expenditure.asset_id}</span>
              </div>
              <div className="spec-card">
                <span className="spec-label">Serial Number</span>
                <span className="spec-value font-mono text-muted">{expenditure.serial_number || 'N/A'}</span>
              </div>
              <div className="spec-card">
                <span className="spec-label">Equipment Name</span>
                <span className="spec-value font-semibold">{expenditure.equipment_name}</span>
              </div>
              <div className="spec-card">
                <span className="spec-label">Category</span>
                <span className="spec-value">{expenditure.category}</span>
              </div>
              <div className="spec-card">
                <span className="spec-label">Quantity Expended</span>
                <span className="spec-value font-mono text-amber">
                  -{expenditure.quantity?.toLocaleString()} {expenditure.unit}
                </span>
              </div>
              <div className="spec-card">
                <span className="spec-label">Created By</span>
                <span className="spec-value">{expenditure.created_by_name || 'System'}</span>
              </div>
              <div className="spec-card">
                <span className="spec-label">Logged At</span>
                <span className="spec-value font-mono">{formatDate(expenditure.created_at)}</span>
              </div>
              {expenditure.reason && (
                <div className="spec-card full-width">
                  <span className="spec-label">Reason / Write-off Context</span>
                  <span className="spec-value">{expenditure.reason}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
