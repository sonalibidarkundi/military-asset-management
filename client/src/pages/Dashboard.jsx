import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { dashboardAPI } from '../services/api';
import StatCard from '../components/dashboard/StatCard';
import MovementChart from '../components/dashboard/MovementChart';
import MovementDetails from '../components/dashboard/MovementDetails';
import {
  Filter,
  RefreshCw,
  PackageCheck,
  ShoppingBag,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  UserCheck,
  Flame,
  ShieldCheck,
  AlertCircle,
  Calendar,
  Building2,
  Boxes,
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();

  const [filters, setFilters] = useState({
    date: '',
    baseId: user?.role === 'base_commander' && user?.base_id ? String(user.base_id) : '',
    equipmentTypeId: '',
  });

  const [bases, setBases] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [summary, setSummary] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [movementDetails, setMovementDetails] = useState({ purchases: [], transferIn: [], transferOut: [] });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const isBaseCommander = user?.role === 'base_commander';

  // Load Filter options (Bases & Equipment Types)
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
        console.error('Failed to load dashboard filter options:', err);
      }
    };
    fetchFilters();
  }, [isBaseCommander, user?.base_id]);

  // Fetch Dashboard Summary & Chart Data
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const activeParams = {};
    if (filters.date) activeParams.date = filters.date;
    if (filters.baseId) activeParams.baseId = filters.baseId;
    if (filters.equipmentTypeId) activeParams.equipmentTypeId = filters.equipmentTypeId;

    try {
      const [summaryRes, chartRes] = await Promise.all([
        dashboardAPI.getSummary(activeParams),
        dashboardAPI.getMovement(activeParams),
      ]);

      if (summaryRes.data && summaryRes.data.success) {
        setSummary(summaryRes.data.data);
      } else {
        setError('Unable to load dashboard data.');
      }

      if (chartRes.data && chartRes.data.success) {
        setChartData(chartRes.data.data);
      }
    } catch (err) {
      console.error('Dashboard data fetch error:', err);
      setError('Unable to load dashboard data.');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Fetch itemized movement details when opening Net Movement modal
  const handleOpenDetails = async () => {
    setIsDetailsOpen(true);
    setDetailsLoading(true);

    const activeParams = {};
    if (filters.date) activeParams.date = filters.date;
    if (filters.baseId) activeParams.baseId = filters.baseId;
    if (filters.equipmentTypeId) activeParams.equipmentTypeId = filters.equipmentTypeId;

    try {
      const response = await dashboardAPI.getMovementDetails(activeParams);
      if (response.data && response.data.success) {
        setMovementDetails(response.data.data);
      }
    } catch (err) {
      console.error('Failed to load movement details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      date: '',
      baseId: isBaseCommander && user?.base_id ? String(user.base_id) : '',
      equipmentTypeId: '',
    });
  };

  const isAllZero =
    summary &&
    summary.openingBalance === 0 &&
    summary.purchases === 0 &&
    summary.transferIn === 0 &&
    summary.transferOut === 0 &&
    summary.assigned === 0 &&
    summary.expended === 0 &&
    summary.closingBalance === 0;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header flex-between">
        <div>
          <h2 className="page-title">Command Dashboard</h2>
          <p className="page-subtitle">Real-Time Military Asset Movement & Expenditure Analytics</p>
        </div>

        <button className="icon-btn refresh-btn" onClick={loadDashboardData} title="Refresh Dashboard Data">
          <RefreshCw size={18} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="filters-bar-card">
        <div className="filters-title">
          <Filter size={16} />
          <span>FILTER LOGISTICS DATA</span>
        </div>

        <div className="filters-grid">
          {/* Date Filter */}
          <div className="filter-group">
            <label htmlFor="filter-date">
              <Calendar size={14} />
              <span>As of Date</span>
            </label>
            <input
              id="filter-date"
              type="date"
              value={filters.date}
              onChange={(e) => handleFilterChange('date', e.target.value)}
              className="filter-input"
            />
          </div>

          {/* Base Filter */}
          <div className="filter-group">
            <label htmlFor="filter-base">
              <Building2 size={14} />
              <span>Military Base</span>
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
              <option value="">All Equipment Categories</option>
              {equipmentTypes.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.name} ({eq.category})
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters Button */}
          <div className="filter-action-group">
            <button type="button" className="reset-filter-btn" onClick={handleResetFilters}>
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="dashboard-loading-card">
          <div className="loading-spinner"></div>
          <p>Loading dashboard data...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="dashboard-error-card">
          <AlertCircle size={32} className="error-card-icon" />
          <p>{error}</p>
          <button className="retry-btn" onClick={loadDashboardData}>
            Retry Request
          </button>
        </div>
      )}

      {/* Main Content when Loaded */}
      {!loading && !error && summary && (
        <>
          {/* Zero Data State Alert */}
          {isAllZero && (
            <div className="dashboard-info-card">
              <AlertCircle size={18} />
              <span>No data available for the selected filters.</span>
            </div>
          )}

          {/* Stat Cards Grid (8 Metrics) */}
          <div className="stat-cards-grid">
            {/* 1. Opening Balance */}
            <StatCard
              title="Opening Balance"
              value={summary.openingBalance}
              icon={PackageCheck}
              accentColor="#64748b"
              subtitle="Baseline Stock Count"
            />

            {/* 2. Purchases */}
            <StatCard
              title="Purchases"
              value={summary.purchases}
              icon={ShoppingBag}
              accentColor="#3b82f6"
              subtitle="Procured Inventory"
            />

            {/* 3. Transfer In */}
            <StatCard
              title="Transfer In"
              value={summary.transferIn}
              icon={ArrowDownLeft}
              accentColor="#10b981"
              subtitle="Incoming Relocations"
            />

            {/* 4. Transfer Out */}
            <StatCard
              title="Transfer Out"
              value={summary.transferOut}
              icon={ArrowUpRight}
              accentColor="#f59e0b"
              subtitle="Outgoing Relocations"
            />

            {/* 5. NET MOVEMENT (PROMINENT & CLICKABLE) */}
            <StatCard
              title="Net Movement"
              value={summary.netMovement}
              icon={TrendingUp}
              isProminent={true}
              onClick={handleOpenDetails}
              accentColor={summary.netMovement >= 0 ? '#84cc16' : '#ef4444'}
              badge={summary.netMovement >= 0 ? '+POSITIVE' : '-DEFICIT'}
              subtitle="Purchases + In - Out"
            />

            {/* 6. Assigned */}
            <StatCard
              title="Assigned"
              value={summary.assigned}
              icon={UserCheck}
              accentColor="#8b5cf6"
              subtitle="Active Duty Assignments"
            />

            {/* 7. Expended */}
            <StatCard
              title="Expended"
              value={summary.expended}
              icon={Flame}
              accentColor="#ef4444"
              subtitle="Consumed / Training Loss"
            />

            {/* 8. Closing Balance */}
            <StatCard
              title="Closing Balance"
              value={summary.closingBalance}
              icon={ShieldCheck}
              accentColor="#0ea5e9"
              subtitle="Total Available Stock"
            />
          </div>

          {/* Movement Chart Section */}
          <div className="dashboard-chart-section">
            <MovementChart data={chartData} />
          </div>
        </>
      )}

      {/* Net Movement Itemized Details Modal */}
      <MovementDetails
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        details={movementDetails}
        loading={detailsLoading}
      />
    </div>
  );
}
