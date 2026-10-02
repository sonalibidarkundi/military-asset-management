import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { transfersAPI, dashboardAPI } from '../services/api';
import TransferFormModal from '../components/transfers/TransferFormModal';
import TransferDetailModal from '../components/transfers/TransferDetailModal';
import {
  Plus,
  Search,
  Filter,
  RefreshCw,
  Eye,
  AlertCircle,
  CheckCircle2,
  Building2,
  Boxes,
  Calendar,
  ArrowLeftRight,
} from 'lucide-react';

export default function Transfers() {
  const { user } = useAuth();

  const [transfers, setTransfers] = useState([]);
  const [bases, setBases] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);

  const isBaseCommander = user?.role === 'base_commander';
  const isAuthorizedToCreate = user?.role === 'admin' || user?.role === 'logistics_officer' || isBaseCommander;

  const [filters, setFilters] = useState({
    search: '',
    date: '',
    fromBaseId: isBaseCommander && user?.base_id ? String(user.base_id) : '',
    toBaseId: '',
    equipmentTypeId: '',
    status: '',
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [detailTransferId, setDetailTransferId] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Fetch Dropdown Filter Options (Bases & Equipment Types)
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const response = await dashboardAPI.getFilters();
        if (response.data && response.data.success) {
          setBases(response.data.bases || []);
          setEquipmentTypes(response.data.equipmentTypes || []);
        }
      } catch (err) {
        console.error('Failed to load transfer filter options:', err);
      }
    };
    fetchFilters();
  }, []);

  // Fetch Transfers List from API
  const loadTransfers = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = {};
    if (filters.search) params.search = filters.search;
    if (filters.date) params.date = filters.date;
    if (filters.fromBaseId) params.from_base_id = filters.fromBaseId;
    if (filters.toBaseId) params.to_base_id = filters.toBaseId;
    if (filters.equipmentTypeId) params.equipment_type_id = filters.equipmentTypeId;
    if (filters.status) params.status = filters.status;

    try {
      const response = await transfersAPI.getAll(params);
      if (response.data && response.data.success) {
        setTransfers(response.data.data || []);
      } else {
        setError('Unable to load transfers.');
      }
    } catch (err) {
      console.error('Fetch transfers error:', err);
      setError(err.response?.data?.message || 'Unable to load transfers.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadTransfers();
  }, [loadTransfers]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      date: '',
      fromBaseId: isBaseCommander && user?.base_id ? String(user.base_id) : '',
      toBaseId: '',
      equipmentTypeId: '',
      status: '',
    });
  };

  const showToast = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  // Record Transfer Submit
  const handleRecordSubmit = async (formData) => {
    const response = await transfersAPI.create(formData);
    if (response.data && response.data.success) {
      showToast('Transfer completed successfully. Inventory movement recorded across bases.');
      loadTransfers();
    }
  };

  const handleOpenDetailModal = (id) => {
    setDetailTransferId(id);
    setIsDetailOpen(true);
  };

  const formatDate = (d) => {
    if (!d) return 'N/A';
    try {
      return new Date(d).toISOString().split('T')[0];
    } catch {
      return String(d);
    }
  };

  const renderStatusBadge = (status) => {
    const s = String(status || '').toUpperCase();
    let badgeClass = 'badge-secondary';
    if (s === 'COMPLETED') badgeClass = 'badge-success';
    else if (s === 'IN_TRANSIT') badgeClass = 'badge-warning';
    else if (s === 'PENDING') badgeClass = 'badge-info';
    else if (s === 'CANCELLED') badgeClass = 'badge-danger';

    return <span className={`asset-status-badge ${badgeClass}`}>{s.replace('_', ' ')}</span>;
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header flex-between">
        <div>
          <h2 className="page-title">Inter-Base Transfers</h2>
          <p className="page-subtitle">Equipment & Asset Relocation History Across Military Command Bases</p>
        </div>

        <div className="flex-gap">
          <button className="icon-btn refresh-btn" onClick={loadTransfers} title="Refresh Transfers History">
            <RefreshCw size={18} className={loading ? 'spin' : ''} />
          </button>

          {isAuthorizedToCreate && (
            <button className="submit-btn add-asset-btn" onClick={() => setIsFormOpen(true)}>
              <Plus size={18} />
              <span>New Transfer</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Banner */}
      {successMessage && (
        <div className="dashboard-info-card success-banner" role="status">
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="filters-bar-card">
        <div className="filters-title">
          <Filter size={16} />
          <span>SEARCH & FILTER TRANSFERS</span>
        </div>

        <div className="filters-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr) auto' }}>
          {/* Search Field */}
          <div className="filter-group">
            <label htmlFor="search-transfer">
              <Search size={14} />
              <span>Search Transfers</span>
            </label>
            <input
              id="search-transfer"
              type="text"
              placeholder="Ref No, Equipment..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="filter-input width-full"
            />
          </div>

          {/* Date Filter */}
          <div className="filter-group">
            <label htmlFor="filter-transfer-date">
              <Calendar size={14} />
              <span>Transfer Date</span>
            </label>
            <input
              id="filter-transfer-date"
              type="date"
              value={filters.date}
              onChange={(e) => handleFilterChange('date', e.target.value)}
              className="filter-input width-full"
            />
          </div>

          {/* From Base Filter */}
          <div className="filter-group">
            <label htmlFor="filter-from-base">
              <Building2 size={14} />
              <span>From Base</span>
            </label>
            <select
              id="filter-from-base"
              value={filters.fromBaseId}
              onChange={(e) => handleFilterChange('fromBaseId', e.target.value)}
              disabled={isBaseCommander}
              className="filter-select"
            >
              {!isBaseCommander && <option value="">All Source Bases</option>}
              {bases.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          {/* To Base Filter */}
          <div className="filter-group">
            <label htmlFor="filter-to-base">
              <Building2 size={14} />
              <span>To Base</span>
            </label>
            <select
              id="filter-to-base"
              value={filters.toBaseId}
              onChange={(e) => handleFilterChange('toBaseId', e.target.value)}
              className="filter-select"
            >
              <option value="">All Destination Bases</option>
              {bases.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          {/* Equipment Type Filter */}
          <div className="filter-group">
            <label htmlFor="filter-equipment">
              <Boxes size={14} />
              <span>Equipment Type</span>
            </label>
            <select
              id="filter-equipment"
              value={filters.equipmentTypeId}
              onChange={(e) => handleFilterChange('equipmentTypeId', e.target.value)}
              className="filter-select"
            >
              <option value="">All Equipment</option>
              {equipmentTypes.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.name} ({eq.category})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="filter-group">
            <label htmlFor="filter-status">
              <ArrowLeftRight size={14} />
              <span>Status</span>
            </label>
            <select
              id="filter-status"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="filter-select"
            >
              <option value="">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="PENDING">Pending</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Reset Action */}
          <div className="filter-action-group">
            <button type="button" className="reset-filter-btn" onClick={handleResetFilters}>
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="dashboard-loading-card">
          <div className="loading-spinner"></div>
          <p>Loading transfers...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="dashboard-error-card">
          <AlertCircle size={32} className="error-card-icon" />
          <p>{error}</p>
          <button className="retry-btn" onClick={loadTransfers}>
            Retry Request
          </button>
        </div>
      )}

      {/* Main Table Content */}
      {!loading && !error && (
        <div className="table-card">
          {transfers.length === 0 ? (
            <div className="table-empty">
              <ArrowLeftRight size={36} className="empty-icon" />
              <p>No transfers found.</p>
              <span className="empty-subtext">Try adjusting your date or filter options.</span>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Transfer ID</th>
                    <th>Transfer Date</th>
                    <th>From Base</th>
                    <th>To Base</th>
                    <th>Equipment Type</th>
                    <th>Quantity</th>
                    <th>Status</th>
                    <th>Reference No.</th>
                    <th>Created By</th>
                    <th>Created At</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((item) => (
                    <tr key={item.id}>
                      <td className="font-mono font-bold">#{item.id}</td>
                      <td className="font-mono">{formatDate(item.transfer_date)}</td>
                      <td>{item.from_base_name} ({item.from_base_code})</td>
                      <td>{item.to_base_name} ({item.to_base_code})</td>
                      <td className="font-semibold">{item.equipment_name}</td>
                      <td className="font-mono text-emerald">
                        {item.quantity?.toLocaleString()} <span className="unit-label">{item.unit}</span>
                      </td>
                      <td>{renderStatusBadge(item.status)}</td>
                      <td className="font-mono text-muted">{item.reference_number}</td>
                      <td>{item.created_by_name || 'System'}</td>
                      <td className="font-mono text-muted">{formatDate(item.created_at)}</td>
                      <td className="text-right">
                        <div className="action-buttons-group">
                          <button
                            className="action-btn action-btn-view"
                            onClick={() => handleOpenDetailModal(item.id)}
                            title="View Transfer Details"
                          >
                            <Eye size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* New Transfer Form Modal */}
      <TransferFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleRecordSubmit}
        bases={bases}
        equipmentTypes={equipmentTypes}
        isBaseCommander={isBaseCommander}
        userBaseId={user?.base_id}
      />

      {/* Transfer Detail Modal */}
      <TransferDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        transferId={detailTransferId}
      />
    </div>
  );
}
