import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ArrowLeftRight,
  UserCheck,
  Receipt,
  History,
  BarChart3,
  Shield,
  X
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Assets', path: '/assets', icon: Package },
  { name: 'Purchases', path: '/purchases', icon: ShoppingCart },
  { name: 'Transfers', path: '/transfers', icon: ArrowLeftRight },
  { name: 'Assignments', path: '/assignments', icon: UserCheck },
  { name: 'Expenditures', path: '/expenditures', icon: Receipt },
  { name: 'Reports', path: '/reports', icon: BarChart3 },
  { name: 'Audit Logs', path: '/audit-logs', icon: History },
];

export default function Sidebar({ isOpen, onClose }) {
  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <Shield size={22} />
          </div>
          <div className="brand-text">
            <h1 className="brand-title">AEGIS MAMS</h1>
            <span className="brand-subtitle">Military Asset & Strategic Logistics Command</span>
          </div>
        </div>
        <button
          className="sidebar-close-btn"
          onClick={onClose}
          aria-label="Close sidebar navigation"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        <div className="nav-group-title">MAIN MENU</div>
        <ul className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path} className="nav-item">
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'active' : ''}`
                  }
                  onClick={onClose}
                >
                  <Icon size={18} className="nav-icon" />
                  <span className="nav-label">{item.name}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* System Status Footer */}
      <div className="sidebar-footer">
        <div className="system-status-card">
          <div className="status-header">
            <span className="status-dot"></span>
            <span className="status-title">System Status</span>
          </div>
          <span className="status-badge">Operational</span>
        </div>
      </div>
    </aside>
  );
}
