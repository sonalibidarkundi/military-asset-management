import React from 'react';
import { Activity } from 'lucide-react';

export default function MovementChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="movement-chart-card">
        <div className="chart-header">
          <h3>Asset Movement Breakdown</h3>
        </div>
        <div className="chart-empty-state">
          <p>No movement data available for selected filters.</p>
        </div>
      </div>
    );
  }

  // Calculate max value for scaling bar lengths
  const maxValue = Math.max(...data.map((d) => d.value || 0), 1);

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Purchases':
        return '#3b82f6'; // Blue
      case 'Transfer In':
        return '#10b981'; // Green
      case 'Transfer Out':
        return '#f59e0b'; // Amber
      case 'Assigned':
        return '#8b5cf6'; // Purple
      case 'Expended':
        return '#ef4444'; // Red
      default:
        return '#84cc16'; // Lime
    }
  };

  return (
    <div className="movement-chart-card">
      <div className="chart-header">
        <div className="chart-title-group">
          <Activity size={18} className="chart-header-icon" />
          <h3>Asset Movement Breakdown</h3>
        </div>
        <span className="chart-subtitle-badge">REAL-TIME LOGISTICS DATA</span>
      </div>

      <div className="chart-body">
        <div className="bars-container">
          {data.map((item) => {
            const val = item.value || 0;
            const percentage = Math.min(100, Math.round((val / maxValue) * 100));
            const barColor = getCategoryColor(item.category);

            return (
              <div key={item.category} className="bar-row">
                <div className="bar-label-group">
                  <span className="bar-label">{item.category}</span>
                  <span className="bar-value-text">{val.toLocaleString()}</span>
                </div>

                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${Math.max(percentage, val > 0 ? 3 : 0)}%`,
                      backgroundColor: barColor,
                      boxShadow: `0 0 10px ${barColor}40`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
