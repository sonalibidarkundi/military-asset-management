import React, { useState, useEffect } from 'react';
import { X, ArrowUpRight, ArrowDownLeft, ShoppingBag, ShieldCheck } from 'lucide-react';

export default function MovementDetails({ isOpen, onClose, details = {}, loading = false }) {
  const [activeTab, setActiveTab] = useState('purchases');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const purchases = details?.purchases || [];
  const transferIn = details?.transferIn || [];
  const transferOut = details?.transferOut || [];

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
      <div className="modal-container movement-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <ShieldCheck size={22} className="modal-header-icon" />
            <div>
              <h3>Net Movement Itemized Details</h3>
              <p>Itemized break-down of purchases, transfers in, and transfers out</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="modal-tabs">
          <button
            className={`tab-btn ${activeTab === 'purchases' ? 'active' : ''}`}
            onClick={() => setActiveTab('purchases')}
          >
            <ShoppingBag size={16} />
            <span>Purchases ({purchases.length})</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'transferIn' ? 'active' : ''}`}
            onClick={() => setActiveTab('transferIn')}
          >
            <ArrowDownLeft size={16} />
            <span>Transfer In ({transferIn.length})</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'transferOut' ? 'active' : ''}`}
            onClick={() => setActiveTab('transferOut')}
          >
            <ArrowUpRight size={16} />
            <span>Transfer Out ({transferOut.length})</span>
          </button>
        </div>

        {/* Modal Content Area */}
        <div className="modal-body">
          {loading ? (
            <div className="modal-loading-state">
              <span>Loading movement records from command database...</span>
            </div>
          ) : (
            <>
              {/* Tab 1: Purchases */}
              {activeTab === 'purchases' && (
                <div className="table-wrapper">
                  {purchases.length === 0 ? (
                    <div className="table-empty">No purchase records found.</div>
                  ) : (
                    <table className="details-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Base</th>
                          <th>Equipment Type</th>
                          <th>Quantity</th>
                          <th>Reference No.</th>
                          <th>Supplier</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchases.map((item) => (
                          <tr key={item.id}>
                            <td className="font-mono">{formatDate(item.date)}</td>
                            <td>{item.base_name || 'N/A'}</td>
                            <td className="font-semibold">{item.equipment_name || 'N/A'}</td>
                            <td className="font-mono text-emerald">{item.quantity?.toLocaleString()}</td>
                            <td className="font-mono text-muted">{item.reference_number || 'N/A'}</td>
                            <td>{item.supplier || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Tab 2: Transfer In */}
              {activeTab === 'transferIn' && (
                <div className="table-wrapper">
                  {transferIn.length === 0 ? (
                    <div className="table-empty">No transfer-in records found.</div>
                  ) : (
                    <table className="details-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Destination Base</th>
                          <th>From Origin</th>
                          <th>Equipment Type</th>
                          <th>Quantity</th>
                          <th>Reference No.</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transferIn.map((item) => (
                          <tr key={item.id}>
                            <td className="font-mono">{formatDate(item.date)}</td>
                            <td>{item.base_name || 'N/A'}</td>
                            <td className="text-muted">{item.from_base_name || 'N/A'}</td>
                            <td className="font-semibold">{item.equipment_name || 'N/A'}</td>
                            <td className="font-mono text-emerald">+{item.quantity?.toLocaleString()}</td>
                            <td className="font-mono text-muted">{item.reference_number || 'N/A'}</td>
                            <td>
                              <span className={`status-tag status-${(item.status || 'PENDING').toLowerCase()}`}>
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Tab 3: Transfer Out */}
              {activeTab === 'transferOut' && (
                <div className="table-wrapper">
                  {transferOut.length === 0 ? (
                    <div className="table-empty">No transfer-out records found.</div>
                  ) : (
                    <table className="details-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Origin Base</th>
                          <th>To Destination</th>
                          <th>Equipment Type</th>
                          <th>Quantity</th>
                          <th>Reference No.</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transferOut.map((item) => (
                          <tr key={item.id}>
                            <td className="font-mono">{formatDate(item.date)}</td>
                            <td>{item.base_name || 'N/A'}</td>
                            <td className="text-muted">{item.to_base_name || 'N/A'}</td>
                            <td className="font-semibold">{item.equipment_name || 'N/A'}</td>
                            <td className="font-mono text-amber">-{item.quantity?.toLocaleString()}</td>
                            <td className="font-mono text-muted">{item.reference_number || 'N/A'}</td>
                            <td>
                              <span className={`status-tag status-${(item.status || 'PENDING').toLowerCase()}`}>
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
