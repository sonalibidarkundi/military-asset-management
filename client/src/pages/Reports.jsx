import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { reportsAPI, dashboardAPI } from '../services/api';
import StatCard from '../components/dashboard/StatCard';
import MovementChart from '../components/dashboard/MovementChart';
import ReportDetailsModal from '../components/reports/ReportDetailsModal';
import {
  Filter,
  RefreshCw,
  Download,
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
  FileSpreadsheet,
} from 'lucide-react';

export default function Reports() {
  const { user } = useAuth();
  const isBaseCommander = user?.role === 'base_commander';

  // Default date range: 1st of current month to today
  const getDefaultDateRange = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return {
      date_from: `${year}-${month}-01`,
      date_to: `${year}-${month}-${day}`,
    };
  };

  const defaultDates = getDefaultDateRange();

  const [filterDraft, setFilterDraft] = useState({
    date_from: defaultDates.date_from,
    date_to: defaultDates.date_to,
    base_id: isBaseCommander && user?.base_id ? String(user.base_id) : '',
    equipment_type_id: '',
  });

  const [activeFilters, setActiveFilters] = useState({ ...filterDraft });

  const [bases, setBases] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State for Inspection
  const [inspectCategory, setInspectCategory] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load Filter Dropdown Options (Bases & Equipment Types)
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const response = await dashboardAPI.getFilters();
        if (response.data && response.data.success) {
          setBases(response.data.bases || []);
          setEquipmentTypes(response.data.equipmentTypes || []);
          if (isBaseCommander && user?.base_id) {
            setFilterDraft((prev) => ({ ...prev, base_id: String(user.base_id) }));
            setActiveFilters((prev) => ({ ...prev, base_id: String(user.base_id) }));
          }
        }
      } catch (err) {
        console.error('Failed to load filter options:', err);
      }
    };
    fetchFilters();
  }, [isBaseCommander, user?.base_id]);

  // Fetch Comprehensive Report Data from Backend API
  const loadReportData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const queryParams = {};
    if (activeFilters.date_from) queryParams.date_from = activeFilters.date_from;
    if (activeFilters.date_to) queryParams.date_to = activeFilters.date_to;
    if (activeFilters.base_id) queryParams.base_id = activeFilters.base_id;
    if (activeFilters.equipment_type_id) queryParams.equipment_type_id = activeFilters.equipment_type_id;

    try {
      const response = await reportsAPI.getSummary(queryParams);
      if (response.data && response.data.success) {
        setReportData(response.data.data);
      } else {
        setError('Unable to load report summary.');
      }
    } catch (err) {
      console.error('Report summary error:', err);
      setError(err.response?.data?.message || 'Failed to load report data from server.');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, [activeFilters]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // Filter actions
  const handleApplyFilters = (e) => {
    if (e) e.preventDefault();
    setActiveFilters({ ...filterDraft });
  };

  const handleClearFilters = () => {
    const reset = {
      date_from: '',
      date_to: '',
      base_id: isBaseCommander && user?.base_id ? String(user.base_id) : '',
      equipment_type_id: '',
    };
    setFilterDraft(reset);
    setActiveFilters(reset);
  };

  const handleOpenInspect = (category) => {
    setInspectCategory(category);
    setIsModalOpen(true);
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    if (!reportData) return;

    const { equipment_breakdown = [], base_breakdown = [] } = reportData;

    let csvContent = 'Equipment Type,Base,Opening Balance,Purchases,Transfer In,Transfer Out,Assigned,Expended,Closing Balance\n';

    // Append equipment breakdown rows
    equipment_breakdown.forEach((row) => {
      const line = [
        `"${row.equipment_name}"`,
        `"All Scoped Bases"`,
        row.opening_balance,
        row.purchases,
        row.transfer_in,
        row.transfer_out,
        row.assigned,
        row.expended,
        row.closing_balance,
      ].join(',');
      csvContent += line + '\n';
    });

    // Append base breakdown rows
    base_breakdown.forEach((row) => {
      const line = [
        `"All Equipment Types"`,
        `"${row.base_name} (${row.base_code})"`,
        row.opening_balance,
        row.purchases,
        row.transfer_in,
        row.transfer_out,
        row.assigned,
        row.expended,
        row.closing_balance,
      ].join(',');
      csvContent += line + '\n';
    });

    // Trigger CSV File Download in Browser
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = `AEGIS_MAMS_Report_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = reportData?.summary;
  const equipmentBreakdown = reportData?.equipment_breakdown || [];
  const baseBreakdown = reportData?.base_breakdown || [];
  const movementData = reportData?.movement_data || [];

  const isAllZero =
    summary &&
    summary.opening_balance === 0 &&
    summary.purchases === 0 &&
    summary.transfer_in === 0 &&
    summary.transfer_out === 0 &&
    summary.assigned === 0 &&
    summary.expended === 0 &&
    summary.closing_balance === 0;

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header flex-between">
        <div>
          <h2 className="page-title">Reports & Analytics</h2>
          <p className="page-subtitle">Operational asset movement, assignment and expenditure analysis</p>
        </div>

        <div className="header-actions">
          <button className="btn btn-secondary flex-align gap-2" onClick={handleExportCSV} disabled={!reportData || isAllZero}>
            <Download size={16} />
            <span>Export CSV</span>
          </button>
          <button className="icon-btn refresh-btn" onClick={loadReportData} title="Refresh Report Data">
            <RefreshCw size={18} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Report Filters Bar */}
      <form className="filters-bar-card" onSubmit={handleApplyFilters}>
        <div className="filters-title">
          <Filter size={16} />
          <span>REPORT FILTERS</span>
        </div>

        <div className="filters-grid">
          {/* Date From */}
          <div className="filter-group">
            <label htmlFor="filter-date-from">
              <Calendar size={14} />
              <span>Date From</span>
            </label>
            <input
              id="filter-date-from"
              type="date"
              value={filterDraft.date_from}
              onChange={(e) => setFilterDraft({ ...filterDraft, date_from: e.target.value })}
              className="filter-input"
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
              value={filterDraft.date_to}
              onChange={(e) => setFilterDraft({ ...filterDraft, date_to: e.target.value })}
              className="filter-input"
            />
          </div>

          {/* Base Filter */}
          <div className="filter-group">
            <label htmlFor="filter-base">
              <Building2 size={14} />
              <span>Base</span>
            </label>
            <select
              id="filter-base"
              value={filterDraft.base_id}
              onChange={(e) => setFilterDraft({ ...filterDraft, base_id: e.target.value })}
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
              value={filterDraft.equipment_type_id}
              onChange={(e) => setFilterDraft({ ...filterDraft, equipment_type_id: e.target.value })}
              className="filter-select"
            >
              <option value="">All Equipment Types</option>
              {equipmentTypes.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.name} ({eq.category})
                </option>
              ))}
            </select>
          </div>

          {/* Filter Action Buttons */}
          <div className="filter-action-group flex-align gap-2">
            <button type="submit" className="btn btn-primary btn-sm">
              Apply Filters
            </button>
            <button type="button" className="reset-filter-btn" onClick={handleClearFilters}>
              Clear Filters
            </button>
          </div>
        </div>
      </form>

      {/* Loading State */}
      {loading && (
        <div className="dashboard-loading-card">
          <div className="loading-spinner"></div>
          <p>Calculating logistics reports & aggregated balances...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="dashboard-error-card">
          <AlertCircle size={32} className="error-card-icon" />
          <p>{error}</p>
          <button className="retry-btn" onClick={loadReportData}>
            Retry Request
          </button>
        </div>
      )}

      {/* Main Report Content */}
      {!loading && !error && summary && (
        <>
          {/* Zero Data State Alert */}
          {isAllZero && (
            <div className="dashboard-info-card">
              <AlertCircle size={18} />
              <span>No report data available for the selected filters.</span>
            </div>
          )}

          {/* 1. Summary Cards Grid */}
          <div className="stat-cards-grid margin-bottom-lg">
            <StatCard
              title="Opening Balance"
              value={summary.opening_balance}
              icon={PackageCheck}
              accentColor="#64748b"
              subtitle="Stock Prior to Date Window"
            />

            <StatCard
              title="Purchases"
              value={summary.purchases}
              icon={ShoppingBag}
              accentColor="#3b82f6"
              subtitle="Procured Inventory"
              onClick={() => handleOpenInspect('Purchases')}
            />

            <StatCard
              title="Transfer In"
              value={summary.transfer_in}
              icon={ArrowDownLeft}
              accentColor="#10b981"
              subtitle="Incoming Relocations"
              onClick={() => handleOpenInspect('Transfer In')}
            />

            <StatCard
              title="Transfer Out"
              value={summary.transfer_out}
              icon={ArrowUpRight}
              accentColor="#f59e0b"
              subtitle="Outgoing Relocations"
              onClick={() => handleOpenInspect('Transfer Out')}
            />

            <StatCard
              title="Net Movement"
              value={summary.net_movement}
              icon={TrendingUp}
              isProminent={true}
              onClick={() => handleOpenInspect('Purchases')}
              accentColor={summary.net_movement >= 0 ? '#84cc16' : '#ef4444'}
              badge={summary.net_movement >= 0 ? '+NET POSITIVE' : '-NET DEFICIT'}
              subtitle="Purchases + In - Out"
            />

            <StatCard
              title="Assigned"
              value={summary.assigned}
              icon={UserCheck}
              accentColor="#8b5cf6"
              subtitle="Active Assignments"
              onClick={() => handleOpenInspect('Assigned')}
            />

            <StatCard
              title="Expended"
              value={summary.expended}
              icon={Flame}
              accentColor="#ef4444"
              subtitle="Consumed Inventory"
              onClick={() => handleOpenInspect('Expended')}
            />

            <StatCard
              title="Closing Balance"
              value={summary.closing_balance}
              icon={ShieldCheck}
              accentColor="#0ea5e9"
              subtitle="Ending Available Stock"
            />
          </div>

          {/* 2. Movement Analysis Chart */}
          <div className="dashboard-chart-section margin-bottom-lg">
            <MovementChart data={movementData} />
          </div>

          {/* 3. Equipment-Wise Report Table */}
          <div className="table-card margin-bottom-lg">
            <div className="card-header flex-between">
              <div className="flex-align gap-2">
                <Boxes size={18} className="text-emerald-500" />
                <h3 className="card-title">Equipment-Wise Report</h3>
              </div>
              <span className="badge badge-blue">AGGREGATED BY CATEGORY</span>
            </div>

            <div className="table-wrapper">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Equipment Type</th>
                    <th>Category</th>
                    <th className="text-right">Opening</th>
                    <th className="text-right">Purchases</th>
                    <th className="text-right">Transfer In</th>
                    <th className="text-right">Transfer Out</th>
                    <th className="text-right">Assigned</th>
                    <th className="text-right">Expended</th>
                    <th className="text-right">Closing</th>
                  </tr>
                </thead>
                <tbody>
                  {equipmentBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-6 text-muted">
                        No report data available for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    equipmentBreakdown.map((row) => (
                      <tr key={row.equipment_type_id}>
                        <td className="font-semibold">{row.equipment_name}</td>
                        <td><span className="badge badge-gray">{row.category}</span></td>
                        <td className="font-mono text-right">{row.opening_balance?.toLocaleString()}</td>
                        <td className="font-mono text-right text-blue-600">+{row.purchases?.toLocaleString()}</td>
                        <td className="font-mono text-right text-emerald-600">+{row.transfer_in?.toLocaleString()}</td>
                        <td className="font-mono text-right text-amber-600">-{row.transfer_out?.toLocaleString()}</td>
                        <td className="font-mono text-right text-purple-600">-{row.assigned?.toLocaleString()}</td>
                        <td className="font-mono text-right text-red-500">-{row.expended?.toLocaleString()}</td>
                        <td className="font-mono font-bold text-right text-sky-600">{row.closing_balance?.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Base-Wise Report Table */}
          <div className="table-card margin-bottom-lg">
            <div className="card-header flex-between">
              <div className="flex-align gap-2">
                <Building2 size={18} className="text-blue-500" />
                <h3 className="card-title">Base-Wise Report</h3>
              </div>
              <span className="badge badge-purple">SCOPED COMMAND STATIONS</span>
            </div>

            <div className="table-wrapper">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Base</th>
                    <th>Code</th>
                    <th className="text-right">Opening</th>
                    <th className="text-right">Purchases</th>
                    <th className="text-right">Transfer In</th>
                    <th className="text-right">Transfer Out</th>
                    <th className="text-right">Assigned</th>
                    <th className="text-right">Expended</th>
                    <th className="text-right">Closing</th>
                  </tr>
                </thead>
                <tbody>
                  {baseBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-6 text-muted">
                        No report data available for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    baseBreakdown.map((row) => (
                      <tr key={row.base_id}>
                        <td className="font-semibold">{row.base_name}</td>
                        <td className="font-mono text-muted">{row.base_code}</td>
                        <td className="font-mono text-right">{row.opening_balance?.toLocaleString()}</td>
                        <td className="font-mono text-right text-blue-600">+{row.purchases?.toLocaleString()}</td>
                        <td className="font-mono text-right text-emerald-600">+{row.transfer_in?.toLocaleString()}</td>
                        <td className="font-mono text-right text-amber-600">-{row.transfer_out?.toLocaleString()}</td>
                        <td className="font-mono text-right text-purple-600">-{row.assigned?.toLocaleString()}</td>
                        <td className="font-mono text-right text-red-500">-{row.expended?.toLocaleString()}</td>
                        <td className="font-mono font-bold text-right text-sky-600">{row.closing_balance?.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Drill-down Inspection Modal */}
      <ReportDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        category={inspectCategory}
        filters={activeFilters}
      />
    </div>
  );
}
