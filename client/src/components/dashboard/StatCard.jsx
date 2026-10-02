import React from 'react';

export default function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  badge,
  isProminent = false,
  onClick = null,
  accentColor = 'var(--olive-green)',
}) {
  const formattedValue = typeof value === 'number' ? value.toLocaleString() : (value || '0');
  const isClickable = typeof onClick === 'function';

  return (
    <div
      className={`stat-card ${isProminent ? 'stat-card-prominent' : ''} ${isClickable ? 'stat-card-clickable' : ''}`}
      onClick={isClickable ? onClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="stat-card-header">
        <span className="stat-card-title">{title}</span>
        {Icon && (
          <div className="stat-card-icon" style={{ color: accentColor, backgroundColor: `${accentColor}15` }}>
            <Icon size={20} />
          </div>
        )}
      </div>

      <div className="stat-card-body">
        <span className="stat-card-value" style={isProminent ? { color: accentColor } : undefined}>
          {formattedValue}
        </span>
        {badge && <span className="stat-card-badge">{badge}</span>}
      </div>

      {subtitle && <p className="stat-card-subtitle">{subtitle}</p>}

      {isClickable && (
        <div className="stat-card-action-hint">
          <span>Click to view itemized records</span>
          <span className="hint-arrow">→</span>
        </div>
      )}
    </div>
  );
}
