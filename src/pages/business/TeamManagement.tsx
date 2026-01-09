import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useSafeAppServices } from '../../context/AppServicesContext';
import { useNavigate } from 'react-router-dom';
import { tokens } from '../../styles/tokens';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/molecules/Card';
import { NoActiveBusiness } from '../../components/NoActiveBusiness';
import { useI18n } from '../../lib/i18n';

interface TeamMember {
  id: string;
  user_id: string;
  business_id: string;
  role: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  profile: {
    name?: string;
    email?: string;
    phone?: string;
    avatar_url?: string;
  };
}

export function TeamManagement() {
  const { t } = useI18n();
  const appServices = useSafeAppServices();
  const currentBusinessId = appServices?.currentBusinessId;
  const navigate = useNavigate();

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  useEffect(() => {
    if (currentBusinessId) {
      loadTeamMembers();
    } else {
      setLoading(false);
    }
  }, [currentBusinessId]);

  const loadTeamMembers = async () => {
    try {
      setLoading(true);

      if (!currentBusinessId) {
        logger.warn('[TeamManagement] No business context');
        return;
      }

      const { data, error } = await supabase
        .from('user_business_roles')
        .select(`
          id,
          user_id,
          business_id,
          role,
          active,
          created_at,
          updated_at,
          profiles:user_id (
            name,
            email,
            phone,
            avatar_url
          )
        `)
        .eq('business_id', currentBusinessId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('[TeamManagement] Error loading team members:', error);
        return;
      }

      // Transform the data to match our interface
      const transformedData: TeamMember[] = (data || []).map(item => ({
        id: item.id,
        user_id: item.user_id,
        business_id: item.business_id,
        role: item.role,
        active: item.active,
        created_at: item.created_at,
        updated_at: item.updated_at,
        profile: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles || {}
      }));

      setTeamMembers(transformedData);
      logger.info('[TeamManagement] Team members loaded:', transformedData.length);
    } catch (error) {
      logger.error('[TeamManagement] Failed to load team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm(t('teamManagementPage.confirmRemove') || 'Are you sure you want to remove this team member?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_business_roles')
        .delete()
        .eq('id', memberId);

      if (error) {
        logger.error('[TeamManagement] Error removing member:', error);
        alert('Failed to remove team member');
        return;
      }

      logger.info('[TeamManagement] Member removed:', memberId);
      loadTeamMembers(); // Refresh the list
    } catch (error) {
      logger.error('[TeamManagement] Failed to remove member:', error);
      alert('Failed to remove team member');
    }
  };

  const handleToggleActive = async (memberId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('user_business_roles')
        .update({ active: !currentActive, updated_at: new Date().toISOString() })
        .eq('id', memberId);

      if (error) {
        logger.error('[TeamManagement] Error toggling member status:', error);
        alert('Failed to update member status');
        return;
      }

      logger.info('[TeamManagement] Member status toggled:', memberId);
      loadTeamMembers(); // Refresh the list
    } catch (error) {
      logger.error('[TeamManagement] Failed to toggle member status:', error);
      alert('Failed to update member status');
    }
  };

  const roleOptions = [
    { value: 'all', label: t('teamManagementPage.allRoles') },
    { value: 'manager', label: t('roles.manager') },
    { value: 'dispatcher', label: t('roles.dispatcher') },
    { value: 'warehouse', label: t('roles.warehouse') },
    { value: 'sales', label: t('roles.sales') },
    { value: 'customer_service', label: t('roles.customerService') },
  ];

  const filteredMembers = teamMembers.filter((member) => {
    const name = member.profile.name || '';
    const email = member.profile.email || '';
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getStatusColor = (active: boolean) => {
    return active ? tokens.colors.status.success : tokens.colors.status.error;
  };

  const getStatusText = (active: boolean) => {
    return active ? t('teamManagementPage.statusActive') : t('teamManagementPage.statusInactive');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL', { dateStyle: 'short' });
  };

  const formatRoleName = (role: string) => {
    return role.replace(/_/g, ' ').split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Show NoActiveBusiness if no business is selected
  if (!currentBusinessId) {
    return (
      <PageContainer>
        <NoActiveBusiness
          onNavigateToBusinesses={() => navigate('/business/businesses')}
          message="כדי לנהל את הצוות שלך, עליך לבחור עסק פעיל"
        />
      </PageContainer>
    );
  }

  const inputStyle = {
    padding: '12px 16px',
    fontSize: '16px',
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: '8px',
    background: tokens.colors.surface,
    color: tokens.colors.text,
    outline: 'none',
    width: '100%',
  };

  const buttonPrimaryStyle = {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    background: tokens.gradients.primary,
    color: tokens.colors.text.bright,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  };

  const buttonSecondaryStyle = {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    background: tokens.colors.surface,
    color: tokens.colors.text,
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: '8px',
    cursor: 'pointer',
  };

  const buttonDangerStyle = {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    background: tokens.colors.status.error,
    color: tokens.colors.text.bright,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  };

  const badgeBaseStyle = {
    display: 'inline-block',
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: '600',
    borderRadius: '6px',
  };

  const badgeInfoStyle = {
    background: `${tokens.colors.accent}20`,
    color: tokens.colors.accent,
  };

  return (
    <PageContainer>
      <PageHeader
        icon="👥"
        title={t('teamManagementPage.title')}
        subtitle={t('teamManagementPage.subtitle')}
        actionButton={
          <button
            onClick={() => setInviteModalOpen(true)}
            style={{
              ...buttonPrimaryStyle,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            + {t('teamManagementPage.inviteMember')}
          </button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '20px', marginBottom: '24px' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('teamManagementPage.searchPlaceholder')}
          style={inputStyle}
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{ ...inputStyle, minWidth: '200px' }}
        >
          {roleOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{
          textAlign: 'center',
          padding: '64px 24px',
          color: tokens.colors.subtle
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p style={{ fontSize: '18px', margin: 0 }}>טוען את הצוות...</p>
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '20px'
            }}
          >
            {filteredMembers.map((member) => (
              <Card key={member.id} hoverable>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: member.profile.avatar_url
                        ? `url(${member.profile.avatar_url}) center/cover`
                        : tokens.gradients.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      fontWeight: '700',
                      color: tokens.colors.text.bright,
                      flexShrink: 0,
                      boxShadow: '0 4px 12px rgba(29, 155, 240, 0.3)'
                    }}
                  >
                    {!member.profile.avatar_url && (member.profile.name?.charAt(0) || member.profile.email?.charAt(0) || '?')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ marginBottom: '12px' }}>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: tokens.colors.text, marginBottom: '4px' }}>
                        {member.profile.name || member.profile.email || 'Unknown User'}
                      </h3>
                      <p style={{ margin: 0, fontSize: '14px', color: tokens.colors.subtle }}>
                        {member.profile.email || 'No email'}
                      </p>
                      {member.profile.phone && (
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: tokens.colors.subtle }}>
                          {member.profile.phone}
                        </p>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          ...badgeBaseStyle,
                          ...badgeInfoStyle,
                          textTransform: 'capitalize'
                        }}
                      >
                        {formatRoleName(member.role)}
                      </span>
                      <span
                        style={{
                          ...badgeBaseStyle,
                          background: `${getStatusColor(member.active)}20`,
                          color: getStatusColor(member.active)
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-block',
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: getStatusColor(member.active),
                            marginRight: '6px'
                          }}
                        />
                        {getStatusText(member.active)}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: tokens.colors.subtle, marginBottom: '16px' }}>
                      הצטרף {formatDate(member.created_at)}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleToggleActive(member.id, member.active)}
                        style={{
                          ...buttonSecondaryStyle,
                          flex: 1,
                          padding: '8px 16px',
                          fontSize: '14px'
                        }}
                      >
                        {member.active ? 'השעה' : 'הפעל'}
                      </button>
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        style={{
                          ...buttonDangerStyle,
                          padding: '8px 16px',
                          fontSize: '14px'
                        }}
                      >
                        {t('teamManagementPage.removeMember')}
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {filteredMembers.length === 0 && !loading && (
            <div style={{
              textAlign: 'center',
              padding: '64px 24px',
              color: tokens.colors.subtle
            }}>
              <div style={{
                fontSize: '64px',
                marginBottom: '16px'
              }}>👥</div>
              <p style={{
                fontSize: '18px',
                margin: 0
              }}>
                {teamMembers.length === 0
                  ? 'אין חברי צוות עדיין. הזמן את החבר הראשון!'
                  : t('teamManagementPage.noTeamMembers')}
              </p>
            </div>
          )}
        </>
      )}

      {/* Invite Modal - Placeholder for future implementation */}
      {inviteModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setInviteModalOpen(false)}
        >
          <div
            style={{
              background: tokens.colors.background,
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '500px',
              width: '100%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: '700', color: tokens.colors.text }}>
              הזמן חבר צוות
            </h2>
            <p style={{ color: tokens.colors.subtle, marginBottom: '24px' }}>
              פונקציונליות הזמנה תיושם בקרוב. לעת עתה, חברי צוות יכולים להצטרף דרך מערכת ההרשאות.
            </p>
            <button
              onClick={() => setInviteModalOpen(false)}
              style={{
                ...buttonPrimaryStyle,
                width: '100%'
              }}
            >
              סגור
            </button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
