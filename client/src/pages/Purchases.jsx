import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { purchasesAPI, dashboardAPI } from '../services/api';
import PurchaseFormModal from '../components/purchases/PurchaseFormModal';
import PurchaseDetailModal from '../components/purchases/PurchaseDetailModal';
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
  Truck,
  ShoppingBag,
  Layers,
} from 'lucide-react';

export default function Purchases() {
  const { user } = useAuth();

  const [purchases, setPurchases] = useState([]);
  const [bases, setBases] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);

  const isBaseCommander = user?.role === 'base_commander';
  const isAuthorizedToRecord = user?.role === 'admin' || user?.role === 'logistics_officer';

  const [filters, setFilters] = useState({
    search: '',
    date: '',
    baseId: isBaseCommander && user?.base_id ? String(user.base_id) : '',
    equipmentTypeId: '',
    supplier: '',
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [detailPurchaseId, setDetailPurchaseId] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

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
        console.error('Failed to load purchase filter options:', err);
      }
    };
    fetchFilters();
  }, [isBaseCommander, user?.base_id]);

  // Fetch Purchases List from API
  const loadPurchases = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = {};
    if (filters.search) params.search = filters.search;
    if (filters.date) params.date = filters.date;
    if (filters.baseId) params.base_id = filters.baseId;
    if (filters.equipmentTypeId) params.equipment_type_id = filters.equipmentTypeId;
    if (filters.supplier) params.supplier = filters.supplier;

    try {
      const response = await purchasesAPI.getAll(params);
      if (response.data && response.data.success) {
        setPurchases(response.data.data || []);
      } else {
        setError('Unable to load purchases.');
      }
    } catch (err) {
      console.error('Fetch purchases error:', err);
      setError(err.response?.data?.message || 'Unable to load purchases.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      date: '',
      baseId: isBaseCommander && user?.base_id ? String(user.base_id) : '',
      equipmentTypeId: '',
      supplier: '',
    });
  };

  const showToast = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  // Record Purchase Submit
  const handleRecordSubmit = async (formData) => {
    const response = await purchasesAPI.create(formData);
    if (response.data && response.data.success) {
      showToast('New purchase recorded successfully. Stock inventory updated.');
      loadPurchases();
    }
  };

  const handleOpenDetailModal = (id) => {
    setDetailPurchaseId(id);
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
          <h2 className="page-title">Purchases & Procurement</h2>
          <p className="page-subtitle">Incoming Military Inventory Procurement History & Stock Management</p>
        </div>

        <div className="flex-gap">
          <button className="icon-btn refresh-btn" onClick={loadPurchases} title="Refresh Purchase History">
            <RefreshCw size={18} className={loading ? 'spin' : ''} />
          </button>

          {isAuthorizedToRecord && (
            <button className="submit-btn add-asset-btn" onClick={() => setIsFormOpen(true)}>
              <Plus size={18} />
              <span>Record Purchase</span>
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
          <span>SEARCH & FILTER PURCHASES</span>
        </div>

        <div className="filters-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr) auto' }}>
          {/* Search Field */}
          <div className="filter-group">
            <label htmlFor="search-purchase">
              <Search size={14} />
              <span>Search Purchases</span>
            </label>
            <input
              id="search-purchase"
              type="text"
              placeholder="Supplier, Ref No, Equipment..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="filter-input width-full"
            />
          </div>

          {/* Date Filter */}
          <div className="filter-group">
            <label htmlFor="filter-purchase-date">
              <Calendar size={14} />
              <span>Purchase Date</span>
            </label>
            <input
              id="filter-purchase-date"
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
          <p>Loading purchases...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="dashboard-error-card">
          <AlertCircle size={32} className="error-card-icon" />
          <p>{error}</p>
          <button className="retry-btn" onClick={loadPurchases}>
            Retry Request
          </button>
        </div>
      )}

      {/* Main Table Content */}
      {!loading && !error && (
        <div className="table-card">
          {purchases.length === 0 ? (
            <div className="table-empty">
              <ShoppingBag size={36} className="empty-icon" />
              <p>No purchases found.</p>
              <span className="empty-subtext">Try adjusting your date or filter options.</span>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Purchase ID</th>
                    <th>Purchase Date</th>
                    <th>Base</th>
                    <th>Equipment Type</th>
                    <th>Quantity</th>
                    <th>Supplier</th>
                    <th>Reference No.</th>
                    <th>Created By</th>
                    <th>Created At</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((item) => (
                    <tr key={item.id}>
                      <td className="font-mono font-bold">#{item.id}</td>
                      <td className="font-mono">{formatDate(item.purchase_date)}</td>
                      <td>{item.base_name} ({item.base_code})</td>
                      <td className="font-semibold">{item.equipment_name}</td>
                      <td className="font-mono text-emerald">
                        +{item.quantity?.toLocaleString()} <span className="unit-label">{item.unit}</span>
                      </td>
                      <td className="font-semibold">{item.supplier}</td>
                      <td className="font-mono text-muted">{item.reference_number}</td>
                      <td>{item.created_by_name || 'System'}</td>
                      <td className="font-mono text-muted">{formatDate(item.created_at)}</td>
                      <td className="text-right">
                        <div className="action-buttons-group">
                          <button
                            className="action-btn action-btn-view"
                            onClick={() => handleOpenDetailModal(item.id)}
                            title="View Purchase Details"
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

      {/* Record Purchase Modal */}
      <PurchaseFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleRecordSubmit}
        bases={bases}
        equipmentTypes={equipmentTypes}
        isBaseCommander={isBaseCommander}
        userBaseId={user?.base_id}
      />

      {/* Purchase Detail Modal */}
      <PurchaseDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        purchaseId={detailPurchaseId}
      />
    </div>
  );
}
