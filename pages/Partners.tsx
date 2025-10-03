import React, { useState, useEffect } from 'react';
import { DataStore } from '../data/types';
import { hebrew } from '../src/lib/hebrew';
import { ROYAL_COLORS, ROYAL_STYLES } from '../src/styles/royalTheme';
import { Toast } from '../src/components/Toast';

interface PartnersProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

interface Partner {
  id: string;
  name: string;
  type: 'supplier' | 'distributor' | 'business_partner';
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
}

export function Partners({ dataStore, onNavigate }: PartnersProps) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<'all' | 'supplier' | 'distributor' | 'business_partner'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    setLoading(true);
    try {
      if (!dataStore.supabase) {
        setLoading(false);
        return;
      }

      const { data, error } = await dataStore.supabase
        .from('partners')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.log('Partners table may not exist yet:', error);
        setPartners([]);
      } else {
        setPartners(data || []);
      }
    } catch (error) {
      console.error('Failed to load partners:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPartners = selectedType === 'all'
    ? partners
    : partners.filter(p => p.type === selectedType);

  const supplierCount = partners.filter(p => p.type === 'supplier' && p.status === 'active').length;
  const distributorCount = partners.filter(p => p.type === 'distributor' && p.status === 'active').length;
  const partnerCount = partners.filter(p => p.type === 'business_partner' && p.status === 'active').length;

  return (
    <div style={ROYAL_STYLES.pageContainer}>
      <div style={ROYAL_STYLES.pageHeader}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🤝</div>
        <h1 style={ROYAL_STYLES.pageTitle}>{hebrew.partners}</h1>
        <p style={ROYAL_STYLES.pageSubtitle}>
          ניהול שותפים וספקים
        </p>
      </div>

      <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
        <div style={ROYAL_STYLES.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(77, 208, 225, 0.2)',
              border: '1px solid rgba(77, 208, 225, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}>👥</div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', color: ROYAL_COLORS.text, fontWeight: '600' }}>
                ספקים
              </h3>
              <p style={{ margin: 0, fontSize: '14px', color: ROYAL_COLORS.muted }}>
                {supplierCount} ספקים פעילים
              </p>
            </div>
          </div>
        </div>

        <div style={ROYAL_STYLES.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(156, 109, 255, 0.2)',
              border: '1px solid rgba(156, 109, 255, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}>🚚</div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', color: ROYAL_COLORS.text, fontWeight: '600' }}>
                ערוצי הפצה
              </h3>
              <p style={{ margin: 0, fontSize: '14px', color: ROYAL_COLORS.muted }}>
                {distributorCount} ערוצים פעילים
              </p>
            </div>
          </div>
        </div>

        <div style={ROYAL_STYLES.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(246, 201, 69, 0.2)',
              border: '1px solid rgba(246, 201, 69, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}>🤝</div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', color: ROYAL_COLORS.text, fontWeight: '600' }}>
                שותפים עסקיים
              </h3>
              <p style={{ margin: 0, fontSize: '14px', color: ROYAL_COLORS.muted }}>
                {partnerCount} שותפים פעילים
              </p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={ROYAL_STYLES.card}>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
            <p style={{ color: ROYAL_COLORS.muted }}>טוען שותפים...</p>
          </div>
        </div>
      ) : partners.length === 0 ? (
        <div style={ROYAL_STYLES.card}>
          <div style={ROYAL_STYLES.emptyState}>
            <div style={ROYAL_STYLES.emptyStateIcon}>🤝</div>
            <h3 style={{ margin: '0 0 12px 0', color: ROYAL_COLORS.text }}>אין שותפים רשומים</h3>
            <div style={ROYAL_STYLES.emptyStateText}>
              מערכת ניהול שותפים מוכנה לשימוש.
              <br /><br />
              כאשר תיווצר טבלת partners במסד הנתונים,
              <br />
              תוכל להתחיל להוסיף ספקים, מפיצים ושותפים עסקיים.
              <br /><br />
              התכונות כוללות:
              <br />
              📊 מעקב הזמנות מספקים<br />
              💰 ניהול תשלומים<br />
              📦 מעקב משלוחים<br />
              📄 חוזים והסכמים<br />
              📞 ניהול אנשי קשר<br />
            </div>
          </div>
        </div>
      ) : (
        <>
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '16px',
            overflowX: 'auto',
            padding: '4px'
          }}>
            {[
              { id: 'all', label: 'הכל', count: partners.length },
              { id: 'supplier', label: 'ספקים', count: supplierCount },
              { id: 'distributor', label: 'מפיצים', count: distributorCount },
              { id: 'business_partner', label: 'שותפים', count: partnerCount }
            ].map(filter => (
              <button
                key={filter.id}
                onClick={() => setSelectedType(filter.id as any)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: selectedType === filter.id
                    ? 'linear-gradient(135deg, #9c6dff 0%, #7c3aed 100%)'
                    : ROYAL_COLORS.card,
                  color: ROYAL_COLORS.text,
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredPartners.map(partner => (
              <div key={partner.id} style={ROYAL_STYLES.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: ROYAL_COLORS.text }}>
                      {partner.name}
                    </h3>
                    <p style={{ margin: 0, fontSize: '13px', color: ROYAL_COLORS.muted }}>
                      {partner.type === 'supplier' ? 'ספק' :
                       partner.type === 'distributor' ? 'מפיץ' : 'שותף עסקי'}
                    </p>
                  </div>
                  <div style={{
                    padding: '4px 12px',
                    borderRadius: '8px',
                    background: partner.status === 'active'
                      ? 'rgba(74, 222, 128, 0.2)'
                      : 'rgba(156, 163, 175, 0.2)',
                    color: partner.status === 'active'
                      ? ROYAL_COLORS.emerald
                      : ROYAL_COLORS.muted,
                    fontSize: '11px',
                    fontWeight: '600'
                  }}>
                    {partner.status === 'active' ? 'פעיל' : 'לא פעיל'}
                  </div>
                </div>
                {partner.contact_name && (
                  <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted, marginBottom: '4px' }}>
                    👤 {partner.contact_name}
                  </div>
                )}
                {partner.contact_phone && (
                  <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted, marginBottom: '4px' }}>
                    📞 {partner.contact_phone}
                  </div>
                )}
                {partner.contact_email && (
                  <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted, marginBottom: '4px' }}>
                    📧 {partner.contact_email}
                  </div>
                )}
                {partner.address && (
                  <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted }}>
                    📍 {partner.address}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default Partners;
