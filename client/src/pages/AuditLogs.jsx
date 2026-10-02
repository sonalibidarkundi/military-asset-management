import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { auditAPI } from '../services/api';
import AuditDetailModal from '../components/audit/AuditDetailModal';
import {
  Search,
  Filter,
  RefreshCw,
  Eye,
  AlertCircle,
  Calendar,
  History,
  ShieldAlert,
  User,
  Activity,
  Layers,
} from 'lucide-react';

export default function AuditLogs() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [auditLogs, setAuditLogs] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    dateFrom: '',
    dateTo: '',
    userQuery: '',
    action: '',
    entityType: '',
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Detail Modal State
  const [selectedAuditLog, setSelectedAuditLog] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Fetch Audit Logs List from API
  const loadAuditLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = {};
    if (filters.search) params.search = filters.search;
    if (filters.dateFrom) params.date_from = filters.dateFrom;
    if (filters.dateTo) params.date_to = filters.dateTo;
    if (filters.userQuery) params.user = filters.userQuery;
    if (filters.action) params.action = filters.action;
    if (filters.entityType) params.entity_type = filters.entityType;

    try {
      const response = await auditAPI.getAll(params);
      if (response.data && response.data.success) {
        setAuditLogs(response.data.data || []);
      } else {
        setError('Unable to load audit logs.');
      }
    } catch (err) {
      console.error('Fetch audit logs error:', err);
      if (err.response?.status === 403) {
        setError('You are not authorized to view audit logs. Access restricted to System Administrators.');
      } else {
        setError(err.response?.data?.message || 'Unable to load audit logs.');
      }
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      dateFrom: '',
      dateTo: '',
      userQuery: '',
      action: '',
      entityType: '',
    });
  };

  const handleRowClick = (item) => {
    setSelectedAuditLog(item);
    setIsDetailOpen(true);
  };

  const formatDate = (d) => {
    if (!d) return 'N/A';
    try {
      const dateObj = new Date(d);
      return dateObj.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch {
      return String(d);
    }
  };

  const formatDetailsPreview = (det) => {
    if (!det) return 'N/A';
    if (typeof det === 'string') return det;
    try {
      const str = JSON.stringify(det);
      return str.length > 50 ? str.slice(0, 50) + '...' : str;
    } catch {
      return 'N/A';
    }
  };

  const getActionBadgeClass = (action) => {
    const act = String(action || '').toUpperCase();
    if (act.includes('CREATE') || act.includes('LOGIN') || act.includes('PURCHASE')) return 'badge-success';
    if (act.includes('UPDATE') || act.includes('ASSIGN') || act.includes('TRANSFER')) return 'badge-info';
    if (act.includes('DELETE') || act.includes('EXPEND')) return 'badge-danger';
    if (act.includes('RETURN')) return 'badge-warning';
    return 'badge-secondary';
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header flex-between">
        <div>
          <h2 className="page-title">Audit Logs</h2>
          <p className="page-subtitle">Operational activity and security trail</p>
        </div>

        <div className="flex-gap">
          <button className="icon-btn refresh-btn" onClick={loadAuditLogs} title="Refresh Audit Trail">
            <RefreshCw size={18} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="filters-bar-card">
        <div className="filters-title">
          <Filter size={16} />
          <span>FILTER & SEARCH AUDIT TRAIL</span>
        </div>

        <div className="filters-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr) auto' }}>
          {/* Search Field */}
          <div className="filter-group">
            <label htmlFor="search-audit">
              <Search size={14} />
              <span>Search Logs</span>
            </label>
            <input
              id="search-audit"
              type="text"
              placeholder="Entity ID, details, user..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="filter-input width-full"
            />
          </div>

          {/* Date From */}
          <div className="filter-group">
            <label htmlFor="filter-date-from">
              <Calendar size={14} />
              <span>Date From</span>
            </label>
            <input
              id="filter-date-from"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="filter-input width-full"
            />
          </div>

          {/* Date To */}
          <div className="filter-group">
            <label htmlFor="filter-date-to">
              <Calendar size={14} />
              <span>Date To</span>
            </label>
            <input
              id="filter-date-to"
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="filter-input width-full"
            />
          </div>

          {/* User Filter */}
          <div className="filter-group">
            <label htmlFor="filter-user">
              <User size={14} />
              <span>User</span>
            </label>
            <input
              id="filter-user"
              type="text"
              placeholder="User Name / Email..."
              value={filters.userQuery}
              onChange={(e) => handleFilterChange('userQuery', e.target.value)}
              className="filter-input width-full"
            />
          </div>

          {/* Action Filter */}
          <div className="filter-group">
            <label htmlFor="filter-action">
              <Activity size={14} />
              <span>Action</span>
            </label>
            <select
              id="filter-action"
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="filter-select"
            >
              <option value="">All Actions</option>
              <option value="LOGIN">LOGIN</option>
              <option value="CREATE">CREATE</option>

              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="CREATE_PURCHASE">CREATE_PURCHASE</option>
              <option value="CREATE_TRANSFER">CREATE_TRANSFER</option>
              <option value="CREATE_ASSIGNMENT">CREATE_ASSIGNMENT</option>
              <option value="RETURN_ASSIGNMENT">RETURN_ASSIGNMENT</option>
              <option value="CREATE_EXPENDITURE">CREATE_EXPENDITURE</option>
            </select>
          </div>

          {/* Entity Type Filter */}
          <div className="filter-group">
            <label htmlFor="filter-entity-type">
              <Layers size={14} />
              <span>Entity Type</span>
            </label>
            <select
              id="filter-entity-type"
              value={filters.entityType}
              onChange={(e) => handleFilterChange('entityType', e.target.value)}
              className="filter-select"
            >
              <option value="">All Entities</option>
              <option value="AUTH">AUTH</option>
              <option value="ASSET">ASSET</option>
              <option value="PURCHASE">PURCHASE</option>
              <option value="TRANSFER">TRANSFER</option>
              <option value="ASSIGNMENT">ASSIGNMENT</option>
              <option value="EXPENDITURE">EXPENDITURE</option>
            </select>
          </div>

          {/* Clear Filters Action */}
          <div className="filter-action-group">
            <button type="button" className="reset-filter-btn" onClick={handleResetFilters}>
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="dashboard-loading-card">
          <div className="loading-spinner"></div>
          <p>Loading audit logs...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="dashboard-error-card">
          <ShieldAlert size={32} className="error-card-icon" style={{ color: 'var(--amber-400, #fbbf24)' }} />
          <p>{error}</p>
          {isAdmin && (
            <button className="retry-btn" onClick={loadAuditLogs}>
              Retry Request
            </button>
          )}
        </div>
      )}

      {/* Main Table Content */}
      {!loading && !error && (
        <div className="table-card">
          {auditLogs.length === 0 ? (
            <div className="table-empty">
              <History size={36} className="empty-icon" />
              <p>No audit logs found.</p>
              <span className="empty-subtext">Try adjusting your date range or filter options.</span>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Entity Type</th>
                    <th>Entity ID</th>
                    <th>Details</th>
                    <th>IP Address</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((item) => (
                    <tr
                      key={item.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleRowClick(item)}
                    >
                      <td className="font-mono">{formatDate(item.created_at)}</td>
                      <td className="font-semibold">
                        {item.user_name || 'System'}
                        {item.user_email && (
                          <span className="text-muted block font-mono" style={{ fontSize: '11px' }}>
                            {item.user_email}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`asset-status-badge ${getActionBadgeClass(item.action)}`}>
                          {item.action}
                        </span>
                      </td>
                      <td className="font-mono text-emerald font-semibold">{item.entity_type}</td>
                      <td className="font-mono">
                        {item.entity_id !== null && item.entity_id !== undefined ? `#${item.entity_id}` : 'N/A'}
                      </td>
                      <td
                        className="font-mono text-muted"
                        style={{ maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      >
                        {formatDetailsPreview(item.details)}
                      </td>
                      <td className="font-mono text-muted">{item.ip_address || '127.0.0.1'}</td>
                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="action-buttons-group">
                          <button
                            className="action-btn action-btn-view"
                            onClick={() => handleRowClick(item)}
                            title="View Audit Details"
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

      {/* Audit Detail Modal */}
      <AuditDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        auditLog={selectedAuditLog}
      />
    </div>
  );
}
