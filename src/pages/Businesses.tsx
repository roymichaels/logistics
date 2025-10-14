import React, { useState, useEffect } from 'react';
import { DataStore, User } from '../data/types';
import { hebrew } from '../lib/hebrew';
import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';
import { telegram } from '../lib/telegram';
import { CreateBusinessModal } from '../components/CreateBusinessModal';

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const profile = await dataStore.getProfile();

      // Validate profile has required fields
      if (!profile || !profile.id) {
        console.error('Invalid profile data:', profile);
        throw new Error('Failed to load user profile');
      }

      setUser(profile);

      if (!dataStore.supabase) {
        setLoading(false);
        return;
      }

      // Load all businesses (for infrastructure owners)
      if (profile.role === 'infrastructure_owner') {
        const { data: businessData, error: businessError } = await dataStore.supabase
          .from('businesses')
          .select('*')
          .order('created_at', { ascending: false });

        if (!businessError && businessData) {
          setBusinesses(businessData);
        }
      }

      // Load user's ownerships
      const { data: ownershipsData, error: ownershipsError } = await dataStore.supabase
        .from('business_ownership')
        .select(`
          *,
          business:businesses(*),
          owner:users(*)
        `)
        .eq('owner_user_id', profile.id)
        .eq('active', true)
        .order('ownership_percentage', { ascending: false });

      if (!ownershipsError && ownershipsData) {
        setMyOwnerships(ownershipsData);
      }
    } catch (error) {
      console.error('Failed to load businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalOwnershipPercentage = myOwnerships.reduce((sum, o) => sum + o.ownership_percentage, 0);
  const businessesIOwn = myOwnerships.filter(o => o.ownership_percentage > 0).length;

  if (loading) {
    return (
      <div style={ROYAL_STYLES.pageContainer}>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏢</div>
          <p style={{ color: ROYAL_COLORS.muted }}>טוען עסקים...</p>
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

      {/* Infrastructure Owner: Create Business Button */}
      {user?.role === 'infrastructure_owner' && (
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            ...ROYAL_STYLES.buttonPrimary,
            width: '100%',
            marginBottom: '24px'
          }}
        >
          + צור עסק חדש
        </button>
      )}

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
      {user?.role === 'infrastructure_owner' && businesses.length > 0 && (
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
      onClick={() => telegram.hapticFeedback('selection')}
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
          background: 'rgba(156, 109, 255, 0.2)',
          border: '1px solid rgba(156, 109, 255, 0.4)',
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
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

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
      console.error('Failed to load owners:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (expanded && owners.length === 0) {
      loadOwners();
    }
  }, [expanded]);

  const totalOwnership = owners.reduce((sum, o) => sum + o.ownership_percentage, 0);
  const availableOwnership = 100 - totalOwnership;

  return (
    <div style={ROYAL_STYLES.card}>
      <div
        onClick={() => {
          setExpanded(!expanded);
          telegram.hapticFeedback('selection');
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

          {availableOwnership > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                telegram.showAlert('הוספת בעלים תהיה זמינה בקרוב');
              }}
              style={{
                ...ROYAL_STYLES.buttonSecondary,
                width: '100%',
                marginTop: '12px'
              }}
            >
              + הוסף בעלים
            </button>
          )}
        </div>
      )}
    </div>
  );
}

