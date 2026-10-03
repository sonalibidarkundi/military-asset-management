import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { assetsAPI, dashboardAPI } from '../services/api';
import AssetFormModal from '../components/assets/AssetFormModal';
import AssetDetailModal from '../components/assets/AssetDetailModal';
import DeleteConfirmModal from '../components/assets/DeleteConfirmModal';
import {
  Plus,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Building2,
  Boxes,
  Activity,
  Layers,
} from 'lucide-react';

export default function Assets() {
  const { user } = useAuth();

  const [assets, setAssets] = useState([]);
  const [bases, setBases] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);

  const isBaseCommander = user?.role === 'base_commander';
  const isAdmin = user?.role === 'admin';

  const [filters, setFilters] = useState({
    search: '',
    baseId: isBaseCommander && user?.base_id ? String(user.base_id) : '',
    equipmentTypeId: '',
    status: '',
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);

  const [detailAssetId, setDetailAssetId] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [deletingAsset, setDeletingAsset] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Fetch Filter Dropdowns (Bases & Equipment Types)
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const response = await dashboardAPI.getFilters();
        if (response.data && response.data.success) {
          setBases(response.data.bases || []);
          setEquipmentTypes(response.data.equipmentTypes || []);

          if (isBaseCommander && user?.base_id) {
            setFilters((prev) => ({ ...prev, baseId: String(user.base_id) }));
          }
        }
      } catch (err) {
        console.error('Failed to load assets filter options:', err);
      }
    };
    fetchFilters();
  }, [isBaseCommander, user?.base_id]);

  // Fetch Assets from API
  const loadAssets = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = {};
    if (filters.search) params.search = filters.search;
    if (filters.baseId) params.base_id = filters.baseId;
    if (filters.equipmentTypeId) params.equipment_type_id = filters.equipmentTypeId;
    if (filters.status) params.status = filters.status;

    try {
      const response = await assetsAPI.getAll(params);
      if (response.data && response.data.success) {
        setAssets(response.data.data || []);
      } else {
        setError('Unable to load assets.');
      }
    } catch (err) {
      console.error('Fetch assets error:', err);
      setError(err.response?.data?.message || 'Unable to load assets.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      baseId: isBaseCommander && user?.base_id ? String(user.base_id) : '',
      equipmentTypeId: '',
      status: '',
    });
  };

  const showToast = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  // Add Asset Handler
  const handleOpenAddModal = () => {
    setEditingAsset(null);
    setIsFormOpen(true);
  };

  // Edit Asset Handler
  const handleOpenEditModal = (asset) => {
    setEditingAsset(asset);
    setIsFormOpen(true);
  };

  // Submit Form (Add or Edit)
  const handleFormSubmit = async (formData) => {
    if (editingAsset) {
      const response = await assetsAPI.update(editingAsset.id, formData);
      if (response.data && response.data.success) {
        showToast(`Asset #${editingAsset.id} updated successfully.`);
      }
    } else {
      const response = await assetsAPI.create(formData);
      if (response.data && response.data.success) {
        showToast('New military asset created successfully.');
      }
    }
    loadAssets();
  };

  // View Details Handler
  const handleOpenDetailModal = (id) => {
    setDetailAssetId(id);
    setIsDetailOpen(true);
  };

  // Delete Handlers
  const handleOpenDeleteModal = (asset) => {
    setDeletingAsset(asset);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async (id) => {
    try {
      const response = await assetsAPI.delete(id);
      if (response.data && response.data.success) {
        showToast(`Asset #${id} deleted successfully.`);
        loadAssets();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete asset. Operation rejected by backend authorization.');
    }
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
          <h2 className="page-title">Assets Management</h2>
          <p className="page-subtitle">Centralized Military Equipment & Ordnance Inventory Control</p>
        </div>

        <div className="flex-gap">
          <button className="icon-btn refresh-btn" onClick={loadAssets} title="Refresh Assets List">
            <RefreshCw size={18} className={loading ? 'spin' : ''} />
          </button>

          <button className="submit-btn add-asset-btn" onClick={handleOpenAddModal}>
            <Plus size={18} />
            <span>Add Asset</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
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
          <span>SEARCH & FILTER INVENTORY</span>
        </div>

        <div className="filters-grid">
          {/* Search Field */}
          <div className="filter-group">
            <label htmlFor="search-asset">
              <Search size={14} />
              <span>Search Assets</span>
            </label>
            <div className="input-wrapper">
              <input
                id="search-asset"
                type="text"
                placeholder="ID, Serial No, Equipment Name..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="filter-input width-full"
              />
            </div>
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
              {!isBaseCommander && <option value="">All Bases</option>}
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
              <Activity size={14} />
              <span>Status</span>
            </label>
            <select
              id="filter-status"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="filter-select"
            >
              <option value="">All Statuses</option>
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="ASSIGNED">ASSIGNED</option>
              <option value="IN_TRANSIT">IN TRANSIT</option>
              <option value="EXPENDED">EXPENDED</option>
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
          <p>Loading assets...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="dashboard-error-card">
          <AlertCircle size={32} className="error-card-icon" />
          <p>{error}</p>
          <button className="retry-btn" onClick={loadAssets}>
            Retry Request
          </button>
        </div>
      )}

      {/* Main Table Content */}
      {!loading && !error && (
        <div className="table-card">
          {assets.length === 0 ? (
            <div className="table-empty">
              <Layers size={36} className="empty-icon" />
              <p>No assets found.</p>
              <span className="empty-subtext">Try clearing or adjusting your search filters.</span>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Asset ID</th>
                    <th>Equipment Type</th>
                    <th>Category</th>
                    <th>Base</th>
                    <th>Serial Number</th>
                    <th>Quantity</th>
                    <th>Status</th>
                    <th>Created Date</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => (
                    <tr key={asset.id}>
                      <td className="font-mono font-bold">#{asset.id}</td>
                      <td className="font-semibold">{asset.equipment_name}</td>
                      <td>
                        <span className="category-tag">{asset.category}</span>
                      </td>
                      <td>{asset.base_name} ({asset.base_code})</td>
                      <td className="font-mono text-muted">{asset.serial_number || 'N/A'}</td>
                      <td className="font-mono text-emerald">
                        {asset.quantity?.toLocaleString()} <span className="unit-label">{asset.unit}</span>
                      </td>
                      <td>
                        <span className={`status-tag status-${(asset.status || 'AVAILABLE').toLowerCase()}`}>
                          {asset.status}
                        </span>
                      </td>
                      <td className="font-mono text-muted">{formatDate(asset.created_at)}</td>
                      <td className="text-right">
                        <div className="action-buttons-group">
                          <button
                            className="action-btn action-btn-view"
                            onClick={() => handleOpenDetailModal(asset.id)}
                            title="View Asset Details"
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            className="action-btn action-btn-edit"
                            onClick={() => handleOpenEditModal(asset)}
                            title="Edit Asset"
                          >
                            <Edit2 size={15} />
                          </button>

                          <button
                            className="action-btn action-btn-delete"
                            onClick={() => handleOpenDeleteModal(asset)}
                            title="Delete Asset"
                          >
                            <Trash2 size={15} />
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

      {/* Add / Edit Form Modal */}
      <AssetFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingAsset}
        bases={bases}
        equipmentTypes={equipmentTypes}
        isBaseCommander={isBaseCommander}
        userBaseId={user?.base_id}
      />

      {/* Asset Detail View Modal */}
      <AssetDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        assetId={detailAssetId}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        asset={deletingAsset}
      />
    </div>
  );
}
