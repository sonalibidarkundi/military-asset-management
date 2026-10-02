import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, ArrowDownLeft, ArrowUpRight, UserCheck, Flame, ShieldCheck } from 'lucide-react';
import { purchasesAPI, transfersAPI, assignmentsAPI, expendituresAPI } from '../../services/api';

export default function ReportDetailsModal({ isOpen, onClose, category, filters }) {
  const [activeTab, setActiveTab] = useState(category || 'Purchases');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setActiveTab(category || 'Purchases');
  }, [category]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setData([]);

      const queryParams = {};
      if (filters?.date_from) queryParams.date_from = filters.date_from;
      if (filters?.date_to) queryParams.date_to = filters.date_to;
      if (filters?.base_id) queryParams.base_id = filters.base_id;
      if (filters?.equipment_type_id) queryParams.equipment_type_id = filters.equipment_type_id;

      try {
        let response;
        if (activeTab === 'Purchases') {
          response = await purchasesAPI.getAll(queryParams);
        } else if (activeTab === 'Transfer In') {
          response = await transfersAPI.getAll({ ...queryParams, to_base_id: queryParams.base_id });
        } else if (activeTab === 'Transfer Out') {
          response = await transfersAPI.getAll({ ...queryParams, from_base_id: queryParams.base_id });
        } else if (activeTab === 'Assigned') {
          response = await assignmentsAPI.getAll({ ...queryParams, status: 'ACTIVE' });
        } else if (activeTab === 'Expended') {
          response = await expendituresAPI.getAll(queryParams);
        }

        if (response && response.data && response.data.success) {
          setData(response.data.data || []);
        } else {
          setError('Failed to fetch detailed records.');
        }
      } catch (err) {
        console.error('Fetch report detail error:', err);
        setError('Error loading detail records.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, activeTab, filters]);

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
      <div className="modal-container movement-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <ShieldCheck size={22} className="modal-header-icon" />
            <div>
              <h3>Report Records: {activeTab}</h3>
              <p>Underlying PostgreSQL transactions matching active filters</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="modal-tabs">
          <button
            className={`tab-btn ${activeTab === 'Purchases' ? 'active' : ''}`}
            onClick={() => setActiveTab('Purchases')}
          >
            <ShoppingBag size={16} />
            <span>Purchases</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'Transfer In' ? 'active' : ''}`}
            onClick={() => setActiveTab('Transfer In')}
          >
            <ArrowDownLeft size={16} />
            <span>Transfer In</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'Transfer Out' ? 'active' : ''}`}
            onClick={() => setActiveTab('Transfer Out')}
          >
            <ArrowUpRight size={16} />
            <span>Transfer Out</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'Assigned' ? 'active' : ''}`}
            onClick={() => setActiveTab('Assigned')}
          >
            <UserCheck size={16} />
            <span>Assigned</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'Expended' ? 'active' : ''}`}
            onClick={() => setActiveTab('Expended')}
          >
            <Flame size={16} />
            <span>Expended</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="modal-body">
          {loading ? (
            <div className="modal-loading-state">
              <span>Loading matching records from database...</span>
            </div>
          ) : error ? (
            <div className="modal-loading-state text-red-500">{error}</div>
          ) : (
            <div className="table-wrapper">
              {data.length === 0 ? (
                <div className="table-empty">No matching records found for {activeTab}.</div>
              ) : (
                <table className="details-table">
                  <thead>
                    {activeTab === 'Purchases' && (
                      <tr>
                        <th>Date</th>
                        <th>Base</th>
                        <th>Equipment Type</th>
                        <th>Quantity</th>
                        <th>Supplier</th>
                        <th>Reference No.</th>
                      </tr>
                    )}
                    {(activeTab === 'Transfer In' || activeTab === 'Transfer Out') && (
                      <tr>
                        <th>Date</th>
                        <th>From Base</th>
                        <th>To Base</th>
                        <th>Equipment Type</th>
                        <th>Quantity</th>
                        <th>Status</th>
                        <th>Reference No.</th>
                      </tr>
                    )}
                    {activeTab === 'Assigned' && (
                      <tr>
                        <th>Date</th>
                        <th>Personnel Name</th>
                        <th>Base</th>
                        <th>Equipment Type</th>
                        <th>Quantity</th>
                        <th>Purpose</th>
                        <th>Status</th>
                      </tr>
                    )}
                    {activeTab === 'Expended' && (
                      <tr>
                        <th>Date</th>
                        <th>Base</th>
                        <th>Equipment Type</th>
                        <th>Quantity</th>
                        <th>Reason</th>
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {activeTab === 'Purchases' &&
                      data.map((item) => (
                        <tr key={item.id}>
                          <td className="font-mono">{formatDate(item.purchase_date)}</td>
                          <td>{item.base_name} ({item.base_code})</td>
                          <td className="font-semibold">{item.equipment_name}</td>
                          <td className="font-mono font-bold text-emerald">+{item.quantity} {item.unit}</td>
                          <td>{item.supplier}</td>
                          <td className="font-mono text-muted">{item.reference_number}</td>
                        </tr>
                      ))}

                    {(activeTab === 'Transfer In' || activeTab === 'Transfer Out') &&
                      data.map((item) => (
                        <tr key={item.id}>
                          <td className="font-mono">{formatDate(item.transfer_date)}</td>
                          <td>{item.from_base_name}</td>
                          <td>{item.to_base_name}</td>
                          <td className="font-semibold">{item.equipment_name}</td>
                          <td className="font-mono font-bold">{item.quantity} {item.unit}</td>
                          <td><span className="badge badge-blue">{item.status}</span></td>
                          <td className="font-mono text-muted">{item.reference_number}</td>
                        </tr>
                      ))}

                    {activeTab === 'Assigned' &&
                      data.map((item) => (
                        <tr key={item.id}>
                          <td className="font-mono">{formatDate(item.assignment_date)}</td>
                          <td className="font-semibold">{item.personnel_name}</td>
                          <td>{item.base_name}</td>
                          <td>{item.equipment_name}</td>
                          <td className="font-mono font-bold">{item.quantity} {item.unit}</td>
                          <td>{item.purpose}</td>
                          <td><span className="badge badge-green">{item.status}</span></td>
                        </tr>
                      ))}

                    {activeTab === 'Expended' &&
                      data.map((item) => (
                        <tr key={item.id}>
                          <td className="font-mono">{formatDate(item.expenditure_date)}</td>
                          <td>{item.base_name}</td>
                          <td className="font-semibold">{item.equipment_name}</td>
                          <td className="font-mono font-bold text-red-500">-{item.quantity} {item.unit}</td>
                          <td>{item.reason}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
