import React, { useState, useEffect } from 'react';
import { DataStore, User, UserBusinessAccess } from '../data/types';
import { ROYAL_COLORS } from '../styles/royalTheme';
import { hebrew } from '../lib/hebrew';
import { Toast } from './Toast';

interface BusinessContextSelectorProps {
  dataStore: DataStore;
  user: User | null;
  onContextChanged?: (businessId: string) => void;
}

export function BusinessContextSelector({
  dataStore,
  user,
  onContextChanged
}: BusinessContextSelectorProps) {
  const [businesses, setBusinesses] = useState<UserBusinessAccess[]>([]);
  const [activeBusinessId, setActiveBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    loadBusinessContext();
  }, [user]);

  const loadBusinessContext = async () => {
    if (!user || !dataStore.getUserBusinesses) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const userBusinesses = await dataStore.getUserBusinesses();
      setBusinesses(userBusinesses);

      if (dataStore.getActiveBusinessContext) {
        const context = await dataStore.getActiveBusinessContext();
        if (context?.active_business_id) {
          setActiveBusinessId(context.active_business_id);
          if (onContextChanged) {
            onContextChanged(context.active_business_id);
          }
        } else if (userBusinesses.length > 0) {
          const primaryBusiness = userBusinesses.find(b => b.is_primary);
          const defaultBusiness = primaryBusiness || userBusinesses[0];
          await switchBusiness(defaultBusiness.business_id, userBusinesses);
        }
      }
    } catch (error) {
      console.error('Failed to load business context:', error);
      // Don't show error toast during initialization - business features may not be implemented yet
      // Toast.show(hebrew.errors.loadFailed, 'error');
    } finally {
      setLoading(false);
    }
  };

  const switchBusiness = async (
    businessId: string,
    availableBusinesses: UserBusinessAccess[] = businesses
  ) => {
    if (!dataStore.setActiveBusinessContext) {
      return;
    }

    try {
      if (businessId === activeBusinessId) {
        if (onContextChanged) {
          onContextChanged(businessId);
        }
        setShowDropdown(false);
        return;
      }

      await dataStore.setActiveBusinessContext(businessId);
      setActiveBusinessId(businessId);
      setShowDropdown(false);

      if (onContextChanged) {
        onContextChanged(businessId);
      }

      const lookupBusinesses = availableBusinesses.length > 0 ? availableBusinesses : businesses;
      const business = lookupBusinesses.find(b => b.business_id === businessId);
      Toast.show(
        hebrew.common.switched + ': ' + (business?.business_name || ''),
        'success'
      );
    } catch (error) {
      console.error('Failed to switch business context:', error);
      Toast.show(hebrew.errors.switchFailed, 'error');
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loader}>{hebrew.common.loading}...</div>
      </div>
    );
  }

  if (businesses.length === 0) {
    return null;
  }

  if (businesses.length === 1) {
    const business = businesses[0];
    return (
      <div style={styles.container}>
        <div style={styles.singleBusiness}>
          <div style={styles.businessIcon}>🏢</div>
          <div style={styles.businessInfo}>
            <div style={styles.businessName}>{business.business_name}</div>
            <div style={styles.businessRole}>
              {getRoleLabel(business.business_role)}
              {business.ownership_pct > 0 && (
                <span style={styles.ownership}>
                  {' '}• {business.ownership_pct}% {hebrew.common.ownership}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activeBusiness = businesses.find(b => b.business_id === activeBusinessId);

  return (
    <div style={styles.container}>
      <div
        style={styles.selector}
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <div style={styles.businessIcon}>🏢</div>
        <div style={styles.businessInfo}>
          <div style={styles.businessName}>
            {activeBusiness?.business_name || hebrew.common.selectBusiness}
          </div>
          {activeBusiness && (
            <div style={styles.businessRole}>
              {getRoleLabel(activeBusiness.business_role)}
              {activeBusiness.ownership_pct > 0 && (
                <span style={styles.ownership}>
                  {' '}• {activeBusiness.ownership_pct}%
                </span>
              )}
            </div>
          )}
        </div>
        <div style={styles.arrow}>{showDropdown ? '▲' : '▼'}</div>
      </div>

      {showDropdown && (
        <div style={styles.dropdown}>
          {businesses.map(business => (
            <div
              key={business.business_id}
              style={{
                ...styles.dropdownItem,
                ...(business.business_id === activeBusinessId
                  ? styles.dropdownItemActive
                  : {})
              }}
              onClick={() => switchBusiness(business.business_id)}
            >
              <div style={styles.dropdownItemContent}>
                <div style={styles.dropdownBusinessName}>
                  {business.business_name}
                  {business.is_primary && (
                    <span style={styles.primaryBadge}>
                      {hebrew.common.primary}
                    </span>
                  )}
                </div>
                <div style={styles.dropdownBusinessRole}>
                  {getRoleLabel(business.business_role)}
                  {business.ownership_pct > 0 && (
                    <span style={styles.ownership}>
                      {' '}• {business.ownership_pct}%
                    </span>
                  )}
                </div>
              </div>
              {business.business_id === activeBusinessId && (
                <div style={styles.checkmark}>✓</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getRoleLabel(role: string): string {
  const roleLabels: Record<string, string> = {
    infrastructure_owner: hebrew.roles.infrastructureOwner,
    business_owner: hebrew.roles.businessOwner,
    manager: hebrew.roles.manager,
    dispatcher: hebrew.roles.dispatcher,
    driver: hebrew.roles.driver,
    warehouse: hebrew.roles.warehouse,
    sales: hebrew.roles.sales,
    customer_service: hebrew.roles.customerService
  };

  return roleLabels[role] || role;
}

const styles = {
  container: {
    position: 'relative' as const,
    minWidth: '250px'
  },
  loader: {
    padding: '12px 16px',
    color: ROYAL_COLORS.muted,
    fontSize: '14px'
  },
  singleBusiness: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: ROYAL_COLORS.cardBg,
    borderRadius: '8px',
    border: `1px solid ${ROYAL_COLORS.border}`
  },
  selector: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: ROYAL_COLORS.cardBg,
    borderRadius: '8px',
    border: `1px solid ${ROYAL_COLORS.border}`,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  businessIcon: {
    fontSize: '20px',
    marginRight: '12px'
  },
  businessInfo: {
    flex: 1,
    minWidth: 0
  },
  businessName: {
    fontSize: '14px',
    fontWeight: 600,
    color: ROYAL_COLORS.text,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  businessRole: {
    fontSize: '12px',
    color: ROYAL_COLORS.muted,
    marginTop: '2px'
  },
  ownership: {
    color: ROYAL_COLORS.gold,
    fontWeight: 600
  },
  arrow: {
    fontSize: '10px',
    color: ROYAL_COLORS.muted,
    marginLeft: '8px'
  },
  dropdown: {
    position: 'absolute' as const,
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    backgroundColor: ROYAL_COLORS.cardBg,
    borderRadius: '8px',
    border: `1px solid ${ROYAL_COLORS.border}`,
    boxShadow: ROYAL_COLORS.shadowStrong,
    maxHeight: '300px',
    overflowY: 'auto' as const,
    zIndex: 1000
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    borderBottom: `1px solid ${ROYAL_COLORS.border}`
  },
  dropdownItemActive: {
    backgroundColor: `rgba(246, 201, 69, 0.15)`
  },
  dropdownItemContent: {
    flex: 1,
    minWidth: 0
  },
  dropdownBusinessName: {
    fontSize: '14px',
    fontWeight: 600,
    color: ROYAL_COLORS.text,
    marginBottom: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  dropdownBusinessRole: {
    fontSize: '12px',
    color: ROYAL_COLORS.muted
  },
  primaryBadge: {
    fontSize: '10px',
    padding: '2px 6px',
    backgroundColor: ROYAL_COLORS.gold,
    color: ROYAL_COLORS.backgroundSolid,
    borderRadius: '4px',
    fontWeight: 600
  },
  checkmark: {
    fontSize: '16px',
    color: ROYAL_COLORS.gold,
    marginLeft: '12px'
  }
};
