import React, { useState, useEffect } from 'react';
import { X, AlertCircle, ShoppingBag } from 'lucide-react';

export default function PurchaseFormModal({
  isOpen,
  onClose,
  onSubmit,
  bases = [],
  equipmentTypes = [],
  isBaseCommander = false,
  userBaseId = null,
}) {
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    purchase_date: getTodayDate(),
    base_id: '',
    equipment_type_id: '',
    quantity: 1,
    supplier: '',
    reference_number: '',
    notes: '',
  });

  const [errors, setErrors] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Auto-generate reference number example PO-2026-XXX
      const randomSeq = Math.floor(100 + Math.random() * 900);
      setFormData({
        purchase_date: getTodayDate(),
        base_id: isBaseCommander && userBaseId ? String(userBaseId) : (bases.length > 0 ? String(bases[0].id) : '1'),
        equipment_type_id: equipmentTypes.length > 0 ? String(equipmentTypes[0].id) : '1',
        quantity: 1,
        supplier: '',
        reference_number: `PO-2026-${randomSeq}`,
        notes: '',
      });
      setErrors('');
    }
  }, [isOpen, isBaseCommander, userBaseId, bases, equipmentTypes]);

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

    if (!formData.purchase_date) {
      setErrors('Please select a Purchase Date.');
      return;
    }

    const effectiveBaseId = isBaseCommander && userBaseId ? String(userBaseId) : formData.base_id;
    if (!effectiveBaseId) {
      setErrors('Please select a Command Base.');
      return;
    }

    if (!formData.equipment_type_id) {
      setErrors('Please select an Equipment Type.');
      return;
    }

    const numQty = parseInt(formData.quantity, 10);
    if (isNaN(numQty) || numQty <= 0) {
      setErrors('Quantity must be a positive integer greater than zero.');
      return;
    }

    if (!formData.supplier.trim()) {
      setErrors('Supplier name is required.');
      return;
    }

    if (!formData.reference_number.trim()) {
      setErrors('Reference number is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        purchase_date: formData.purchase_date,
        base_id: parseInt(effectiveBaseId, 10),
        equipment_type_id: parseInt(formData.equipment_type_id, 10),
        quantity: numQty,
        supplier: formData.supplier.trim(),
        reference_number: formData.reference_number.trim(),
        notes: formData.notes ? formData.notes.trim() : null,
      };

      await onSubmit(payload);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Unable to record purchase.';
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
            <ShoppingBag size={20} className="modal-header-icon" />
            <div>
              <h3>Record New Purchase</h3>
              <p>Register incoming inventory procurement into command database</p>
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
              {/* Purchase Date */}
              <div className="form-group">
                <label htmlFor="purchase_date" className="form-label required">
                  Purchase Date
                </label>
                <input
                  id="purchase_date"
                  name="purchase_date"
                  type="date"
                  required
                  value={formData.purchase_date}
                  onChange={handleChange}
                  className="form-input"
                />
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

              {/* Supplier */}
              <div className="form-group">
                <label htmlFor="supplier" className="form-label required">
                  Supplier / Vendor
                </label>
                <input
                  id="supplier"
                  name="supplier"
                  type="text"
                  required
                  placeholder="e.g. General Dynamics Corp"
                  value={formData.supplier}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              {/* Reference Number */}
              <div className="form-group">
                <label htmlFor="reference_number" className="form-label required">
                  Reference Number (PO / Order No.)
                </label>
                <input
                  id="reference_number"
                  name="reference_number"
                  type="text"
                  required
                  placeholder="e.g. PO-2026-001"
                  value={formData.reference_number}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              {/* Notes */}
              <div className="form-group full-width">
                <label htmlFor="notes" className="form-label">
                  Procurement Notes / Justification
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows="3"
                  placeholder="Add optional notes or shipment context..."
                  value={formData.notes}
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
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Recording...' : 'Record Purchase'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
