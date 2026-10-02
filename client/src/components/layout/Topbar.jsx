import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Bell, User, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const routeTitles = {
  '/': 'Dashboard',
  '/assets': 'Assets Management',
  '/purchases': 'Purchases & Procurement',
  '/transfers': 'Asset Transfers',
  '/assignments': 'Personnel Assignments',
  '/expenditures': 'Expenditures & Consumption',
  '/audit-logs': 'Audit Logs',
};

export default function Topbar({ onToggleSidebar }) {
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { user, logout } = useAuth();

  const pageTitle = routeTitles[location.pathname] || 'Dashboard';

  // Format user role for display
  const formatRole = (role) => {
    if (!role) return 'Personnel';
    if (role === 'admin') return 'Administrator';
    if (role === 'base_commander') return 'Base Commander';
    if (role === 'logistics_officer') return 'Logistics Officer';
    return role.replace('_', ' ');
  };

  // Get user initials
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'US';

  // Close profile dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="menu-toggle-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
        >
          <Menu size={22} />
        </button>
        <h1 className="topbar-page-title">{pageTitle}</h1>
      </div>

      <div className="topbar-right">
        {/* Notification Icon */}
        <button
          className="icon-btn notification-btn"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell size={20} />
          <span className="notification-badge"></span>
        </button>

        <div className="topbar-divider"></div>

        {/* Profile Dropdown Area */}
        <div className="profile-dropdown-wrapper" ref={dropdownRef}>
          <button
            className="profile-btn"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            aria-expanded={isProfileOpen}
            aria-haspopup="true"
            aria-label="User profile menu"
          >
            <div className="avatar-circle">{initials}</div>
            <div className="user-info">
              <span className="user-name">{user?.name || 'User'}</span>
              <span className="user-role">{formatRole(user?.role)}</span>
            </div>
            <ChevronDown size={16} className={`chevron-icon ${isProfileOpen ? 'open' : ''}`} />
          </button>

          {isProfileOpen && (
            <div className="profile-dropdown-menu" role="menu">
              <div className="dropdown-user-header">
                <span className="dropdown-user-name">{user?.name || 'User'}</span>
                <span className="dropdown-user-email">{user?.email || 'user@aegis.local'}</span>
              </div>
              <div className="dropdown-divider"></div>
              <button
                className="dropdown-item"
                role="menuitem"
                onClick={() => setIsProfileOpen(false)}
              >
                <User size={16} />
                <span>Profile</span>
              </button>
              <button
                className="dropdown-item dropdown-item-danger"
                role="menuitem"
                onClick={() => {
                  setIsProfileOpen(false);
                  logout();
                }}
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
