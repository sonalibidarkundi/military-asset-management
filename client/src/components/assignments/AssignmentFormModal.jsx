import React, { useState, useEffect } from 'react';
import { X, AlertCircle, UserCheck } from 'lucide-react';
import { assetsAPI } from '../../services/api';

export default function AssignmentFormModal({
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
    personnel_name: '',
    base_id: '',
    quantity: 1,
    assignment_date: getTodayDate(),
    purpose: '',
    status: 'ACTIVE',
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
        personnel_name: '',
        base_id: isBaseCommander && userBaseId ? String(userBaseId) : '',
        quantity: 1,
        assignment_date: getTodayDate(),
        purpose: '',
        status: 'ACTIVE',
      });
      setErrors('');
    }
  }, [isOpen, isBaseCommander, userBaseId]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // If changing asset, auto sync base_id if not set
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
      setErrors('Please select an Asset to assign.');
      return;
    }

    if (!formData.personnel_name.trim()) {
      setErrors('Personnel Name is required.');
      return;
    }

    const effectiveBaseId = isBaseCommander && userBaseId ? String(userBaseId) : formData.base_id;
    if (!effectiveBaseId) {
      setErrors('Command Base is required.');
      return;
    }

    const numQty = parseInt(formData.quantity, 10);
    if (isNaN(numQty) || numQty <= 0) {
      setErrors('Quantity must be a positive number greater than zero.');
      return;
    }

    if (selectedAsset && numQty > selectedAsset.quantity) {
      setErrors(`Insufficient available quantity for this asset. Only ${selectedAsset.quantity} available.`);
      return;
    }

    if (!formData.purpose.trim()) {
      setErrors('Assignment Purpose is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        asset_id: parseInt(formData.asset_id, 10),
        personnel_name: formData.personnel_name.trim(),
        base_id: parseInt(effectiveBaseId, 10),
        quantity: numQty,
        assignment_date: formData.assignment_date,
        purpose: formData.purpose.trim(),
        status: formData.status,
      };

      await onSubmit(payload);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Unable to create assignment.';
      setErrors(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container asset-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <UserCheck size={20} className="modal-header-icon" />
            <div>
              <h3>New Asset Assignment</h3>
              <p>Assign military equipment/assets to authorized personnel</p>
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
                  {!isBaseCommander && <option value="">All / Select Command Base</option>}
                  {bases.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Asset Dropdown */}
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

              {/* Personnel Name */}
              <div className="form-group">
                <label htmlFor="personnel_name" className="form-label required">
                  Personnel Name
                </label>
                <input
                  id="personnel_name"
                  name="personnel_name"
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={formData.personnel_name}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              {/* Quantity */}
              <div className="form-group">
                <label htmlFor="quantity" className="form-label required">
                  Quantity To Assign
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

              {/* Assignment Date */}
              <div className="form-group">
                <label htmlFor="assignment_date" className="form-label required">
                  Assignment Date
                </label>
                <input
                  id="assignment_date"
                  name="assignment_date"
                  type="date"
                  required
                  value={formData.assignment_date}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              {/* Status */}
              <div className="form-group">
                <label htmlFor="status" className="form-label required">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  required
                  value={formData.status}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="ACTIVE">Active</option>
                </select>
              </div>

              {/* Purpose */}
              <div className="form-group full-width">
                <label htmlFor="purpose" className="form-label required">
                  Operational Purpose / Deployment Details
                </label>
                <textarea
                  id="purpose"
                  name="purpose"
                  rows="3"
                  required
                  placeholder="e.g. Operational deployment for Border Patrol Duty"
                  value={formData.purpose}
                  onChange={handleChange}
                  className="form-input"
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="reset-filter-btn" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={isSubmitting || loadingAssets}>
              {isSubmitting ? 'Creating...' : 'Assign Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
