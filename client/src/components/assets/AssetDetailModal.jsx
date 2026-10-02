import React, { useState, useEffect } from 'react';
import { X, Shield, Package, Calendar, MapPin, Hash, Activity, Clock } from 'lucide-react';
import { assetsAPI } from '../../services/api';

export default function AssetDetailModal({ isOpen, onClose, assetId }) {
  const [assetData, setAssetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    if (!isOpen || !assetId) return;

    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await assetsAPI.getById(assetId);
        if (response.data && response.data.success) {
          setAssetData(response.data.data);
        } else {
          setError('Asset record not found.');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load asset details.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [isOpen, assetId]);

  if (!isOpen) return null;

  const formatDate = (d) => {
    if (!d) return 'N/A';
    try {
      return new Date(d).toISOString().split('T')[0];
    } catch {
      return String(d);
    }
  };

  const assignments = assetData?.assignments || [];
  const expenditures = assetData?.expenditures || [];
  const transfers = assetData?.transfers || [];

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container asset-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <Shield size={22} className="modal-header-icon" />
            <div>
              <h3>Asset #{assetId} Specification & History</h3>
              <p>Command Inventory Audit & Movement Log</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="modal-loading-state">
            <span>Loading asset record from command database...</span>
          </div>
        ) : error ? (
          <div className="table-empty text-amber">{error}</div>
        ) : (
          <>
            {/* Modal Tabs */}
            <div className="modal-tabs">
              <button
                className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
                onClick={() => setActiveTab('info')}
              >
                <Package size={16} />
                <span>Specification</span>
              </button>
              <button
                className={`tab-btn ${activeTab === 'assignments' ? 'active' : ''}`}
                onClick={() => setActiveTab('assignments')}
              >
                <Activity size={16} />
                <span>Assignments ({assignments.length})</span>
              </button>
              <button
                className={`tab-btn ${activeTab === 'expenditures' ? 'active' : ''}`}
                onClick={() => setActiveTab('expenditures')}
              >
                <Clock size={16} />
                <span>Expenditures ({expenditures.length})</span>
              </button>
              <button
                className={`tab-btn ${activeTab === 'transfers' ? 'active' : ''}`}
                onClick={() => setActiveTab('transfers')}
              >
                <MapPin size={16} />
                <span>Transfers ({transfers.length})</span>
              </button>
            </div>

            <div className="modal-body">
              {/* Tab 1: Info */}
              {activeTab === 'info' && (
                <div className="detail-spec-grid">
                  <div className="spec-card">
                    <span className="spec-label">Asset ID</span>
                    <span className="spec-value font-mono">#{assetData.id}</span>
                  </div>
                  <div className="spec-card">
                    <span className="spec-label">Equipment Name</span>
                    <span className="spec-value font-semibold">{assetData.equipment_name}</span>
                  </div>
                  <div className="spec-card">
                    <span className="spec-label">Category</span>
                    <span className="spec-value">{assetData.category}</span>
                  </div>
                  <div className="spec-card">
                    <span className="spec-label">Command Base</span>
                    <span className="spec-value">{assetData.base_name} ({assetData.base_code})</span>
                  </div>
                  <div className="spec-card">
                    <span className="spec-label">Serial Number</span>
                    <span className="spec-value font-mono">{assetData.serial_number || 'N/A'}</span>
                  </div>
                  <div className="spec-card">
                    <span className="spec-label">Quantity Available</span>
                    <span className="spec-value font-mono text-emerald">{assetData.quantity?.toLocaleString()} {assetData.unit}</span>
                  </div>
                  <div className="spec-card">
                    <span className="spec-label">Status</span>
                    <span className={`status-tag status-${(assetData.status || 'AVAILABLE').toLowerCase()}`}>
                      {assetData.status}
                    </span>
                  </div>
                  <div className="spec-card">
                    <span className="spec-label">Created Date</span>
                    <span className="spec-value font-mono">{formatDate(assetData.created_at)}</span>
                  </div>
                </div>
              )}

              {/* Tab 2: Assignments */}
              {activeTab === 'assignments' && (
                <div className="table-wrapper">
                  {assignments.length === 0 ? (
                    <div className="table-empty">No active or historical personnel assignments for this asset.</div>
                  ) : (
                    <table className="details-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Personnel Name</th>
                          <th>Quantity</th>
                          <th>Purpose</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignments.map((asn) => (
                          <tr key={asn.id}>
                            <td className="font-mono">{formatDate(asn.assignment_date)}</td>
                            <td className="font-semibold">{asn.personnel_name}</td>
                            <td className="font-mono">{asn.quantity}</td>
                            <td>{asn.purpose}</td>
                            <td>
                              <span className={`status-tag status-${(asn.status || 'ACTIVE').toLowerCase()}`}>
                                {asn.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Tab 3: Expenditures */}
              {activeTab === 'expenditures' && (
                <div className="table-wrapper">
                  {expenditures.length === 0 ? (
                    <div className="table-empty">No expenditure or consumption logs for this asset.</div>
                  ) : (
                    <table className="details-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Quantity Expended</th>
                          <th>Reason / Training Event</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenditures.map((exp) => (
                          <tr key={exp.id}>
                            <td className="font-mono">{formatDate(exp.expenditure_date)}</td>
                            <td className="font-mono text-amber">-{exp.quantity}</td>
                            <td>{exp.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Tab 4: Transfers */}
              {activeTab === 'transfers' && (
                <div className="table-wrapper">
                  {transfers.length === 0 ? (
                    <div className="table-empty">No transfer logs for this equipment type at this base.</div>
                  ) : (
                    <table className="details-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>From Base</th>
                          <th>To Base</th>
                          <th>Quantity</th>
                          <th>Reference No.</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transfers.map((tr) => (
                          <tr key={tr.id}>
                            <td className="font-mono">{formatDate(tr.transfer_date)}</td>
                            <td>{tr.from_base_name}</td>
                            <td>{tr.to_base_name}</td>
                            <td className="font-mono">{tr.quantity}</td>
                            <td className="font-mono text-muted">{tr.reference_number}</td>
                            <td>
                              <span className={`status-tag status-${(tr.status || 'PENDING').toLowerCase()}`}>
                                {tr.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
