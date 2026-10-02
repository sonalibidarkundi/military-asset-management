import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { expendituresAPI, dashboardAPI } from '../services/api';
import ExpenditureFormModal from '../components/expenditures/ExpenditureFormModal';
import ExpenditureDetailModal from '../components/expenditures/ExpenditureDetailModal';
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
  TrendingDown,
} from 'lucide-react';

export default function Expenditures() {
  const { user } = useAuth();

  const [expenditures, setExpenditures] = useState([]);
  const [bases, setBases] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);

  const isBaseCommander = user?.role === 'base_commander';
  const isAuthorizedToRecord = user?.role === 'admin' || user?.role === 'logistics_officer' || isBaseCommander;

  const [filters, setFilters] = useState({
    search: '',
    date: '',
    baseId: isBaseCommander && user?.base_id ? String(user.base_id) : '',
    equipmentTypeId: '',
    reason: '',
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [detailExpenditureId, setDetailExpenditureId] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Fetch Dropdown Filter Options
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const response = await dashboardAPI.getFilters();
        if (response.data && response.data.success) {
          setBases(response.data.bases || []);
          setEquipmentTypes(response.data.equipmentTypes || []);
        }
      } catch (err) {
        console.error('Failed to load expenditure filter options:', err);
      }
    };
    fetchFilters();
  }, []);

  // Fetch Expenditures List from API
  const loadExpenditures = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = {};
    if (filters.search) params.search = filters.search;
    if (filters.date) params.date = filters.date;
    if (filters.baseId) params.base_id = filters.baseId;
    if (filters.equipmentTypeId) params.equipment_type_id = filters.equipmentTypeId;
    if (filters.reason) params.reason = filters.reason;

    try {
      const response = await expendituresAPI.getAll(params);
      if (response.data && response.data.success) {
        setExpenditures(response.data.data || []);
      } else {
        setError('Unable to load expenditures.');
      }
    } catch (err) {
      console.error('Fetch expenditures error:', err);
      setError(err.response?.data?.message || 'Unable to load expenditures.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadExpenditures();
  }, [loadExpenditures]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      date: '',
      baseId: isBaseCommander && user?.base_id ? String(user.base_id) : '',
      equipmentTypeId: '',
      reason: '',
    });
  };

  const showToast = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  // Record Expenditure Submit
  const handleRecordSubmit = async (formData) => {
    const response = await expendituresAPI.create(formData);
    if (response.data && response.data.success) {
      showToast('Expenditure recorded successfully. Asset stock deducted.');
      loadExpenditures();
    }
  };

  const handleOpenDetailModal = (id) => {
    setDetailExpenditureId(id);
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

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header flex-between">
        <div>
          <h2 className="page-title">Expenditures & Losses</h2>
          <p className="page-subtitle">Equipment & Asset Consumption, Operational Loss, and Write-off History</p>
        </div>

        <div className="flex-gap">
          <button className="icon-btn refresh-btn" onClick={loadExpenditures} title="Refresh Expenditure History">
            <RefreshCw size={18} className={loading ? 'spin' : ''} />
          </button>

          {isAuthorizedToRecord && (
            <button className="submit-btn add-asset-btn" onClick={() => setIsFormOpen(true)}>
              <Plus size={18} />
              <span>Record Expenditure</span>
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
          <span>SEARCH & FILTER EXPENDITURES</span>
        </div>

        <div className="filters-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr) auto' }}>
          {/* Search Field */}
          <div className="filter-group">
            <label htmlFor="search-expenditure">
              <Search size={14} />
              <span>Search Expenditures</span>
            </label>
            <input
              id="search-expenditure"
              type="text"
              placeholder="Reason, Serial, Asset ID..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="filter-input width-full"
            />
          </div>

          {/* Date Filter */}
          <div className="filter-group">
            <label htmlFor="filter-expenditure-date">
              <Calendar size={14} />
              <span>Expenditure Date</span>
            </label>
            <input
              id="filter-expenditure-date"
              type="date"
              value={filters.date}
              onChange={(e) => handleFilterChange('date', e.target.value)}
              className="filter-input width-full"
            />
          </div>

          {/* Base Filter */}
          <div className="filter-group">
            <label htmlFor="filter-base">
              <Building2 size={14} />
              <span>Command Base</span>
            </label>
            <select
              id="filter-base"
              value={filters.baseId}
              onChange={(e) => handleFilterChange('baseId', e.target.value)}
              disabled={isBaseCommander}
              className="filter-select"
            >
              {!isBaseCommander && <option value="">All Command Bases</option>}
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

          {/* Reason Filter */}
          <div className="filter-group">
            <label htmlFor="filter-reason">
              <TrendingDown size={14} />
              <span>Reason</span>
            </label>
            <input
              id="filter-reason"
              type="text"
              placeholder="Filter by Reason..."
              value={filters.reason}
              onChange={(e) => handleFilterChange('reason', e.target.value)}
              className="filter-input width-full"
            />
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
          <p>Loading expenditures...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="dashboard-error-card">
          <AlertCircle size={32} className="error-card-icon" />
          <p>{error}</p>
          <button className="retry-btn" onClick={loadExpenditures}>
            Retry Request
          </button>
        </div>
      )}

      {/* Main Table Content */}
      {!loading && !error && (
        <div className="table-card">
          {expenditures.length === 0 ? (
            <div className="table-empty">
              <TrendingDown size={36} className="empty-icon" />
              <p>No expenditures found.</p>
              <span className="empty-subtext">Try adjusting your date or filter options.</span>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Expenditure ID</th>
                    <th>Expenditure Date</th>
                    <th>Asset</th>
                    <th>Equipment Type</th>
                    <th>Base</th>
                    <th>Quantity</th>
                    <th>Reason</th>
                    <th>Created By</th>
                    <th>Created At</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenditures.map((item) => (
                    <tr key={item.id}>
                      <td className="font-mono font-bold">#{item.id}</td>
                      <td className="font-mono">{formatDate(item.expenditure_date)}</td>
                      <td className="font-mono">
                        #{item.asset_id} {item.serial_number ? `(${item.serial_number})` : ''}
                      </td>
                      <td className="font-semibold">{item.equipment_name}</td>
                      <td>{item.base_name} ({item.base_code})</td>
                      <td className="font-mono text-amber font-bold">
                        -{item.quantity?.toLocaleString()} <span className="unit-label">{item.unit}</span>
                      </td>
                      <td className="font-semibold text-amber" style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.reason}
                      </td>
                      <td>{item.created_by_name || 'System'}</td>
                      <td className="font-mono text-muted">{formatDate(item.created_at)}</td>
                      <td className="text-right">
                        <div className="action-buttons-group">
                          <button
                            className="action-btn action-btn-view"
                            onClick={() => handleOpenDetailModal(item.id)}
                            title="View Expenditure Details"
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

      {/* Record Expenditure Form Modal */}
      <ExpenditureFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleRecordSubmit}
        bases={bases}
        isBaseCommander={isBaseCommander}
        userBaseId={user?.base_id}
      />

      {/* Expenditure Detail Modal */}
      <ExpenditureDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        expenditureId={detailExpenditureId}
      />
    </div>
  );
}
