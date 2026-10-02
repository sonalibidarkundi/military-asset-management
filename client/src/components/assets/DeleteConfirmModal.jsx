import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function DeleteConfirmModal({ isOpen, onClose, onConfirm, asset }) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !asset) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(asset.id);
      onClose();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container delete-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header header-danger">
          <div className="modal-title-group">
            <AlertTriangle size={22} className="modal-header-icon text-danger" />
            <div>
              <h3>Confirm Delete Asset</h3>
              <p>Irreversible Inventory Removal</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body text-center">
          <p className="delete-confirm-text">
            Are you sure you want to delete this asset?
          </p>

          <div className="delete-asset-summary font-mono">
            <div><strong>Asset ID:</strong> #{asset.id}</div>
            <div><strong>Equipment:</strong> {asset.equipment_name}</div>
            <div><strong>Base:</strong> {asset.base_name}</div>
            {asset.serial_number && <div><strong>Serial:</strong> {asset.serial_number}</div>}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="reset-filter-btn" onClick={onClose} disabled={isDeleting}>
            Cancel
          </button>
          <button type="button" className="retry-btn" onClick={handleConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete Asset'}
          </button>
        </div>
      </div>
    </div>
  );
}
