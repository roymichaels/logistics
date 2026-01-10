import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBusinessContext } from '../context/BusinessContext';
import { logger } from '../lib/logger';
import { auditLog } from '../services/auditLog';

interface CommandAction {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  keywords?: string[];
  category: 'navigation' | 'action' | 'business' | 'recent';
  action: () => void;
  requiredRole?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export function CommandPalette({ isOpen, onClose, onNavigate }: CommandPaletteProps) {
  const { user, role } = useAuth();
  const { businesses, activeBusiness, setActiveBusiness } = useBusinessContext();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentActions, setRecentActions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Define all available commands
  const allCommands = useMemo((): CommandAction[] => {
    const commands: CommandAction[] = [
      // Navigation commands
      {
        id: 'nav-dashboard',
        label: 'Go to Dashboard',
        description: 'View your main dashboard',
        icon: '📊',
        keywords: ['dashboard', 'home', 'main'],
        category: 'navigation',
        action: () => {
          onNavigate('/business/dashboard');
          trackAction('nav-dashboard');
        },
      },
      {
        id: 'nav-orders',
        label: 'View Orders',
        description: 'Manage all orders',
        icon: '📦',
        keywords: ['orders', 'deliveries', 'shipments'],
        category: 'navigation',
        action: () => {
          onNavigate('/business/orders');
          trackAction('nav-orders');
        },
      },
      {
        id: 'nav-products',
        label: 'View Products',
        description: 'Browse product catalog',
        icon: '🛍️',
        keywords: ['products', 'catalog', 'items'],
        category: 'navigation',
        action: () => {
          onNavigate('/business/products');
          trackAction('nav-products');
        },
      },
      {
        id: 'nav-inventory',
        label: 'View Inventory',
        description: 'Check stock levels',
        icon: '📊',
        keywords: ['inventory', 'stock', 'warehouse'],
        category: 'navigation',
        action: () => {
          onNavigate('/business/inventory');
          trackAction('nav-inventory');
        },
      },
      {
        id: 'nav-drivers',
        label: 'Manage Drivers',
        description: 'View and assign drivers',
        icon: '🚚',
        keywords: ['drivers', 'delivery', 'courier'],
        category: 'navigation',
        action: () => {
          onNavigate('/business/drivers');
          trackAction('nav-drivers');
        },
        requiredRole: ['business_owner', 'manager', 'dispatcher'],
      },
      {
        id: 'nav-team',
        label: 'Manage Team',
        description: 'Team members and permissions',
        icon: '👥',
        keywords: ['team', 'staff', 'employees', 'users'],
        category: 'navigation',
        action: () => {
          onNavigate('/business/team');
          trackAction('nav-team');
        },
        requiredRole: ['business_owner', 'manager'],
      },
      {
        id: 'nav-analytics',
        label: 'View Analytics',
        description: 'Business insights and reports',
        icon: '📈',
        keywords: ['analytics', 'reports', 'insights', 'stats'],
        category: 'navigation',
        action: () => {
          onNavigate('/business/analytics');
          trackAction('nav-analytics');
        },
      },
      {
        id: 'nav-settings',
        label: 'Open Settings',
        description: 'Business settings and configuration',
        icon: '⚙️',
        keywords: ['settings', 'config', 'preferences'],
        category: 'navigation',
        action: () => {
          onNavigate('/business/settings');
          trackAction('nav-settings');
        },
      },
      {
        id: 'nav-chat',
        label: 'Open Messages',
        description: 'View conversations',
        icon: '💬',
        keywords: ['chat', 'messages', 'conversations'],
        category: 'navigation',
        action: () => {
          onNavigate('/business/chat');
          trackAction('nav-chat');
        },
      },
      // Action commands
      {
        id: 'action-new-order',
        label: 'Create New Order',
        description: 'Start a new order',
        icon: '➕',
        keywords: ['new', 'create', 'order', 'add'],
        category: 'action',
        action: () => {
          onNavigate('/business/orders?action=create');
          trackAction('action-new-order');
        },
      },
      {
        id: 'action-new-product',
        label: 'Add New Product',
        description: 'Add product to catalog',
        icon: '➕',
        keywords: ['new', 'create', 'product', 'add', 'item'],
        category: 'action',
        action: () => {
          onNavigate('/business/products?action=create');
          trackAction('action-new-product');
        },
      },
    ];

    // Add business switching commands
    if (role === 'business_owner' && businesses.length > 1) {
      businesses.forEach(business => {
        commands.push({
          id: `switch-${business.id}`,
          label: `Switch to ${business.name}`,
          description: 'Change active business',
          icon: '🏢',
          keywords: ['switch', 'business', business.name.toLowerCase()],
          category: 'business',
          action: () => {
            setActiveBusiness(business.id);
            if (user) {
              auditLog.businessSwitch(user.id, business.id, business.name);
            }
            trackAction(`switch-${business.id}`);
            onClose();
          },
        });
      });

      commands.push({
        id: 'nav-comparison',
        label: 'Compare Businesses',
        description: 'View business comparison dashboard',
        icon: '⚖️',
        keywords: ['compare', 'comparison', 'businesses', 'portfolio'],
        category: 'business',
        action: () => {
          onNavigate('/business/comparison');
          trackAction('nav-comparison');
        },
      });
    }

    return commands;
  }, [businesses, role, onNavigate, setActiveBusiness, user]);

  // Filter commands based on query and role
  const filteredCommands = useMemo(() => {
    let filtered = allCommands;

    // Filter by role
    if (role) {
      filtered = filtered.filter(cmd =>
        !cmd.requiredRole || cmd.requiredRole.includes(role)
      );
    }

    // Filter by search query
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(cmd => {
        const searchableText = [
          cmd.label,
          cmd.description || '',
          ...(cmd.keywords || []),
        ].join(' ').toLowerCase();

        return searchableText.includes(lowerQuery);
      });
    }

    // Add recent actions at the top
    if (!query.trim() && recentActions.length > 0) {
      const recentCommands = recentActions
        .slice(0, 3)
        .map(actionId => allCommands.find(cmd => cmd.id === actionId))
        .filter(Boolean) as CommandAction[];

      filtered = [
        ...recentCommands.map(cmd => ({ ...cmd, category: 'recent' as const })),
        ...filtered.filter(cmd => !recentActions.includes(cmd.id)),
      ];
    }

    return filtered;
  }, [allCommands, query, role, recentActions]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandAction[]> = {
      recent: [],
      navigation: [],
      action: [],
      business: [],
    };

    filteredCommands.forEach(cmd => {
      groups[cmd.category].push(cmd);
    });

    return groups;
  }, [filteredCommands]);

  const trackAction = (actionId: string) => {
    const updated = [actionId, ...recentActions.filter(id => id !== actionId)].slice(0, 10);
    setRecentActions(updated);
    localStorage.setItem('command_palette_recent', JSON.stringify(updated));
  };

  useEffect(() => {
    const stored = localStorage.getItem('command_palette_recent');
    if (stored) {
      try {
        setRecentActions(JSON.parse(stored));
      } catch (e) {
        logger.error('[CommandPalette] Failed to parse recent actions', e);
      }
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredCommands[selectedIndex];
      if (selected) {
        selected.action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleCommandClick = (command: CommandAction) => {
    command.action();
    onClose();
  };

  if (!isOpen) return null;

  const categoryLabels: Record<string, string> = {
    recent: 'Recent',
    navigation: 'Navigation',
    action: 'Actions',
    business: 'Businesses',
  };

  return (
    <>
      <style>{`
        @keyframes commandPaletteFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes commandPaletteSlideIn {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 10000,
          animation: 'commandPaletteFadeIn 0.15s ease-out',
        }}
      />

      {/* Command Palette */}
      <div
        style={{
          position: 'fixed',
          top: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '640px',
          maxHeight: '70vh',
          backgroundColor: 'rgba(17, 24, 39, 0.98)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          zIndex: 10001,
          display: 'flex',
          flexDirection: 'column',
          animation: 'commandPaletteSlideIn 0.2s ease-out',
        }}
      >
        {/* Search Input */}
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              color: 'rgba(255, 255, 255, 0.95)',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Commands List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px',
        }}>
          {filteredCommands.length === 0 ? (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '14px',
            }}>
              No commands found
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, commands]) => {
              if (commands.length === 0) return null;

              return (
                <div key={category} style={{ marginBottom: '12px' }}>
                  <div style={{
                    padding: '8px 12px',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: 'rgba(255, 255, 255, 0.5)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    {categoryLabels[category]}
                  </div>

                  {commands.map((command, index) => {
                    const globalIndex = filteredCommands.indexOf(command);
                    const isSelected = globalIndex === selectedIndex;

                    return (
                      <button
                        key={command.id}
                        onClick={() => handleCommandClick(command)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: isSelected
                            ? 'rgba(59, 130, 246, 0.15)'
                            : 'transparent',
                          color: 'rgba(255, 255, 255, 0.9)',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.1s ease',
                          fontFamily: 'inherit',
                        }}
                      >
                        <span style={{ fontSize: '20px' }}>{command.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: '500',
                            marginBottom: '2px',
                          }}>
                            {command.label}
                          </div>
                          {command.description && (
                            <div style={{
                              fontSize: '12px',
                              color: 'rgba(255, 255, 255, 0.5)',
                            }}>
                              {command.description}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          gap: '16px',
          fontSize: '11px',
          color: 'rgba(255, 255, 255, 0.4)',
        }}>
          <span><kbd>↑↓</kbd> Navigate</span>
          <span><kbd>Enter</kbd> Select</span>
          <span><kbd>Esc</kbd> Close</span>
        </div>
      </div>
    </>
  );
}
