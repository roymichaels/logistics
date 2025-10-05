import React, { useState, useEffect } from 'react';
import { useTelegramUI } from '../hooks/useTelegramUI';
import { DataStore } from '../../data/types';

interface Business {
  id: string;
  name: string;
  name_hebrew: string;
  business_type: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  default_currency: 'ILS' | 'USD' | 'EUR';
  order_number_prefix: string;
  active: boolean;
  address: any;
  contact_info: any;
  business_settings: any;
}

interface BusinessUser {
  id: string;
  business_id: string;
  user_id: string;
  role: string;
  is_primary: boolean;
  active: boolean;
  user_name?: string;
  business_name?: string;
}

interface BusinessManagerProps {
  dataStore: DataStore;
  currentUserId?: string;
  onClose: () => void;
}

export function BusinessManager({ dataStore, currentUserId, onClose }: BusinessManagerProps) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessUsers, setBusinessUsers] = useState<BusinessUser[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'businesses' | 'assignments'>('businesses');
  const [showCreateBusiness, setShowCreateBusiness] = useState(false);
  const { theme, haptic } = useTelegramUI();

  useEffect(() => {
    loadData();

    // Subscribe to real-time changes
    let unsubscribeBusinesses: (() => void) | undefined;
    let unsubscribeBusinessUsers: (() => void) | undefined;

    if (dataStore.subscribeToChanges) {
      unsubscribeBusinesses = dataStore.subscribeToChanges('businesses', () => {
        loadData();
      });

      unsubscribeBusinessUsers = dataStore.subscribeToChanges('business_users', () => {
        loadData();
      });
    }

    return () => {
      if (unsubscribeBusinesses) unsubscribeBusinesses();
      if (unsubscribeBusinessUsers) unsubscribeBusinessUsers();
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load businesses from Supabase
      if (dataStore.listBusinesses) {
        const businessData = await dataStore.listBusinesses();
        setBusinesses(businessData);
      }

      // Load business user assignments from Supabase
      if (dataStore.listBusinessUsers) {
        const businessUserData = await dataStore.listBusinessUsers({ active_only: true });
        // Transform the data to match our interface
        const transformedData = businessUserData.map((bu: any) => ({
          id: bu.id,
          business_id: bu.business_id,
          user_id: bu.user?.telegram_id || bu.user_id,
          role: bu.role,
          is_primary: bu.is_primary,
          active: bu.active,
          user_name: bu.user?.name || 'משתמש לא ידוע',
          business_name: bu.business?.name_hebrew || 'עסק לא ידוע'
        }));
        setBusinessUsers(transformedData);
      }

    } catch (error) {
      console.error('Failed to load business data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'ILS': return 'ש"ח';
      case 'USD': return '$';
      case 'EUR': return '€';
      default: return currency;
    }
  };

  const getBusinessTypeLabel = (type: string) => {
    const labels = {
      retail: 'קמעונאות',
      food_delivery: 'משלוחי מזון',
      electronics: 'אלקטרוניקה',
      fashion: 'אופנה',
      education: 'חינוך',
      logistics: 'לוגיסטיקה'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getRoleLabel = (role: string) => {
    const labels = {
      owner: 'בעלים',
      manager: 'מנהל',
      dispatcher: 'משגר',
      driver: 'נהג',
      warehouse: 'מחסן',
      sales: 'מכירות',
      customer_service: 'שירות לקוחות'
    };
    return labels[role as keyof typeof labels] || role;
  };

  const renderBusinessCard = (business: Business) => (
    <div
      key={business.id}
      style={{
        padding: '16px',
        backgroundColor: theme.secondary_bg_color,
        borderRadius: '12px',
        marginBottom: '12px',
        border: selectedBusiness?.id === business.id
          ? `2px solid ${business.primary_color}`
          : `1px solid ${theme.hint_color}20`,
        cursor: 'pointer'
      }}
      onClick={() => {
        setSelectedBusiness(business);
        haptic();
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: business.primary_color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '18px',
              fontWeight: 'bold'
            }}
          >
            {business.name_hebrew.charAt(0)}
          </div>
          <div>
            <h3 style={{
              margin: '0 0 4px 0',
              fontSize: '16px',
              fontWeight: '600',
              color: theme.text_color
            }}>
              {business.name_hebrew}
            </h3>
            <p style={{
              margin: 0,
              fontSize: '12px',
              color: theme.hint_color
            }}>
              {getBusinessTypeLabel(business.business_type)} • {business.order_number_prefix}
            </p>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{
            padding: '4px 8px',
            borderRadius: '12px',
            backgroundColor: business.active ? '#34c75920' : '#ff3b3020',
            color: business.active ? '#34c759' : '#ff3b30',
            fontSize: '10px',
            fontWeight: '600'
          }}>
            {business.active ? 'פעיל' : 'לא פעיל'}
          </span>
          <span style={{
            fontSize: '12px',
            color: theme.hint_color
          }}>
            {getCurrencySymbol(business.default_currency)}
          </span>
        </div>
      </div>

      {business.address && (
        <div style={{
          fontSize: '12px',
          color: theme.hint_color,
          marginBottom: '4px'
        }}>
          📍 {business.address.street}, {business.address.city}
        </div>
      )}

      {business.contact_info?.phone && (
        <div style={{
          fontSize: '12px',
          color: theme.hint_color
        }}>
          📞 {business.contact_info.phone}
        </div>
      )}
    </div>
  );

  const renderUserAssignmentCard = (assignment: BusinessUser) => (
    <div
      key={assignment.id}
      style={{
        padding: '16px',
        backgroundColor: theme.secondary_bg_color,
        borderRadius: '12px',
        marginBottom: '12px',
        border: `1px solid ${theme.hint_color}20`
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px'
      }}>
        <div>
          <h4 style={{
            margin: '0 0 4px 0',
            fontSize: '14px',
            fontWeight: '600',
            color: theme.text_color
          }}>
            {assignment.user_name || `משתמש ${assignment.user_id}`}
          </h4>
          <p style={{
            margin: 0,
            fontSize: '12px',
            color: theme.hint_color
          }}>
            {assignment.business_name} • {getRoleLabel(assignment.role)}
          </p>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {assignment.is_primary && (
            <span style={{
              padding: '2px 6px',
              borderRadius: '8px',
              backgroundColor: theme.button_color + '20',
              color: theme.button_color,
              fontSize: '10px',
              fontWeight: '600'
            }}>
              עיקרי
            </span>
          )}
          <span style={{
            padding: '2px 6px',
            borderRadius: '8px',
            backgroundColor: assignment.active ? '#34c75920' : '#ff3b3020',
            color: assignment.active ? '#34c759' : '#ff3b30',
            fontSize: '10px',
            fontWeight: '600'
          }}>
            {assignment.active ? 'פעיל' : 'לא פעיל'}
          </span>
        </div>
      </div>
    </div>
  );

  const renderBusinessesTab = () => (
    <div style={{ padding: '16px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: '600',
          color: theme.text_color
        }}>
          עסקים במערכת ({businesses.length})
        </h3>

        <button
          onClick={() => setShowCreateBusiness(true)}
          style={{
            padding: '8px 16px',
            backgroundColor: theme.button_color,
            color: theme.button_text_color,
            border: 'none',
            borderRadius: '8px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          + עסק חדש
        </button>
      </div>

      <div style={{
        maxHeight: '500px',
        overflowY: 'auto'
      }}>
        {businesses.map(renderBusinessCard)}
      </div>

      {selectedBusiness && (
        <div style={{
          marginTop: '16px',
          padding: '16px',
          backgroundColor: theme.bg_color,
          borderRadius: '12px',
          border: `2px solid ${selectedBusiness.primary_color}40`
        }}>
          <h4 style={{
            margin: '0 0 12px 0',
            fontSize: '16px',
            fontWeight: '600',
            color: theme.text_color
          }}>
            פרטי העסק: {selectedBusiness.name_hebrew}
          </h4>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            fontSize: '12px'
          }}>
            <div>
              <strong>שם באנגלית:</strong> {selectedBusiness.name}
            </div>
            <div>
              <strong>סוג עסק:</strong> {getBusinessTypeLabel(selectedBusiness.business_type)}
            </div>
            <div>
              <strong>מטבע ברירת מחדל:</strong> {getCurrencySymbol(selectedBusiness.default_currency)}
            </div>
            <div>
              <strong>קידומת הזמנה:</strong> {selectedBusiness.order_number_prefix}
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '8px',
            marginTop: '16px'
          }}>
            <button
              style={{
                padding: '8px 16px',
                backgroundColor: theme.button_color,
                color: theme.button_text_color,
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              ערוך עסק
            </button>
            <button
              style={{
                padding: '8px 16px',
                backgroundColor: theme.secondary_bg_color,
                color: theme.text_color,
                border: `1px solid ${theme.hint_color}40`,
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              נהל משתמשים
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderAssignmentsTab = () => (
    <div style={{ padding: '16px' }}>
      <h3 style={{
        margin: '0 0 16px 0',
        fontSize: '18px',
        fontWeight: '600',
        color: theme.text_color
      }}>
        הקצאות משתמשים ({businessUsers.length})
      </h3>

      <div style={{
        maxHeight: '500px',
        overflowY: 'auto'
      }}>
        {businessUsers.map(renderUserAssignmentCard)}
      </div>

      <button
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: theme.button_color,
          color: theme.button_text_color,
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          cursor: 'pointer',
          marginTop: '16px'
        }}
      >
        + הוסף הקצאה חדשה
      </button>
    </div>
  );

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          backgroundColor: theme.bg_color,
          padding: '40px',
          borderRadius: '16px',
          textAlign: 'center',
          color: theme.text_color
        }}>
          טוען נתוני עסקים...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: theme.bg_color,
        borderRadius: '16px',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflowY: 'auto',
        direction: 'rtl'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px',
          borderBottom: `1px solid ${theme.hint_color}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: '600',
            color: theme.text_color
          }}>
            🏢 ניהול עסקים
          </h2>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '24px',
              color: theme.hint_color,
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          backgroundColor: theme.secondary_bg_color,
          margin: '16px',
          borderRadius: '8px',
          padding: '4px'
        }}>
          <button
            onClick={() => {
              setActiveTab('businesses');
              haptic();
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: activeTab === 'businesses' ? theme.bg_color : 'transparent',
              color: activeTab === 'businesses' ? theme.text_color : theme.hint_color,
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: activeTab === 'businesses' ? '600' : '400'
            }}
          >
            עסקים
          </button>
          <button
            onClick={() => {
              setActiveTab('assignments');
              haptic();
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: activeTab === 'assignments' ? theme.bg_color : 'transparent',
              color: activeTab === 'assignments' ? theme.text_color : theme.hint_color,
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: activeTab === 'assignments' ? '600' : '400'
            }}
          >
            הקצאות
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'businesses' && renderBusinessesTab()}
        {activeTab === 'assignments' && renderAssignmentsTab()}
      </div>
    </div>
  );
}