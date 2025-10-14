/**
 * Business Context Switcher
 *
 * Allows users with multi-business access to switch between business contexts.
 * Displays current business context and available businesses.
 */

import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { invalidatePermissionsCache } from '../lib/dynamicPermissions';

interface BusinessContext {
  business_id: string;
  business_name: string;
  business_role: string;
  ownership_pct: number;
  is_primary: boolean;
}

interface BusinessContextSwitcherProps {
  userId: string;
  currentBusinessId: string | null;
  onBusinessChange: (businessId: string) => void;
}

export function BusinessContextSwitcher({
  userId,
  currentBusinessId,
  onBusinessChange,
}: BusinessContextSwitcherProps) {
  const [businesses, setBusinesses] = useState<BusinessContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadBusinesses();
  }, [userId]);

  async function loadBusinesses() {
    try {
      setLoading(true);

      // Get user's business assignments
      const { data, error } = await supabase
        .from('user_business_roles')
        .select(`
          business_id,
          businesses (
            id,
            name
          ),
          roles (
            role_key
          ),
          ownership_percentage,
          is_primary
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('is_primary', { ascending: false });

      if (error) throw error;

      const businessContexts: BusinessContext[] = data.map((item: any) => ({
        business_id: item.business_id,
        business_name: item.businesses.name,
        business_role: item.roles?.role_key || 'unknown',
        ownership_pct: item.ownership_percentage || 0,
        is_primary: item.is_primary,
      }));

      setBusinesses(businessContexts);
    } catch (error) {
      console.error('Failed to load businesses:', error);
    } finally {
      setLoading(false);
    }
  }

  async function switchBusiness(businessId: string) {
    try {
      setSwitching(true);

      // Invalidate permissions cache for old and new context
      invalidatePermissionsCache(userId, currentBusinessId);
      invalidatePermissionsCache(userId, businessId);

      // Call callback to update parent state
      onBusinessChange(businessId);

      // Close dropdown
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to switch business:', error);
      alert('Failed to switch business context');
    } finally {
      setSwitching(false);
    }
  }

  const currentBusiness = businesses.find(b => b.business_id === currentBusinessId);

  if (loading) {
    return (
      <div className="business-context-switcher loading">
        Loading businesses...
      </div>
    );
  }

  // If user has no businesses or only one, don't show switcher
  if (businesses.length <= 1) {
    return null;
  }

  return (
    <div className="business-context-switcher">
      <button
        className="context-button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={switching}
      >
        <div className="context-info">
          <span className="context-label">Business:</span>
          <span className="context-value">
            {currentBusiness?.business_name || 'Select Business'}
          </span>
          {currentBusiness?.ownership_pct > 0 && (
            <span className="ownership-badge">
              {currentBusiness.ownership_pct}% owner
            </span>
          )}
        </div>
        <svg
          className={`dropdown-icon ${isOpen ? 'open' : ''}`}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      </button>

      {isOpen && (
        <div className="context-dropdown">
          <div className="dropdown-header">
            Switch Business Context
          </div>
          <div className="business-list">
            {businesses.map((business) => (
              <button
                key={business.business_id}
                className={`business-item ${
                  business.business_id === currentBusinessId ? 'active' : ''
                }`}
                onClick={() => switchBusiness(business.business_id)}
                disabled={switching || business.business_id === currentBusinessId}
              >
                <div className="business-details">
                  <div className="business-name">
                    {business.business_name}
                    {business.is_primary && (
                      <span className="primary-badge">Primary</span>
                    )}
                  </div>
                  <div className="business-meta">
                    <span className="role-badge">{business.business_role}</span>
                    {business.ownership_pct > 0 && (
                      <span className="ownership-info">
                        {business.ownership_pct}% ownership
                      </span>
                    )}
                  </div>
                </div>
                {business.business_id === currentBusinessId && (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="check-icon"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .business-context-switcher {
          position: relative;
        }

        .context-button {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .context-button:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .context-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .context-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .context-label {
          font-size: 12px;
          opacity: 0.7;
        }

        .context-value {
          font-size: 14px;
          font-weight: 600;
        }

        .ownership-badge {
          font-size: 11px;
          padding: 2px 6px;
          background: rgba(255, 215, 0, 0.2);
          border: 1px solid rgba(255, 215, 0, 0.4);
          border-radius: 4px;
          color: #ffd700;
        }

        .dropdown-icon {
          transition: transform 0.2s;
        }

        .dropdown-icon.open {
          transform: rotate(180deg);
        }

        .context-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 320px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          overflow: hidden;
          z-index: 1000;
        }

        .dropdown-header {
          padding: 12px 16px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-size: 14px;
          font-weight: 600;
        }

        .business-list {
          max-height: 400px;
          overflow-y: auto;
        }

        .business-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 12px 16px;
          border: none;
          border-bottom: 1px solid #e5e7eb;
          background: white;
          text-align: left;
          cursor: pointer;
          transition: background 0.2s;
        }

        .business-item:hover:not(:disabled) {
          background: #f9fafb;
        }

        .business-item:disabled {
          cursor: not-allowed;
        }

        .business-item.active {
          background: #eff6ff;
        }

        .business-item:last-child {
          border-bottom: none;
        }

        .business-details {
          flex: 1;
        }

        .business-name {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 4px;
        }

        .primary-badge {
          font-size: 10px;
          padding: 2px 6px;
          background: #dbeafe;
          border: 1px solid #3b82f6;
          border-radius: 4px;
          color: #1e40af;
          font-weight: 600;
        }

        .business-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #6b7280;
        }

        .role-badge {
          padding: 2px 8px;
          background: #f3f4f6;
          border-radius: 4px;
          color: #374151;
          font-weight: 500;
        }

        .ownership-info {
          color: #059669;
          font-weight: 500;
        }

        .check-icon {
          color: #10b981;
        }

        .loading {
          padding: 8px 16px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}
