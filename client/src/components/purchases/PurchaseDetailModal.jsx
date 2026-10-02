import React, { useState, useEffect } from 'react';
import { X, ShoppingBag } from 'lucide-react';
import { purchasesAPI } from '../../services/api';

export default function PurchaseDetailModal({ isOpen, onClose, purchaseId }) {
  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !purchaseId) return;

    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await purchasesAPI.getById(purchaseId);
        if (response.data && response.data.success) {
          setPurchase(response.data.data);
        } else {
          setError('Purchase record not found.');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load purchase details.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [isOpen, purchaseId]);

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
            <ShoppingBag size={22} className="modal-header-icon" />
            <div>
              <h3>Purchase Order #{purchaseId}</h3>
              <p>Procurement Transaction Log & Specifications</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="modal-loading-state">
              <span>Loading purchase details from database...</span>
            </div>
          ) : error ? (
            <div className="table-empty text-amber">{error}</div>
          ) : (
            <div className="detail-spec-grid">
              <div className="spec-card">
                <span className="spec-label">Purchase ID</span>
                <span className="spec-value font-mono">#{purchase.id}</span>
              </div>
              <div className="spec-card">
                <span className="spec-label">Purchase Date</span>
                <span className="spec-value font-mono">{formatDate(purchase.purchase_date)}</span>
              </div>
              <div className="spec-card">
                <span className="spec-label">Command Base</span>
                <span className="spec-value">{purchase.base_name} ({purchase.base_code})</span>
              </div>
              <div className="spec-card">
                <span className="spec-label">Equipment Name</span>
                <span className="spec-value font-semibold">{purchase.equipment_name}</span>
              </div>
              <div className="spec-card">
                <span className="spec-label">Category</span>
                <span className="spec-value">{purchase.category}</span>
              </div>
              <div className="spec-card">
                <span className="spec-label">Quantity Procured</span>
                <span className="spec-value font-mono text-emerald">+{purchase.quantity?.toLocaleString()} {purchase.unit}</span>
              </div>
              <div className="spec-card">
                <span className="spec-label">Supplier / Vendor</span>
                <span className="spec-value font-semibold">{purchase.supplier}</span>
              </div>
              <div className="spec-card">
                <span className="spec-label">Reference Number</span>
                <span className="spec-value font-mono text-muted">{purchase.reference_number}</span>
              </div>
              <div className="spec-card">
                <span className="spec-label">Created By</span>
                <span className="spec-value">{purchase.created_by_name || 'System'}</span>
              </div>
              <div className="spec-card">
                <span className="spec-label">Logged At</span>
                <span className="spec-value font-mono">{formatDate(purchase.created_at)}</span>
              </div>
              {purchase.notes && (
                <div className="spec-card full-width">
                  <span className="spec-label">Procurement Notes</span>
                  <span className="spec-value">{purchase.notes}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
