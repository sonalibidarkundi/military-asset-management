import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Save, Plus } from 'lucide-react';

export default function AssetFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  bases = [],
  equipmentTypes = [],
  isBaseCommander = false,
  userBaseId = null,
}) {
  const [formData, setFormData] = useState({
    equipment_type_id: '',
    base_id: '',
    serial_number: '',
    quantity: 1,
    status: 'AVAILABLE',
  });

  const [errors, setErrors] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!initialData;

  useEffect(() => {
    if (initialData) {
      setFormData({
        equipment_type_id: initialData.equipment_type_id || '',
        base_id: initialData.base_id || (isBaseCommander ? String(userBaseId) : ''),
        serial_number: initialData.serial_number || '',
        quantity: initialData.quantity || 1,
        status: initialData.status || 'AVAILABLE',
      });
    } else {
      setFormData({
        equipment_type_id: '',
        base_id: isBaseCommander && userBaseId ? String(userBaseId) : '',
        serial_number: '',
        quantity: 1,
        status: 'AVAILABLE',
      });
    }
    setErrors('');
  }, [initialData, isOpen, isBaseCommander, userBaseId]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setErrors('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors('');

    // Validation
    if (!formData.equipment_type_id) {
      setErrors('Please select an Equipment Type.');
      return;
    }

    const effectiveBaseId = isBaseCommander && userBaseId ? String(userBaseId) : formData.base_id;
    if (!effectiveBaseId) {
      setErrors('Please select a Command Base.');
      return;
    }

    const numQty = parseInt(formData.quantity, 10);
    if (isNaN(numQty) || numQty <= 0) {
      setErrors('Quantity must be a positive integer greater than zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedEqId = parseInt(formData.equipment_type_id, 10);
      const parsedBaseId = parseInt(effectiveBaseId, 10);

      const payload = {
        equipment_type_id: !isNaN(parsedEqId) ? parsedEqId : (equipmentTypes[0]?.id || 1),
        base_id: !isNaN(parsedBaseId) ? parsedBaseId : (bases[0]?.id || 1),
        serial_number: formData.serial_number && formData.serial_number.trim() ? formData.serial_number.trim() : `SN-${Math.floor(1000 + Math.random() * 9000)}`,
        quantity: numQty || 1,
        status: formData.status || 'AVAILABLE',
      };

      await onSubmit(payload);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save asset. Please try again.';
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
            {isEditMode ? <Save size={20} className="modal-header-icon" /> : <Plus size={20} className="modal-header-icon" />}
            <div>
              <h3>{isEditMode ? `Edit Asset #${initialData.id}` : 'Add New Military Asset'}</h3>
              <p>{isEditMode ? 'Update asset specifications & status' : 'Register new inventory item into command database'}</p>
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
              {/* Equipment Type */}
              <div className="form-group">
                <label htmlFor="equipment_type_id" className="form-label required">
                  Equipment Type
                </label>
                <select
                  id="equipment_type_id"
                  name="equipment_type_id"
                  required
                  value={formData.equipment_type_id}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="">Select Equipment Type</option>
                  {equipmentTypes.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name} ({eq.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Base */}
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

              {/* Serial Number */}
              <div className="form-group">
                <label htmlFor="serial_number" className="form-label">
                  Serial Number / Code
                </label>
                <input
                  id="serial_number"
                  name="serial_number"
                  type="text"
                  placeholder="e.g. WPN-HQ-105"
                  value={formData.serial_number}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              {/* Quantity */}
              <div className="form-group">
                <label htmlFor="quantity" className="form-label required">
                  Quantity
                </label>
                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="1"
                  required
                  value={formData.quantity}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              {/* Status */}
              <div className="form-group full-width">
                <label htmlFor="status" className="form-label required">
                  Asset Status
                </label>
                <select
                  id="status"
                  name="status"
                  required
                  value={formData.status}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="AVAILABLE">AVAILABLE - In Depot / Store</option>
                  <option value="ASSIGNED">ASSIGNED - In Active Duty</option>
                  <option value="IN_TRANSIT">IN TRANSIT - Relocation Transfer</option>
                  <option value="EXPENDED">EXPENDED - Consumed / Written Off</option>
                </select>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="reset-filter-btn" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Register Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
