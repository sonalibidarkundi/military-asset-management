import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { assignmentsAPI, dashboardAPI } from '../services/api';
import AssignmentFormModal from '../components/assignments/AssignmentFormModal';
import AssignmentDetailModal from '../components/assignments/AssignmentDetailModal';
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
  UserCheck,
  RotateCcw,
} from 'lucide-react';

export default function Assignments() {
  const { user } = useAuth();

  const [assignments, setAssignments] = useState([]);
  const [bases, setBases] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);

  const isBaseCommander = user?.role === 'base_commander';
  const isAuthorizedToCreate = user?.role === 'admin' || user?.role === 'logistics_officer' || isBaseCommander;

  const [filters, setFilters] = useState({
    search: '',
    date: '',
    baseId: isBaseCommander && user?.base_id ? String(user.base_id) : '',
    equipmentTypeId: '',
    status: '',
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [detailAssignmentId, setDetailAssignmentId] = useState(null);
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
        console.error('Failed to load assignment filter options:', err);
      }
    };
    fetchFilters();
  }, []);

  // Fetch Assignments List from API
  const loadAssignments = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = {};
    if (filters.search) params.search = filters.search;
    if (filters.date) params.date = filters.date;
    if (filters.baseId) params.base_id = filters.baseId;
    if (filters.equipmentTypeId) params.equipment_type_id = filters.equipmentTypeId;
    if (filters.status) params.status = filters.status;

    try {
      const response = await assignmentsAPI.getAll(params);
      if (response.data && response.data.success) {
        setAssignments(response.data.data || []);
      } else {
        setError('Unable to load assignments.');
      }
    } catch (err) {
      console.error('Fetch assignments error:', err);
      setError(err.response?.data?.message || 'Unable to load assignments.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      date: '',
      baseId: isBaseCommander && user?.base_id ? String(user.base_id) : '',
      equipmentTypeId: '',
      status: '',
    });
  };

  const showToast = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  // Submit New Assignment
  const handleCreateSubmit = async (formData) => {
    const response = await assignmentsAPI.create(formData);
    if (response.data && response.data.success) {
      showToast('Asset assignment created successfully. Stock quantity updated.');
      loadAssignments();
    }
  };

  // Quick Return Action from Table
  const handleReturnAssignment = async (id) => {
    if (!window.confirm('Are you sure you want to return this assignment? Stock will be restored.')) return;
    try {
      const response = await assignmentsAPI.returnAssignment(id);
      if (response.data && response.data.success) {
        showToast('Assignment returned successfully. Asset stock restored.');
        loadAssignments();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to return assignment.');
    }
  };

  const handleOpenDetailModal = (id) => {
    setDetailAssignmentId(id);
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
    if (s === 'ACTIVE') badgeClass = 'badge-success';
    else if (s === 'RETURNED') badgeClass = 'badge-info';
    else if (s === 'CANCELLED') badgeClass = 'badge-danger';

    return <span className={`asset-status-badge ${badgeClass}`}>{s}</span>;
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header flex-between">
        <div>
          <h2 className="page-title">Personnel Assignments</h2>
          <p className="page-subtitle">Equipment & Asset Issuance to Authorized Military Personnel</p>
        </div>

        <div className="flex-gap">
          <button className="icon-btn refresh-btn" onClick={loadAssignments} title="Refresh Assignments History">
            <RefreshCw size={18} className={loading ? 'spin' : ''} />
          </button>

          {isAuthorizedToCreate && (
            <button className="submit-btn add-asset-btn" onClick={() => setIsFormOpen(true)}>
              <Plus size={18} />
              <span>New Assignment</span>
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
          <span>SEARCH & FILTER ASSIGNMENTS</span>
        </div>

        <div className="filters-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr) auto' }}>
          {/* Search Field */}
          <div className="filter-group">
            <label htmlFor="search-assignment">
              <Search size={14} />
              <span>Search Assignments</span>
            </label>
            <input
              id="search-assignment"
              type="text"
              placeholder="Personnel, Serial, Asset ID..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="filter-input width-full"
            />
          </div>

          {/* Date Filter */}
          <div className="filter-group">
            <label htmlFor="filter-assignment-date">
              <Calendar size={14} />
              <span>Assignment Date</span>
            </label>
            <input
              id="filter-assignment-date"
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

          {/* Status Filter */}
          <div className="filter-group">
            <label htmlFor="filter-status">
              <UserCheck size={14} />
              <span>Status</span>
            </label>
            <select
              id="filter-status"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="filter-select"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="RETURNED">Returned</option>
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
          <p>Loading assignments...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="dashboard-error-card">
          <AlertCircle size={32} className="error-card-icon" />
          <p>{error}</p>
          <button className="retry-btn" onClick={loadAssignments}>
            Retry Request
          </button>
        </div>
      )}

      {/* Main Table Content */}
      {!loading && !error && (
        <div className="table-card">
          {assignments.length === 0 ? (
            <div className="table-empty">
              <UserCheck size={36} className="empty-icon" />
              <p>No assignments found.</p>
              <span className="empty-subtext">Try adjusting your date or filter options.</span>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Assignment ID</th>
                    <th>Assignment Date</th>
                    <th>Asset</th>
                    <th>Equipment Type</th>
                    <th>Personnel</th>
                    <th>Base</th>
                    <th>Quantity</th>
                    <th>Purpose</th>
                    <th>Status</th>
                    <th>Created By</th>
                    <th>Created At</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((item) => (
                    <tr key={item.id}>
                      <td className="font-mono font-bold">#{item.id}</td>
                      <td className="font-mono">{formatDate(item.assignment_date)}</td>
                      <td className="font-mono">
                        #{item.asset_id} {item.serial_number ? `(${item.serial_number})` : ''}
                      </td>
                      <td className="font-semibold">{item.equipment_name}</td>
                      <td className="font-semibold text-emerald">{item.personnel_name}</td>
                      <td>{item.base_name} ({item.base_code})</td>
                      <td className="font-mono font-bold">
                        {item.quantity?.toLocaleString()} <span className="unit-label">{item.unit}</span>
                      </td>
                      <td className="text-muted" style={{ maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.purpose}
                      </td>
                      <td>{renderStatusBadge(item.status)}</td>
                      <td>{item.created_by_name || 'System'}</td>
                      <td className="font-mono text-muted">{formatDate(item.created_at)}</td>
                      <td className="text-right">
                        <div className="action-buttons-group">
                          <button
                            className="action-btn action-btn-view"
                            onClick={() => handleOpenDetailModal(item.id)}
                            title="View Assignment Details"
                          >
                            <Eye size={15} />
                          </button>
                          {item.status === 'ACTIVE' && isAuthorizedToCreate && (
                            <button
                              className="action-btn action-btn-view"
                              style={{ color: 'var(--amber-400, #fbbf24)' }}
                              onClick={() => handleReturnAssignment(item.id)}
                              title="Return Assignment"
                            >
                              <RotateCcw size={15} />
                            </button>
                          )}
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

      {/* New Assignment Form Modal */}
      <AssignmentFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleCreateSubmit}
        bases={bases}
        isBaseCommander={isBaseCommander}
        userBaseId={user?.base_id}
      />

      {/* Assignment Detail Modal */}
      <AssignmentDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        assignmentId={detailAssignmentId}
        onReturnSuccess={(msg) => {
          showToast(msg);
          loadAssignments();
        }}
        isAuthorizedToReturn={isAuthorizedToCreate}
      />
    </div>
  );
}
