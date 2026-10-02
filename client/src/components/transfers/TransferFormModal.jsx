import React, { useState, useEffect } from 'react';
import { X, AlertCircle, ArrowLeftRight } from 'lucide-react';

export default function TransferFormModal({
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
    transfer_date: getTodayDate(),
    from_base_id: '',
    to_base_id: '',
    equipment_type_id: '',
    quantity: 1,
    status: 'COMPLETED',
    reference_number: '',
    notes: '',
  });

  const [errors, setErrors] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const randomSeq = Math.floor(1000 + Math.random() * 9000);
      setFormData({
        transfer_date: getTodayDate(),
        from_base_id: isBaseCommander && userBaseId ? String(userBaseId) : '',
        to_base_id: '',
        equipment_type_id: '',
        quantity: 1,
        status: 'COMPLETED',
        reference_number: `TR-2026-${randomSeq}`,
        notes: '',
      });
      setErrors('');
    }
  }, [isOpen, isBaseCommander, userBaseId]);

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

    if (!formData.transfer_date) {
      setErrors('Transfer date is required.');
      return;
    }

    const effectiveFromBase = isBaseCommander && userBaseId ? String(userBaseId) : formData.from_base_id;
    if (!effectiveFromBase) {
      setErrors('From Base (Source Base) is required.');
      return;
    }

    if (!formData.to_base_id) {
      setErrors('To Base (Destination Base) is required.');
      return;
    }

    if (String(effectiveFromBase) === String(formData.to_base_id)) {
      setErrors('From Base and To Base cannot be the same base.');
      return;
    }

    if (!formData.equipment_type_id) {
      setErrors('Equipment Type is required.');
      return;
    }

    const numQty = parseInt(formData.quantity, 10);
    if (isNaN(numQty) || numQty <= 0) {
      setErrors('Quantity must be a numeric value greater than 0.');
      return;
    }

    if (!formData.status) {
      setErrors('Status is required.');
      return;
    }

    if (!formData.reference_number.trim()) {
      setErrors('Reference number cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        transfer_date: formData.transfer_date,
        from_base_id: parseInt(effectiveFromBase, 10),
        to_base_id: parseInt(formData.to_base_id, 10),
        equipment_type_id: parseInt(formData.equipment_type_id, 10),
        quantity: numQty,
        status: formData.status,
        reference_number: formData.reference_number.trim(),
        notes: formData.notes ? formData.notes.trim() : null,
      };

      await onSubmit(payload);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Unable to create transfer.';
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
            <ArrowLeftRight size={20} className="modal-header-icon" />
            <div>
              <h3>New Transfer</h3>
              <p>Relocate equipment and assets between command bases</p>
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
              {/* Transfer Date */}
              <div className="form-group">
                <label htmlFor="transfer_date" className="form-label required">
                  Transfer Date
                </label>
                <input
                  id="transfer_date"
                  name="transfer_date"
                  type="date"
                  required
                  value={formData.transfer_date}
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
                  <option value="COMPLETED">Completed</option>
                  <option value="IN_TRANSIT">In Transit</option>
                  <option value="PENDING">Pending</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              {/* From Base */}
              <div className="form-group">
                <label htmlFor="from_base_id" className="form-label required">
                  From Base (Source)
                </label>
                <select
                  id="from_base_id"
                  name="from_base_id"
                  required
                  value={isBaseCommander && userBaseId ? String(userBaseId) : formData.from_base_id}
                  onChange={handleChange}
                  disabled={isBaseCommander}
                  className="form-input"
                >
                  {!isBaseCommander && <option value="">Select Source Base</option>}
                  {bases.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* To Base */}
              <div className="form-group">
                <label htmlFor="to_base_id" className="form-label required">
                  To Base (Destination)
                </label>
                <select
                  id="to_base_id"
                  name="to_base_id"
                  required
                  value={formData.to_base_id}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="">Select Destination Base</option>
                  {bases
                    .filter((b) => String(b.id) !== String(isBaseCommander && userBaseId ? userBaseId : formData.from_base_id))
                    .map((b) => (
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

              {/* Reference Number */}
              <div className="form-group full-width">
                <label htmlFor="reference_number" className="form-label required">
                  Reference Number
                </label>
                <input
                  id="reference_number"
                  name="reference_number"
                  type="text"
                  required
                  placeholder="e.g. TR-2026-001"
                  value={formData.reference_number}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              {/* Notes */}
              <div className="form-group full-width">
                <label htmlFor="notes" className="form-label">
                  Notes / Transfer Context
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows="3"
                  placeholder="Add operational reason, vehicle dispatch ID, or authorization notes..."
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
              {isSubmitting ? 'Recording...' : 'Create Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
