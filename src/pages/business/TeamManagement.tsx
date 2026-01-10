import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useSafeAppServices } from '../../context/AppServicesContext';
import { useNavigate } from 'react-router-dom';
import {
  UndergroundCard,
  UndergroundHeader,
  UndergroundButton,
  UndergroundInput,
  UndergroundSelect,
  UndergroundLoadingSpinner,
  UndergroundBadge,
  UndergroundModal
} from '../../components/underground';
import { undergroundTheme } from '../../styles/undergroundTheme';
import { NoActiveBusiness } from '../../components/NoActiveBusiness';
import { useI18n } from '../../lib/i18n';
import { TeamService } from '../../services/modules/TeamService';

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
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('manager');
  const [inviting, setInviting] = useState(false);

  const teamService = currentBusinessId ? new TeamService(currentBusinessId) : null;

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

  const getStatusVariant = (active: boolean): 'success' | 'danger' => {
    return active ? 'success' : 'danger';
  };

  const getStatusText = (active: boolean) => {
    return active ? t('teamManagementPage.statusActive') : t('teamManagementPage.statusInactive');
  };

  const handleInviteMember = async () => {
    if (!teamService || !inviteEmail || !inviteRole) {
      alert('נא למלא את כל השדות');
      return;
    }

    try {
      setInviting(true);
      const result = await teamService.inviteTeamMember(inviteEmail, inviteRole as any);

      if (result.success) {
        logger.info('[TeamManagement] Member invited successfully');
        alert('הזמנה נשלחה בהצלחה!');
        setInviteModalOpen(false);
        setInviteEmail('');
        setInviteRole('manager');
        loadTeamMembers();
      } else {
        alert(result.error || 'שגיאה בשליחת ההזמנה');
      }
    } catch (error) {
      logger.error('[TeamManagement] Failed to invite member:', error);
      alert('שגיאה בשליחת ההזמנה');
    } finally {
      setInviting(false);
    }
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
      <div style={{
        minHeight: '100vh',
        background: undergroundTheme.colors.gradient.primary,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <NoActiveBusiness
          onNavigateToBusinesses={() => navigate('/business/businesses')}
          message="כדי לנהל את הצוות שלך, עליך לבחור עסק פעיל"
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: undergroundTheme.colors.gradient.primary,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <UndergroundLoadingSpinner text="טוען את הצוות..." />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: undergroundTheme.colors.gradient.primary,
      padding: undergroundTheme.spacing['3xl'],
      paddingBottom: undergroundTheme.spacing['8xl']
    }}>
      <UndergroundHeader
        icon="👥"
        title={t('teamManagementPage.title')}
        subtitle={t('teamManagementPage.subtitle')}
        actions={
          <UndergroundButton onClick={() => setInviteModalOpen(true)} variant="primary">
            + {t('teamManagementPage.inviteMember')}
          </UndergroundButton>
        }
      />

      <UndergroundCard style={{ marginBottom: undergroundTheme.spacing['2xl'] }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: undergroundTheme.spacing.lg }}>
          <UndergroundInput
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('teamManagementPage.searchPlaceholder')}
          />
          <UndergroundSelect
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </UndergroundSelect>
        </div>
      </UndergroundCard>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: undergroundTheme.spacing.xl
        }}
      >
            {filteredMembers.map((member) => (
              <UndergroundCard key={member.id}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: undergroundTheme.spacing.lg }}>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: member.profile.avatar_url
                        ? `url(${member.profile.avatar_url}) center/cover`
                        : undergroundTheme.colors.accent.gradient,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: undergroundTheme.typography.fontSize['2xl'],
                      fontWeight: undergroundTheme.typography.fontWeight.bold,
                      color: undergroundTheme.colors.text.primary,
                      flexShrink: 0,
                      boxShadow: `0 4px 12px ${undergroundTheme.colors.glow.cyan}40`,
                      border: `2px solid ${undergroundTheme.colors.accent.primary}40`
                    }}
                  >
                    {!member.profile.avatar_url && (member.profile.name?.charAt(0) || member.profile.email?.charAt(0) || '?')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ marginBottom: undergroundTheme.spacing.md }}>
                      <h3 style={{
                        margin: 0,
                        fontSize: undergroundTheme.typography.fontSize.lg,
                        fontWeight: undergroundTheme.typography.fontWeight.bold,
                        color: undergroundTheme.colors.text.primary,
                        marginBottom: undergroundTheme.spacing.xs
                      }}>
                        {member.profile.name || member.profile.email || 'Unknown User'}
                      </h3>
                      <p style={{
                        margin: 0,
                        fontSize: undergroundTheme.typography.fontSize.sm,
                        color: undergroundTheme.colors.text.muted,
                        fontFamily: undergroundTheme.typography.fontFamily.mono
                      }}>
                        {member.profile.email || 'No email'}
                      </p>
                      {member.profile.phone && (
                        <p style={{
                          margin: `${undergroundTheme.spacing.xs} 0 0 0`,
                          fontSize: undergroundTheme.typography.fontSize.xs,
                          color: undergroundTheme.colors.text.tertiary
                        }}>
                          {member.profile.phone}
                        </p>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: undergroundTheme.spacing.sm, marginBottom: undergroundTheme.spacing.md, flexWrap: 'wrap' }}>
                      <UndergroundBadge variant="info">
                        {formatRoleName(member.role)}
                      </UndergroundBadge>
                      <UndergroundBadge variant={getStatusVariant(member.active)}>
                        {getStatusText(member.active)}
                      </UndergroundBadge>
                    </div>

                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.xs,
                      color: undergroundTheme.colors.text.tertiary,
                      marginBottom: undergroundTheme.spacing.lg
                    }}>
                      הצטרף {formatDate(member.created_at)}
                    </div>

                    <div style={{ display: 'flex', gap: undergroundTheme.spacing.sm, flexWrap: 'wrap' }}>
                      <UndergroundButton
                        onClick={() => handleToggleActive(member.id, member.active)}
                        variant="secondary"
                        size="sm"
                        style={{ flex: 1 }}
                      >
                        {member.active ? 'השעה' : 'הפעל'}
                      </UndergroundButton>
                      <UndergroundButton
                        onClick={() => handleRemoveMember(member.id)}
                        variant="danger"
                        size="sm"
                      >
                        {t('teamManagementPage.removeMember')}
                      </UndergroundButton>
                    </div>
                  </div>
                </div>
              </UndergroundCard>
            ))}
          </div>

      {filteredMembers.length === 0 && (
        <UndergroundCard style={{ gridColumn: '1 / -1' }}>
          <div style={{
            textAlign: 'center',
            padding: undergroundTheme.spacing['4xl'],
            color: undergroundTheme.colors.text.muted
          }}>
            <div style={{
              fontSize: '64px',
              marginBottom: undergroundTheme.spacing.lg
            }}>👥</div>
            <p style={{
              fontSize: undergroundTheme.typography.fontSize.lg,
              margin: 0
            }}>
              {teamMembers.length === 0
                ? 'אין חברי צוות עדיין. הזמן את החבר הראשון!'
                : t('teamManagementPage.noTeamMembers')}
            </p>
          </div>
        </UndergroundCard>
      )}

      {/* Invite Modal */}
      {inviteModalOpen && (
        <UndergroundModal
          isOpen={inviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
          title="הזמן חבר צוות"
        >
          <div style={{ marginBottom: undergroundTheme.spacing.xl }}>
            <label style={{
              display: 'block',
              marginBottom: undergroundTheme.spacing.sm,
              color: undergroundTheme.colors.text.secondary,
              fontSize: undergroundTheme.typography.fontSize.sm,
              fontWeight: undergroundTheme.typography.fontWeight.semibold
            }}>
              כתובת אימייל
            </label>
            <UndergroundInput
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="example@domain.com"
              disabled={inviting}
            />
          </div>

          <div style={{ marginBottom: undergroundTheme.spacing.xl }}>
            <label style={{
              display: 'block',
              marginBottom: undergroundTheme.spacing.sm,
              color: undergroundTheme.colors.text.secondary,
              fontSize: undergroundTheme.typography.fontSize.sm,
              fontWeight: undergroundTheme.typography.fontWeight.semibold
            }}>
              תפקיד
            </label>
            <UndergroundSelect
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              disabled={inviting}
            >
              <option value="manager">מנהל</option>
              <option value="dispatcher">משגר</option>
              <option value="warehouse">מחסנאי</option>
              <option value="sales">מכירות</option>
              <option value="customer_service">שירות לקוחות</option>
            </UndergroundSelect>
          </div>

          <div style={{ display: 'flex', gap: undergroundTheme.spacing.md }}>
            <UndergroundButton
              onClick={handleInviteMember}
              variant="primary"
              style={{ flex: 1 }}
              disabled={inviting || !inviteEmail || !inviteRole}
            >
              {inviting ? 'שולח הזמנה...' : 'שלח הזמנה'}
            </UndergroundButton>
            <UndergroundButton
              onClick={() => setInviteModalOpen(false)}
              variant="secondary"
              disabled={inviting}
            >
              ביטול
            </UndergroundButton>
          </div>
        </UndergroundModal>
      )}
    </div>
  );
}
