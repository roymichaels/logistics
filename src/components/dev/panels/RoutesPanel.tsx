import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BUSINESS_SHELL_NAV,
  DRIVER_SHELL_NAV,
  STORE_SHELL_NAV,
  getNavigationForRole
} from '../../../shells/navigationSchema';
import { localSessionManager } from '../../../lib/localSessionManager';
import type { UserRole, NavigationItem } from '../../../shells/types';

const ROLE_OVERRIDE_KEY = 'dev-console:role-override';

interface RouteInfo extends NavigationItem {
  shellType: 'Business' | 'Driver' | 'Store' | 'System';
}

function getAllRoutes(): RouteInfo[] {
  const routes: RouteInfo[] = [];

  BUSINESS_SHELL_NAV.forEach(item => {
    routes.push({ ...item, shellType: 'Business' });
  });

  DRIVER_SHELL_NAV.forEach(item => {
    routes.push({ ...item, shellType: 'Driver' });
  });

  STORE_SHELL_NAV.forEach(item => {
    routes.push({ ...item, shellType: 'Store' });
  });

  routes.push({
    id: 'auth-login',
    label: 'Login',
    path: '/auth/login',
    icon: '🔑',
    visible: true,
    shellType: 'System'
  });

  routes.push({
    id: 'role-selection',
    label: 'Role Selection',
    path: '/role-selection',
    icon: '👥',
    visible: true,
    shellType: 'System'
  });

  return routes;
}

export function RoutesPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showOnlyAccessible, setShowOnlyAccessible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const currentSession = localSessionManager.getSession();
  const currentRole = (localStorage.getItem(ROLE_OVERRIDE_KEY) || currentSession?.role || 'customer') as UserRole;

  const accessibleRoutes = useMemo(() => {
    const accessible = getNavigationForRole(currentRole);
    return new Set(accessible.map(r => r.path));
  }, [currentRole]);

  const allRoutes = useMemo(() => getAllRoutes(), []);

  const filteredRoutes = useMemo(() => {
    let routes = allRoutes;

    if (showOnlyAccessible) {
      routes = routes.filter(r => accessibleRoutes.has(r.path));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      routes = routes.filter(r =>
        r.label.toLowerCase().includes(query) ||
        r.path.toLowerCase().includes(query) ||
        r.id.toLowerCase().includes(query)
      );
    }

    return routes;
  }, [allRoutes, showOnlyAccessible, searchQuery, accessibleRoutes]);

  const groupedRoutes = useMemo(() => {
    const groups: Record<string, RouteInfo[]> = {};
    filteredRoutes.forEach(route => {
      if (!groups[route.shellType]) {
        groups[route.shellType] = [];
      }
      groups[route.shellType].push(route);
    });
    return groups;
  }, [filteredRoutes]);

  const shellOrder = ['Business', 'Driver', 'Store', 'System'];

  const isRouteAccessible = (route: RouteInfo) => {
    return accessibleRoutes.has(route.path);
  };

  const getRoleBadges = (route: RouteInfo) => {
    if (!route.requiredRoles || route.requiredRoles.length === 0) {
      return ['all'];
    }
    return route.requiredRoles;
  };

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div
        style={{
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
        }}
      >
        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
          Current Path
        </div>
        <div
          style={{
            fontSize: '13px',
            fontWeight: '600',
            color: '#60a5fa',
            fontFamily: 'monospace',
          }}
        >
          {location.pathname}
        </div>
        <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)', marginTop: '4px' }}>
          Role: <span style={{ color: '#a78bfa', fontWeight: '500' }}>{currentRole}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <input
          type="text"
          placeholder="Search routes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '12px',
            outline: 'none',
          }}
        />

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.7)',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={showOnlyAccessible}
            onChange={(e) => setShowOnlyAccessible(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          Show only my accessible routes
        </label>
      </div>

      <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>
        Found {filteredRoutes.length} routes
      </div>

      {shellOrder.map((shellType) => {
        const routes = groupedRoutes[shellType];
        if (!routes || routes.length === 0) return null;

        return (
          <div key={shellType}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: '600',
                color: 'rgba(255, 255, 255, 0.5)',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>{getShellIcon(shellType)}</span>
              <span>{shellType} Shell</span>
              <span style={{ color: 'rgba(255, 255, 255, 0.3)' }}>({routes.length})</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {routes.map((route) => {
                const isActive = location.pathname === route.path;
                const isAccessible = isRouteAccessible(route);
                const roleBadges = getRoleBadges(route);

                return (
                  <button
                    key={route.path}
                    onClick={() => handleNavigate(route.path)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: isActive
                        ? 'rgba(59, 130, 246, 0.15)'
                        : isAccessible
                          ? 'rgba(34, 197, 94, 0.05)'
                          : 'rgba(255, 255, 255, 0.02)',
                      color: isActive
                        ? '#60a5fa'
                        : isAccessible
                          ? 'rgba(255, 255, 255, 0.8)'
                          : 'rgba(255, 255, 255, 0.4)',
                      fontSize: '13px',
                      fontWeight: isActive ? '500' : '400',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      textAlign: 'left',
                      gap: '6px',
                      opacity: isAccessible ? 1 : 0.6,
                      borderLeft: isAccessible ? '3px solid rgba(34, 197, 94, 0.5)' : '3px solid transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = isAccessible
                          ? 'rgba(34, 197, 94, 0.1)'
                          : 'rgba(255, 255, 255, 0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = isActive
                          ? 'rgba(59, 130, 246, 0.15)'
                          : isAccessible
                            ? 'rgba(34, 197, 94, 0.05)'
                            : 'rgba(255, 255, 255, 0.02)';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {route.icon && <span>{route.icon}</span>}
                        <span>{route.label}</span>
                      </div>
                      {isAccessible && (
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(34, 197, 94, 0.2)',
                            color: '#4ade80',
                          }}
                        >
                          ✓
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        color: 'rgba(255, 255, 255, 0.3)',
                      }}
                    >
                      {route.path}
                    </div>
                    {route.description && (
                      <div
                        style={{
                          fontSize: '10px',
                          color: 'rgba(255, 255, 255, 0.3)',
                          fontStyle: 'italic',
                        }}
                      >
                        {route.description}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                      {roleBadges.map((role) => (
                        <span
                          key={role}
                          style={{
                            fontSize: '9px',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            backgroundColor: role === currentRole
                              ? 'rgba(139, 92, 246, 0.2)'
                              : 'rgba(255, 255, 255, 0.05)',
                            color: role === currentRole
                              ? '#a78bfa'
                              : 'rgba(255, 255, 255, 0.4)',
                            border: role === currentRole
                              ? '1px solid rgba(139, 92, 246, 0.3)'
                              : '1px solid transparent',
                          }}
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getShellIcon(shellType: string): string {
  const icons: Record<string, string> = {
    Business: '🏢',
    Driver: '🚗',
    Store: '🛒',
    System: '⚙️',
  };
  return icons[shellType] || '📌';
}
