import React, { useState, useEffect } from 'react';
import { X, AlertCircle, TrendingDown } from 'lucide-react';
import { assetsAPI } from '../../services/api';

export default function ExpenditureFormModal({
  isOpen,
  onClose,
  onSubmit,
  bases = [],
  isBaseCommander = false,
  userBaseId = null,
}) {
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    asset_id: '',
    base_id: '',
    quantity: 1,
    expenditure_date: getTodayDate(),
    reason: 'Operational loss',
  });

  const [availableAssets, setAvailableAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [errors, setErrors] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch available assets when modal opens or selected base changes
  useEffect(() => {
    if (!isOpen) return;

    const fetchAssets = async () => {
      setLoadingAssets(true);
      try {
        const effectiveBaseId = isBaseCommander && userBaseId ? String(userBaseId) : formData.base_id;
        const params = {};
        if (effectiveBaseId) params.base_id = effectiveBaseId;

        const response = await assetsAPI.getAll(params);
        if (response.data && response.data.success) {
          // Filter assets with available quantity > 0
          setAvailableAssets(response.data.data.filter((a) => (a.quantity || 0) > 0));
        }
      } catch (err) {
        console.error('Failed to load available assets:', err);
      } finally {
        setLoadingAssets(false);
      }
    };

    fetchAssets();
  }, [isOpen, formData.base_id, isBaseCommander, userBaseId]);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        asset_id: '',
        base_id: isBaseCommander && userBaseId ? String(userBaseId) : '',
        quantity: 1,
        expenditure_date: getTodayDate(),
        reason: 'Operational loss',
      });
      setErrors('');
    }
  }, [isOpen, isBaseCommander, userBaseId]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;

    // If selecting asset, auto set base_id to match asset's base
    if (name === 'asset_id') {
      const selectedAsset = availableAssets.find((a) => String(a.id) === String(value));
      setFormData((prev) => ({
        ...prev,
        asset_id: value,
        base_id: selectedAsset ? String(selectedAsset.base_id) : prev.base_id,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
    setErrors('');
  };

  const selectedAsset = availableAssets.find((a) => String(a.id) === String(formData.asset_id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors('');

    if (!formData.asset_id) {
      setErrors('Please select an Asset.');
      return;
    }

    const effectiveBaseId = isBaseCommander && userBaseId ? String(userBaseId) : formData.base_id;
    if (!effectiveBaseId) {
      setErrors('Command Base is required.');
      return;
    }

    const numQty = parseInt(formData.quantity, 10);
    if (isNaN(numQty) || numQty <= 0) {
      setErrors('Quantity must be a positive integer greater than zero.');
      return;
    }

    if (selectedAsset && numQty > selectedAsset.quantity) {
      setErrors(`Insufficient available quantity for this expenditure. Only ${selectedAsset.quantity} available.`);
      return;
    }

    if (!formData.reason.trim()) {
      setErrors('Expenditure reason is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        asset_id: parseInt(formData.asset_id, 10),
        base_id: parseInt(effectiveBaseId, 10),
        quantity: numQty,
        expenditure_date: formData.expenditure_date,
        reason: formData.reason.trim(),
      };

      await onSubmit(payload);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Unable to record expenditure.';
      setErrors(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const REASON_OPTIONS = [
    'Operational loss',
    'Consumed during operation',
    'Damaged beyond repair',
    'Maintenance write-off',
    'Other',
  ];

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container asset-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <TrendingDown size={20} className="modal-header-icon" />
            <div>
              <h3>Record Expenditure</h3>
              <p>Log consumed, lost, or written-off military assets from active inventory</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errors && (
              <div className="login-error-banner" role="alert">
                <AlertCircle size={18} className="error-icon" />
                <span>{errors}</span>
              </div>
            )}

            <div className="form-grid">
              {/* Command Base */}
              <div className="form-group">
                <label htmlFor="base_id" className="form-label required">
                  Command Base
                </label>
                <select
                  id="base_id"
                  name="base_id"
                  required
                  value={isBaseCommander && userBaseId ? String(userBaseId) : formData.base_id}
                  onChange={handleChange}
                  disabled={isBaseCommander}
                  className="form-input"
                >
                  {!isBaseCommander && <option value="">Select Command Base</option>}
                  {bases.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Asset */}
              <div className="form-group">
                <label htmlFor="asset_id" className="form-label required">
                  Select Asset
                </label>
                <select
                  id="asset_id"
                  name="asset_id"
                  required
                  value={formData.asset_id}
                  onChange={handleChange}
                  className="form-input"
                  disabled={loadingAssets}
                >
                  <option value="">
                    {loadingAssets ? 'Loading available assets...' : 'Select Asset from Inventory'}
                  </option>
                  {availableAssets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.equipment_name} {a.serial_number ? `(${a.serial_number})` : `#${a.id}`} — {a.base_code} [Avail: {a.quantity}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div className="form-group">
                <label htmlFor="quantity" className="form-label required">
                  Quantity Expended
                </label>
                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="1"
                  max={selectedAsset ? selectedAsset.quantity : undefined}
                  required
                  value={formData.quantity}
                  onChange={handleChange}
                  className="form-input"
                />
                {selectedAsset && (
                  <span className="form-hint text-emerald">
                    Available in stock: {selectedAsset.quantity} {selectedAsset.unit || 'units'}
                  </span>
                )}
              </div>

              {/* Expenditure Date */}
              <div className="form-group">
                <label htmlFor="expenditure_date" className="form-label required">
                  Expenditure Date
                </label>
                <input
                  id="expenditure_date"
                  name="expenditure_date"
                  type="date"
                  required
                  value={formData.expenditure_date}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              {/* Reason Dropdown & Custom Text */}
              <div className="form-group full-width">
                <label htmlFor="reason" className="form-label required">
                  Reason for Expenditure / Loss
                </label>
                <select
                  id="reason"
                  name="reason"
                  required
                  value={formData.reason}
                  onChange={handleChange}
                  className="form-input"
                >
                  {REASON_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="reset-filter-btn" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={isSubmitting || loadingAssets}>
              {isSubmitting ? 'Recording...' : 'Record Expenditure'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
