import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DataStore, User } from '../data/types';
import { hebrew } from '../lib/i18n';
import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';

import { CreateBusinessModal } from '../components/CreateBusinessModal';
import { AddEquityStakeholderModal } from '../components/AddEquityStakeholderModal';
import { ProfitDistributionModal } from '../components/ProfitDistributionModal';
import { BusinessSettingsModal } from '../components/BusinessSettingsModal';
import { getBusinessEquityBreakdown, getAvailableEquity, type EquityStakeholder } from '../services/equity';
import { RoleDiagnostics } from '../lib/diagnostics';
import { logger } from '../lib/logger';
import { localBusinessDataService, type Business as LocalBusiness, type BusinessOwnership as LocalOwnership } from '../services/localBusinessDataService';

interface BusinessesProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

interface Business {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  created_at: string;
}

interface BusinessOwnership {
  id: string;
  business_id: string;
  owner_user_id: string;
  ownership_percentage: number;
  equity_type: 'founder' | 'investor' | 'employee' | 'partner';
  profit_share_percentage: number;
  voting_rights: boolean;
  active: boolean;
  business?: Business;
  owner?: User;
}

export function Businesses({ dataStore, onNavigate }: BusinessesProps) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [myOwnerships, setMyOwnerships] = useState<BusinessOwnership[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [initStage, setInitStage] = useState<'checking' | 'loading_profile' | 'loading_businesses' | 'ready'>('checking');
  const loadDataCalledRef = useRef(false);
  const initTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize and load data when component mounts
  useEffect(() => {
    // Prevent multiple simultaneous loads
    if (loadDataCalledRef.current) {
      return;
    }

    loadDataCalledRef.current = true;

    // Set initialization timeout (3 seconds for local only)
    initTimeoutRef.current = setTimeout(() => {
      if (loading) {
        logger.error('⏱️ Businesses page initialization timeout');
        setInitError('تهيئة المعلومات استغرقت وقتا طويلا.');
        setLoading(false);
      }
    }, 3000);

    const initialize = async () => {
      try {
        setInitStage('checking');
        logger.info('📱 Businesses: Loading from local storage (frontend-only)...');

        await loadData();
      } catch (error) {
        logger.error('❌ Businesses: Failed to load', error);
        setInitError(error instanceof Error ? error.message : 'فشل تحميل البيانات');
        setLoading(false);
      }
    };

    initialize();

    // Cleanup timeout on unmount
    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
      loadDataCalledRef.current = false;
    };
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setInitError(null);

    try {
      setInitStage('loading_profile');
      logger.info('👤 Businesses: Loading user profile...');

      const profile = await dataStore.getProfile();

      if (!profile || !profile.id) {
        logger.error('Invalid profile data:', profile);
        throw new Error('فشل تحميل ملف المستخدم');
      }

      setUser(profile);

      setInitStage('loading_businesses');
      logger.info('🏢 Businesses: Loading business data...');

      // Load all businesses (for infrastructure owners)
      if (profile.role === 'infrastructure_owner' || profile.global_role === 'infrastructure_owner') {
        const allBusinesses = localBusinessDataService.getBusinesses();
        setBusinesses(allBusinesses);
        logger.info('✅ Loaded all businesses:', allBusinesses);
      }

      // Load user's ownerships from local storage
      const ownerships = localBusinessDataService.getMyBusinesses(profile.id);

      if (ownerships.length > 0) {
        setMyOwnerships(ownerships);
        logger.info('✅ Loaded user ownerships:', ownerships);
      } else {
        logger.info('ℹ️ No business ownerships found for user');
      }

      setInitStage('ready');
      logger.info('✅ Businesses: All data loaded successfully');
    } catch (error) {
      logger.error('Failed to load businesses:', error);
      setInitError(error instanceof Error ? error.message : 'فشل تحميل البيانات');
    } finally {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
      setLoading(false);
    }
  }, [dataStore]);

  const totalOwnershipPercentage = myOwnerships.reduce((sum, o) => sum + o.ownership_percentage, 0);
  const businessesIOwn = myOwnerships.filter(o => o.ownership_percentage > 0).length;

  // Diagnostic check for Create Business button visibility
  const createBusinessCheck = RoleDiagnostics.shouldShowCreateBusinessButton(user);

  // Show initialization error
  if (initError) {
    return (
      <div style={ROYAL_STYLES.pageContainer}>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ color: ROYAL_COLORS.text, marginBottom: '12px', fontSize: '20px' }}>
            שגיאה בטעינת העמוד
          </h2>
          <p style={{ color: ROYAL_COLORS.muted, marginBottom: '24px' }}>
            {initError}
          </p>
          <button
            onClick={() => {
              setInitError(null);
              setLoading(true);
              loadDataCalledRef.current = false;
              window.location.reload();
            }}
            style={{
              ...ROYAL_STYLES.buttonPrimary,
              padding: '12px 24px',
            }}
          >
            רענן עמוד
          </button>
        </div>
      </div>
    );
  }

  // Show enhanced loading screen with stage indicators
  if (loading) {
    const loadingMessages = {
      checking: 'מכין מערכת...',
      loading_profile: 'טוען פרופיל משתמש...',
      loading_businesses: 'טוען עסקים...',
      ready: 'מסיים...'
    };

    return (
      <div style={ROYAL_STYLES.pageContainer}>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏢</div>
          <div style={{
            display: 'inline-block',
            width: '40px',
            height: '40px',
            border: '4px solid rgba(29, 155, 240, 0.2)',
            borderTopColor: ROYAL_COLORS.accent,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '16px'
          }} />
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
          <p style={{ color: ROYAL_COLORS.text, fontWeight: '600', marginBottom: '8px' }}>
            {loadingMessages[initStage]}
          </p>
          <p style={{ color: ROYAL_COLORS.muted, fontSize: '14px' }}>
            אנא המתן...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={ROYAL_STYLES.pageContainer}>
      <div style={ROYAL_STYLES.pageHeader}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏢</div>
        <h1 style={ROYAL_STYLES.pageTitle}>{hebrew.businesses}</h1>
        <p style={ROYAL_STYLES.pageSubtitle}>
          ניהול עסקים ובעלויות
        </p>
      </div>

      {/* My Ownerships Summary */}
      <div style={{
        ...ROYAL_STYLES.card,
        background: ROYAL_COLORS.gradientCard,
        marginBottom: '24px'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: ROYAL_COLORS.text, fontWeight: '600' }}>
          הבעלויות שלי
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '16px'
        }}>
          <div style={ROYAL_STYLES.statBox}>
            <div style={ROYAL_STYLES.statValue}>{businessesIOwn}</div>
            <div style={ROYAL_STYLES.statLabel}>עסקים</div>
          </div>
          <div style={ROYAL_STYLES.statBox}>
            <div style={ROYAL_STYLES.statValue}>{totalOwnershipPercentage.toFixed(1)}%</div>
            <div style={ROYAL_STYLES.statLabel}>סה"כ בעלות</div>
          </div>
        </div>
      </div>

      {/* Create Business Button - for infrastructure_owner and business_owner */}
      {(user?.role === 'infrastructure_owner' || user?.global_role === 'infrastructure_owner' ||
        user?.role === 'business_owner' || user?.global_role === 'business_owner') ? (
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={() => {
              logger.info('✅ Create Business button clicked');
              setShowCreateModal(true);

            }}
            style={{
              ...ROYAL_STYLES.buttonPrimary,
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            + צור עסק חדש
          </button>
        </div>
      ) : null}

      {/* My Ownerships List */}
      {myOwnerships.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{
            margin: '0 0 16px 0',
            fontSize: '20px',
            color: ROYAL_COLORS.text,
            fontWeight: '600'
          }}>
            העסקים שלי
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {myOwnerships.map((ownership) => (
              <OwnershipCard
                key={ownership.id}
                ownership={ownership}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Businesses (Infrastructure Owner Only) */}
      {(user?.role === 'infrastructure_owner' || user?.global_role === 'infrastructure_owner') && businesses.length > 0 && (
        <div>
          <h2 style={{
            margin: '0 0 16px 0',
            fontSize: '20px',
            color: ROYAL_COLORS.text,
            fontWeight: '600'
          }}>
            כל העסקים בפלטפורמה
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {businesses.map((business) => (
              <BusinessCard
                key={business.id}
                business={business}
                dataStore={dataStore}
                onUpdate={loadData}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {myOwnerships.length === 0 && businesses.length === 0 && (
        <div style={ROYAL_STYLES.emptyState}>
          <div style={ROYAL_STYLES.emptyStateIcon}>🏢</div>
          <div style={ROYAL_STYLES.emptyStateText}>
            אין עסקים להצגה
          </div>
        </div>
      )}

      {/* Create Business Modal */}
      {showCreateModal && (
        <CreateBusinessModal
          dataStore={dataStore}
          user={user}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function OwnershipCard({ ownership, onNavigate }: {
  ownership: BusinessOwnership;
  onNavigate: (page: string) => void;
}) {
  return (
    <div
      onClick={() => onNavigate(`/business/${ownership.business_id}`)}
      style={{
        ...ROYAL_STYLES.card,
        cursor: 'pointer',
        transition: 'all 0.3s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = ROYAL_COLORS.cardHover;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = ROYAL_COLORS.card;
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: ROYAL_COLORS.text, fontWeight: '600' }}>
            {ownership.business?.name || 'עסק'}
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: ROYAL_COLORS.muted }}>
            {ownership.business?.description || 'אין תיאור'}
          </p>
        </div>
        <div style={{
          padding: '6px 12px',
          borderRadius: '8px',
          background: 'rgba(29, 155, 240, 0.2)',
          border: '1px solid rgba(29, 155, 240, 0.4)',
          fontSize: '14px',
          fontWeight: '600',
          color: ROYAL_COLORS.accent
        }}>
          {ownership.ownership_percentage}%
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
        padding: '12px',
        borderRadius: '8px',
        background: ROYAL_COLORS.secondary
      }}>
        <div>
          <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted, marginBottom: '4px' }}>סוג בעלות</div>
          <div style={{ fontSize: '14px', color: ROYAL_COLORS.text, fontWeight: '600' }}>
            {ownership.equity_type === 'founder' ? 'מייסד' :
             ownership.equity_type === 'investor' ? 'משקיע' :
             ownership.equity_type === 'employee' ? 'עובד' : 'שותף'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted, marginBottom: '4px' }}>חלוקת רווחים</div>
          <div style={{ fontSize: '14px', color: ROYAL_COLORS.text, fontWeight: '600' }}>
            {ownership.profit_share_percentage}%
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted, marginBottom: '4px' }}>זכויות הצבעה</div>
          <div style={{ fontSize: '14px', color: ROYAL_COLORS.text, fontWeight: '600' }}>
            {ownership.voting_rights ? '✓ כן' : '✗ לא'}
          </div>
        </div>
      </div>
    </div>
  );
}

function BusinessCard({ business, dataStore, onUpdate }: {
  business: Business;
  dataStore: DataStore;
  onUpdate: () => void;
}) {
  const [owners, setOwners] = useState<BusinessOwnership[]>([]);
  const [equityStakeholders, setEquityStakeholders] = useState<EquityStakeholder[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'legacy' | 'equity'>('equity');
  const [showAddEquity, setShowAddEquity] = useState(false);
  const [showDistribution, setShowDistribution] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [availableEquity, setAvailableEquity] = useState<number>(100);

  const loadOwners = async () => {
    if (!dataStore.supabase || loading) return;
    setLoading(true);
    try {
      const { data, error } = await dataStore.supabase
        .from('business_ownership')
        .select(`
          *,
          owner:users(id, name, username)
        `)
        .eq('business_id', business.id)
        .eq('active', true)
        .order('ownership_percentage', { ascending: false });

      if (!error && data) {
        setOwners(data);
      }
    } catch (error) {
      logger.error('Failed to load owners:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEquityData = async () => {
    setLoading(true);
    try {
      const [stakeholders, available] = await Promise.all([
        getBusinessEquityBreakdown(business.id),
        getAvailableEquity(business.id),
      ]);
      setEquityStakeholders(stakeholders);
      setAvailableEquity(available);
    } catch (error) {
      logger.error('Failed to load equity data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (expanded && owners.length === 0 && equityStakeholders.length === 0) {
      loadOwners();
      loadEquityData();
    }
  }, [expanded]);

  const totalOwnership = owners.reduce((sum, o) => sum + o.ownership_percentage, 0);
  const availableOwnership = 100 - totalOwnership;

  return (
    <div style={ROYAL_STYLES.card}>
      <div
        onClick={() => {
          setExpanded(!expanded);

        }}
        style={{ cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: ROYAL_COLORS.text, fontWeight: '600' }}>
              {business.name}
            </h3>
            {business.description && (
              <p style={{ margin: 0, fontSize: '14px', color: ROYAL_COLORS.muted }}>
                {business.description}
              </p>
            )}
          </div>
          <div style={{ fontSize: '20px' }}>
            {expanded ? '▼' : '◀'}
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          fontSize: '14px',
          color: ROYAL_COLORS.muted
        }}>
          <span>{owners.length} בעלים</span>
          <span>•</span>
          <span>{totalOwnership}% מוקצה</span>
          {availableOwnership > 0 && (
            <>
              <span>•</span>
              <span style={{ color: ROYAL_COLORS.success }}>{availableOwnership}% פנוי</span>
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${ROYAL_COLORS.border}` }}>
          {/* Tab Selector */}
          <div
            style={{
              display: 'flex',
              backgroundColor: ROYAL_COLORS.secondary,
              marginBottom: '16px',
              borderRadius: '8px',
              padding: '4px',
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab('equity');

              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: activeTab === 'equity' ? ROYAL_COLORS.card : 'transparent',
                color: activeTab === 'equity' ? ROYAL_COLORS.text : ROYAL_COLORS.muted,
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: activeTab === 'equity' ? '600' : '400',
              }}
            >
              💎 ניהול הון
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab('legacy');

              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: activeTab === 'legacy' ? ROYAL_COLORS.card : 'transparent',
                color: activeTab === 'legacy' ? ROYAL_COLORS.text : ROYAL_COLORS.muted,
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: activeTab === 'legacy' ? '600' : '400',
              }}
            >
              📋 בעלויות (ישן)
            </button>
          </div>

          {activeTab === 'equity' ? (
            <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: ROYAL_COLORS.muted }}>
              טוען בעלים...
            </div>
          ) : owners.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: ROYAL_COLORS.muted }}>
              אין בעלים רשומים
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {owners.map((owner) => (
                <div
                  key={owner.id}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: ROYAL_COLORS.secondary,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', color: ROYAL_COLORS.text, fontWeight: '600' }}>
                      {owner.owner?.name || owner.owner?.username || 'משתמש'}
                    </div>
                    <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted }}>
                      {owner.equity_type === 'founder' ? 'מייסד' :
                       owner.equity_type === 'investor' ? 'משקיע' :
                       owner.equity_type === 'employee' ? 'עובד' : 'שותף'}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: ROYAL_COLORS.accent
                  }}>
                    {owner.ownership_percentage}%
                  </div>
                </div>
              ))}
            </div>
          )}

              {/* Available Equity Banner */}
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: availableEquity > 50
                    ? 'rgba(52, 199, 89, 0.1)'
                    : availableEquity > 20
                    ? 'rgba(255, 193, 7, 0.1)'
                    : 'rgba(255, 59, 48, 0.1)',
                  border: `1px solid ${
                    availableEquity > 50
                      ? 'rgba(52, 199, 89, 0.3)'
                      : availableEquity > 20
                      ? 'rgba(255, 193, 7, 0.3)'
                      : 'rgba(255, 59, 48, 0.3)'
                  }`,
                  marginBottom: '16px',
                }}
              >
                <div style={{ fontSize: '14px', color: ROYAL_COLORS.text, fontWeight: '600', marginBottom: '4px' }}>
                  💰 הון זמין: {availableEquity.toFixed(2)}%
                </div>
                <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted }}>
                  מוקצה: {(100 - availableEquity).toFixed(2)}% | סה"כ: 100%
                </div>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: ROYAL_COLORS.muted }}>
                  טוען נתוני הון...
                </div>
              ) : equityStakeholders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>💎</div>
                  <div style={{ fontSize: '16px', color: ROYAL_COLORS.text, marginBottom: '8px', fontWeight: '600' }}>
                    אין בעלי מניות
                  </div>
                  <div style={{ fontSize: '14px', color: ROYAL_COLORS.muted }}>
                    הוסף בעלי מניות לעסק
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                  {equityStakeholders.map((stakeholder) => (
                    <div
                      key={stakeholder.stakeholder_id}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        background: ROYAL_COLORS.secondary,
                        border: `1px solid ${ROYAL_COLORS.border}`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', color: ROYAL_COLORS.text, fontWeight: '600', marginBottom: '2px' }}>
                            {stakeholder.stakeholder_name}
                          </div>
                          <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted }}>
                            {stakeholder.equity_type === 'founder' ? '👨‍💼 מייסד' :
                             stakeholder.equity_type === 'investor' ? '💰 משקיע' :
                             stakeholder.equity_type === 'employee' ? '👤 עובד' : '🤝 שותף'}
                            {!stakeholder.is_fully_vested && (
                              <span style={{ marginRight: '8px', color: ROYAL_COLORS.warning }}>
                                ⏳ {stakeholder.vested_percentage.toFixed(0)}% הבשיל
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{
                            fontSize: '16px',
                            fontWeight: '700',
                            color: ROYAL_COLORS.accent,
                          }}>
                            {stakeholder.equity_percentage.toFixed(2)}%
                          </div>
                          <div style={{ fontSize: '11px', color: ROYAL_COLORS.muted }}>
                            רווחים: {stakeholder.profit_share_percentage.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      <div style={{
                        display: 'flex',
                        gap: '12px',
                        paddingTop: '8px',
                        borderTop: `1px solid ${ROYAL_COLORS.border}`,
                        fontSize: '12px',
                        color: ROYAL_COLORS.muted,
                      }}>
                        <span>{stakeholder.voting_rights ? '✓ זכויות הצבעה' : '✗ ללא הצבעה'}</span>
                        {stakeholder.vesting_end_date && (
                          <span>📅 הבשלה: {new Date(stakeholder.vesting_end_date).toLocaleDateString('he-IL')}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAddEquity(true);

                    }}
                    disabled={availableEquity <= 0}
                    style={{
                      ...ROYAL_STYLES.buttonPrimary,
                      flex: 1,
                      opacity: availableEquity <= 0 ? 0.5 : 1,
                      fontSize: '14px',
                    }}
                  >
                    + הוסף בעל מניות
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDistribution(true);

                    }}
                    disabled={equityStakeholders.length === 0}
                    style={{
                      ...ROYAL_STYLES.buttonSecondary,
                      flex: 1,
                      opacity: equityStakeholders.length === 0 ? 0.5 : 1,
                      fontSize: '14px',
                    }}
                  >
                    💰 רווחים
                  </button>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSettings(true);

                  }}
                  style={{
                    ...ROYAL_STYLES.buttonSecondary,
                    fontSize: '14px',
                  }}
                >
                  ⚙️ הגדרות עסק
                </button>
              </div>
            </div>
          ) : (
            <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: ROYAL_COLORS.muted }}>
              טוען בעלים...
            </div>
          ) : owners.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: ROYAL_COLORS.muted }}>
              אין בעלים רשומים במערכת הישנה
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {owners.map((owner) => (
                <div
                  key={owner.id}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: ROYAL_COLORS.secondary,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', color: ROYAL_COLORS.text, fontWeight: '600' }}>
                      {owner.owner?.name || owner.owner?.username || 'משתמש'}
                    </div>
                    <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted }}>
                      {owner.equity_type === 'founder' ? 'מייסד' :
                       owner.equity_type === 'investor' ? 'משקיע' :
                       owner.equity_type === 'employee' ? 'עובד' : 'שותף'}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: ROYAL_COLORS.accent
                  }}>
                    {owner.ownership_percentage}%
                  </div>
                </div>
              ))}
            </div>
          )}
          {availableOwnership > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();

              }}
              style={{
                ...ROYAL_STYLES.buttonSecondary,
                width: '100%',
                marginTop: '12px'
              }}
            >
              + הוסף בעלים (ישן)
            </button>
          )}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showAddEquity && (
        <AddEquityStakeholderModal
          businessId={business.id}
          businessName={business.name}
          dataStore={dataStore}
          onClose={() => setShowAddEquity(false)}
          onSuccess={() => {
            loadEquityData();
            onUpdate();
          }}
        />
      )}
      {showDistribution && (
        <ProfitDistributionModal
          businessId={business.id}
          businessName={business.name}
          onClose={() => setShowDistribution(false)}
          onSuccess={() => {
            loadEquityData();
            onUpdate();
          }}
        />
      )}
      {showSettings && (
        <BusinessSettingsModal
          businessId={business.id}
          businessName={business.name}
          dataStore={dataStore}
          onClose={() => setShowSettings(false)}
          onSuccess={() => {
            onUpdate();
          }}
        />
      )}
    </div>
  );
}

