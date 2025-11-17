/**
 * Enhanced Context Switcher Component
 *
 * Provides unified infrastructure and business context switching
 * with improved UX and performance
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ContextService, UserActiveContext, Infrastructure, Business } from '../services/modules';
import { hebrew } from '../lib/i18n';
import { Toast } from './Toast';
import { logger } from '../lib/logger';

interface EnhancedContextSwitcherProps {
  userId: string;
  onContextChanged?: (context: UserActiveContext) => void;
  compact?: boolean;
}

export function EnhancedContextSwitcher({
  userId,
  onContextChanged,
  compact = false
}: EnhancedContextSwitcherProps) {
  const [contextService] = useState(() => new ContextService(userId));
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const [currentContext, setCurrentContext] = useState<UserActiveContext | null>(null);
  const [infrastructure, setInfrastructure] = useState<Infrastructure | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);

  const [infrastructures, setInfrastructures] = useState<Infrastructure[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);

  useEffect(() => {
    loadContext();
  }, [userId]);

  useEffect(() => {
    if (currentContext?.infrastructure_id) {
      loadBusinessesForInfrastructure(currentContext.infrastructure_id);
    }
  }, [currentContext?.infrastructure_id]);

  const loadContext = async () => {
    try {
      setLoading(true);

      const [summary, availableInfrastructures] = await Promise.all([
        contextService.getContextSummary(),
        contextService.listInfrastructures()
      ]);

      setCurrentContext(summary.context);
      setInfrastructure(summary.infrastructure);
      setBusiness(summary.business);
      setInfrastructures(availableInfrastructures);

      if (!summary.context) {
        await initializeDefaultContext(availableInfrastructures);
      }
    } catch (error) {
      logger.error('Failed to load context:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultContext = async (availableInfrastructures: Infrastructure[]) => {
    try {
      if (availableInfrastructures.length === 0) {
        return;
      }

      const newContext = await contextService.initializeContext();
      setCurrentContext(newContext);

      const infra = availableInfrastructures.find(i => i.id === newContext.infrastructure_id);
      setInfrastructure(infra || null);

      if (onContextChanged) {
        onContextChanged(newContext);
      }
    } catch (error) {
      logger.error('Failed to initialize context:', error);
    }
  };

  const loadBusinessesForInfrastructure = async (infrastructureId: string) => {
    try {
      const businessList = await contextService.listBusinessesByInfrastructure(infrastructureId);
      setBusinesses(businessList);
    } catch (error) {
      logger.error('Failed to load businesses:', error);
    }
  };

  const handleSwitchInfrastructure = async (infrastructureId: string) => {
    try {
      setSwitching(true);

      const newContext = await contextService.switchToInfrastructure(infrastructureId);

      setCurrentContext(newContext);
      const infra = infrastructures.find(i => i.id === infrastructureId);
      setInfrastructure(infra || null);
      setBusiness(null);
      setShowDropdown(false);

      if (onContextChanged) {
        onContextChanged(newContext);
      }

      Toast.show(
        `${hebrew.common.switched}: ${infra?.display_name || ''}`,
        'success'
      );
    } catch (error) {
      logger.error('Failed to switch infrastructure:', error);
      Toast.show(hebrew.errors.updateFailed, 'error');
    } finally {
      setSwitching(false);
    }
  };

  const handleSwitchBusiness = async (businessId: string) => {
    try {
      setSwitching(true);

      const newContext = await contextService.switchToBusiness(businessId);

      setCurrentContext(newContext);
      const biz = businesses.find(b => b.id === businessId);
      setBusiness(biz || null);
      setShowDropdown(false);

      if (onContextChanged) {
        onContextChanged(newContext);
      }

      Toast.show(
        `${hebrew.common.switched}: ${biz?.name || ''}`,
        'success'
      );
    } catch (error) {
      logger.error('Failed to switch business:', error);
      Toast.show(hebrew.errors.updateFailed, 'error');
    } finally {
      setSwitching(false);
    }
  };

  const handleClearBusiness = async () => {
    if (!currentContext?.infrastructure_id) return;

    try {
      setSwitching(true);

      const newContext = await contextService.switchToInfrastructure(
        currentContext.infrastructure_id
      );

      setCurrentContext(newContext);
      setBusiness(null);
      setShowDropdown(false);

      if (onContextChanged) {
        onContextChanged(newContext);
      }

      Toast.show(hebrew.common.cleared, 'success');
    } catch (error) {
      logger.error('Failed to clear business:', error);
      Toast.show(hebrew.errors.updateFailed, 'error');
    } finally {
      setSwitching(false);
    }
  };

  if (loading) {
    return (
      <div className="context-switcher loading">
        <div className="skeleton-line" style={{ width: '150px', height: '20px' }} />
      </div>
    );
  }

  if (infrastructures.length === 0) {
    return null;
  }

  const currentDisplay = business
    ? business.name
    : infrastructure
    ? infrastructure.display_name
    : hebrew.common.selectContext;

  return (
    <div className={`context-switcher ${compact ? 'compact' : ''}`}>
      <button
        className="context-button"
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={switching}
      >
        <div className="context-info">
          <span className="context-label">{hebrew.common.context}</span>
          <span className="context-value">{currentDisplay}</span>
          {business && (
            <span className="context-sublabel">
              {infrastructure?.display_name}
            </span>
          )}
        </div>
        <svg
          className={`dropdown-icon ${showDropdown ? 'open' : ''}`}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      </button>

      {showDropdown && (
        <>
          <div className="dropdown-overlay" onClick={() => setShowDropdown(false)} />
          <div className="context-dropdown">
            <div className="dropdown-section">
              <div className="dropdown-header">{hebrew.common.infrastructure}</div>
              {infrastructures.map((infra) => (
                <button
                  key={infra.id}
                  className={`dropdown-item ${
                    currentContext?.infrastructure_id === infra.id ? 'active' : ''
                  }`}
                  onClick={() => handleSwitchInfrastructure(infra.id)}
                  disabled={switching}
                >
                  <span>{infra.display_name}</span>
                  {currentContext?.infrastructure_id === infra.id && (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M13 4L6 11l-3-3" stroke="currentColor" strokeWidth="2" fill="none" />
                    </svg>
                  )}
                </button>
              ))}
            </div>

            {businesses.length > 0 && (
              <div className="dropdown-section">
                <div className="dropdown-header">
                  {hebrew.common.business}
                  {business && (
                    <button
                      className="clear-button"
                      onClick={handleClearBusiness}
                      disabled={switching}
                    >
                      {hebrew.common.clear}
                    </button>
                  )}
                </div>
                {businesses.map((biz) => (
                  <button
                    key={biz.id}
                    className={`dropdown-item ${
                      currentContext?.business_id === biz.id ? 'active' : ''
                    }`}
                    onClick={() => handleSwitchBusiness(biz.id)}
                    disabled={switching}
                  >
                    <span>{biz.name}</span>
                    {currentContext?.business_id === biz.id && (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M13 4L6 11l-3-3" stroke="currentColor" strokeWidth="2" fill="none" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <style>{`
        .context-switcher {
          position: relative;
          z-index: 100;
        }

        .context-switcher.compact .context-button {
          padding: 8px 12px;
          font-size: 14px;
        }

        .context-button {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
          width: 100%;
          text-align: right;
        }

        .context-button:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .context-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .context-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          align-items: flex-end;
        }

        .context-label {
          font-size: 12px;
          opacity: 0.7;
        }

        .context-value {
          font-size: 14px;
          font-weight: 600;
        }

        .context-sublabel {
          font-size: 11px;
          opacity: 0.6;
        }

        .dropdown-icon {
          transition: transform 0.2s;
        }

        .dropdown-icon.open {
          transform: rotate(180deg);
        }

        .dropdown-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 99;
        }

        .context-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          background: #1a1a2e;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
          z-index: 100;
          max-height: 400px;
          overflow-y: auto;
        }

        .dropdown-section {
          padding: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .dropdown-section:last-child {
          border-bottom: none;
        }

        .dropdown-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.6);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .clear-button {
          padding: 4px 8px;
          font-size: 11px;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 4px;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .clear-button:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 10px 12px;
          background: transparent;
          border: none;
          border-radius: 4px;
          color: white;
          text-align: right;
          cursor: pointer;
          transition: all 0.2s;
          margin: 2px 0;
        }

        .dropdown-item:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .dropdown-item.active {
          background: rgba(76, 175, 80, 0.2);
          font-weight: 600;
        }

        .dropdown-item:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .skeleton-line {
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.05) 25%,
            rgba(255, 255, 255, 0.1) 50%,
            rgba(255, 255, 255, 0.05) 75%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
        }

        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
    </div>
  );
}
