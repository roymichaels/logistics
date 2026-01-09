import React from 'react';
import { Avatar } from '../atoms/Avatar';
import { Button } from '../atoms/Button';
import { RoleBadge, VerificationBadge, UserRole } from '../atoms/RoleBadge';
import { colors, spacing, borderRadius, typography } from '../../styles/design-system';
import type { UserProfileData, ProfileStats, Achievement } from '../../services/profileService';

interface UniversalProfileHeaderProps {
  profile: UserProfileData;
  stats: ProfileStats;
  achievements?: Achievement[];
  isOwnProfile: boolean;
  isFollowing?: boolean;
  onEditProfile?: () => void;
  onFollow?: () => void;
  onUnfollow?: () => void;
  onMessage?: () => void;
  onShare?: () => void;
}

export function UniversalProfileHeader({
  profile,
  stats,
  achievements = [],
  isOwnProfile,
  isFollowing = false,
  onEditProfile,
  onFollow,
  onUnfollow,
  onMessage,
  onShare,
}: UniversalProfileHeaderProps) {
  const displayedAchievements = achievements.filter(a => a.is_visible).slice(0, 3);

  const bannerStyle: React.CSSProperties = {
    width: '100%',
    height: '200px',
    background: profile.banner_url
      ? `url(${profile.banner_url}) center/cover`
      : `linear-gradient(135deg, ${colors.primary.DEFAULT}, ${colors.primary.dark})`,
    borderRadius: `${borderRadius.xl} ${borderRadius.xl} 0 0`,
    position: 'relative',
  };

  const containerStyle: React.CSSProperties = {
    backgroundColor: colors.ui.card,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    border: `1px solid ${colors.border.primary}`,
  };

  const contentStyle: React.CSSProperties = {
    padding: spacing.xl,
    position: 'relative',
  };

  const avatarContainerStyle: React.CSSProperties = {
    marginTop: '-60px',
    marginBottom: spacing.md,
    position: 'relative',
  };

  const avatarWrapperStyle: React.CSSProperties = {
    width: '120px',
    height: '120px',
    border: `4px solid ${colors.ui.card}`,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    position: 'relative',
  };

  const verificationWrapperStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '8px',
    right: '8px',
  };

  const headerTopStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  };

  const userInfoStyle: React.CSSProperties = {
    flex: 1,
  };

  const nameRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  };

  const nameStyle: React.CSSProperties = {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    margin: 0,
  };

  const usernameStyle: React.CSSProperties = {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  };

  const taglineStyle: React.CSSProperties = {
    fontSize: typography.fontSize.lg,
    color: colors.text.primary,
    marginBottom: spacing.md,
    fontStyle: 'italic',
  };

  const bioStyle: React.CSSProperties = {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    lineHeight: 1.6,
    marginBottom: spacing.md,
    whiteSpace: 'pre-wrap',
  };

  const metaInfoStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
    marginBottom: spacing.md,
  };

  const metaItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  };

  const statsContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: spacing.xl,
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
  };

  const statItemStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    cursor: 'pointer',
  };

  const statValueStyle: React.CSSProperties = {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  };

  const statLabelStyle: React.CSSProperties = {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  };

  const actionsStyle: React.CSSProperties = {
    display: 'flex',
    gap: spacing.md,
    flexShrink: 0,
    flexWrap: 'wrap',
  };

  const achievementsStyle: React.CSSProperties = {
    display: 'flex',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.ui.secondary,
    borderRadius: borderRadius.md,
    flexWrap: 'wrap',
  };

  const achievementBadgeStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: `${spacing.xs} ${spacing.sm}`,
    backgroundColor: colors.ui.card,
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.sm,
    border: `1px solid ${colors.border.primary}`,
  };

  const socialLinksStyle: React.CSSProperties = {
    display: 'flex',
    gap: spacing.md,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  };

  const socialLinkStyle: React.CSSProperties = {
    padding: `${spacing.xs} ${spacing.sm}`,
    backgroundColor: colors.ui.secondary,
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textDecoration: 'none',
    transition: 'all 0.2s',
    border: `1px solid ${colors.border.primary}`,
  };

  const completenessBarContainerStyle: React.CSSProperties = {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.ui.secondary,
    borderRadius: borderRadius.md,
  };

  const completenessBarStyle: React.CSSProperties = {
    height: '8px',
    backgroundColor: colors.border.primary,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginTop: spacing.sm,
  };

  const completenessBarFillStyle: React.CSSProperties = {
    height: '100%',
    backgroundColor: stats.profile_completeness_percentage >= 80 ? colors.status.success :
                    stats.profile_completeness_percentage >= 50 ? colors.status.warning :
                    colors.status.error,
    width: `${stats.profile_completeness_percentage}%`,
    transition: 'width 0.3s ease',
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const getTierColor = (tier: string): string => {
    const colors = {
      bronze: '#CD7F32',
      silver: '#C0C0C0',
      gold: '#FFD700',
      platinum: '#E5E4E2',
      diamond: '#B9F2FF',
    };
    return colors[tier as keyof typeof colors] || '#CD7F32';
  };

  return (
    <div style={containerStyle}>
      <div style={bannerStyle} />

      <div style={contentStyle}>
        <div style={headerTopStyle}>
          <div style={avatarContainerStyle}>
            <div style={avatarWrapperStyle}>
              <Avatar
                src={profile.photo_url || profile.avatar_url || undefined}
                alt={profile.name || profile.username || 'User'}
                size="xl"
              />
              {profile.is_verified && (
                <div style={verificationWrapperStyle}>
                  <VerificationBadge size="medium" />
                </div>
              )}
            </div>
          </div>

          <div style={actionsStyle}>
            {isOwnProfile ? (
              <>
                {onEditProfile && (
                  <Button variant="secondary" size="md" onClick={onEditProfile}>
                    Edit Profile
                  </Button>
                )}
              </>
            ) : (
              <>
                {isFollowing ? (
                  onUnfollow && (
                    <Button variant="secondary" size="md" onClick={onUnfollow}>
                      Following
                    </Button>
                  )
                ) : (
                  onFollow && (
                    <Button variant="primary" size="md" onClick={onFollow}>
                      Follow
                    </Button>
                  )
                )}
                {onMessage && (
                  <Button variant="secondary" size="md" onClick={onMessage}>
                    Message
                  </Button>
                )}
              </>
            )}
            {onShare && (
              <Button variant="secondary" size="md" onClick={onShare}>
                Share
              </Button>
            )}
          </div>
        </div>

        <div style={userInfoStyle}>
          <div style={nameRowStyle}>
            <h1 style={nameStyle}>{profile.name || profile.username || 'Anonymous'}</h1>
            <RoleBadge role={profile.role as UserRole} size="medium" />
          </div>

          {profile.username && (
            <div style={usernameStyle}>@{profile.username}</div>
          )}

          {profile.tagline && (
            <div style={taglineStyle}>{profile.tagline}</div>
          )}

          {profile.bio && (
            <div style={bioStyle}>{profile.bio}</div>
          )}

          <div style={metaInfoStyle}>
            {profile.location && (
              <div style={metaItemStyle}>
                <span>📍</span>
                <span>{profile.location}</span>
              </div>
            )}
            {profile.website && (
              <div style={metaItemStyle}>
                <span>🔗</span>
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: colors.primary.DEFAULT, textDecoration: 'none' }}
                >
                  {profile.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
            <div style={metaItemStyle}>
              <span>📅</span>
              <span>Joined {formatDate(profile.created_at)}</span>
            </div>
          </div>

          {profile.social_links && Object.keys(profile.social_links).length > 0 && (
            <div style={socialLinksStyle}>
              {Object.entries(profile.social_links).map(([platform, value]) => (
                <a
                  key={platform}
                  href={value.startsWith('http') ? value : `https://${platform}.com/${value}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={socialLinkStyle}
                >
                  {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </a>
              ))}
            </div>
          )}
        </div>

        <div style={statsContainerStyle}>
          <div style={statItemStyle}>
            <div style={statValueStyle}>{formatNumber(stats.posts_count)}</div>
            <div style={statLabelStyle}>Posts</div>
          </div>
          <div style={statItemStyle}>
            <div style={statValueStyle}>{formatNumber(stats.followers_count)}</div>
            <div style={statLabelStyle}>Followers</div>
          </div>
          <div style={statItemStyle}>
            <div style={statValueStyle}>{formatNumber(stats.following_count)}</div>
            <div style={statLabelStyle}>Following</div>
          </div>
          <div style={statItemStyle}>
            <div style={statValueStyle}>{formatNumber(stats.total_likes_received)}</div>
            <div style={statLabelStyle}>Likes</div>
          </div>
        </div>

        {displayedAchievements.length > 0 && (
          <div style={achievementsStyle}>
            {displayedAchievements.map((achievement) => (
              <div
                key={achievement.id}
                style={{
                  ...achievementBadgeStyle,
                  borderColor: getTierColor(achievement.achievement_tier),
                }}
                title={achievement.achievement_description || achievement.achievement_name}
              >
                <span style={{ fontSize: typography.fontSize.lg }}>
                  {achievement.achievement_icon}
                </span>
                <span>{achievement.achievement_name}</span>
                {achievement.is_rare && (
                  <span style={{ color: getTierColor(achievement.achievement_tier) }}>⭐</span>
                )}
              </div>
            ))}
            {achievements.length > 3 && (
              <div style={achievementBadgeStyle}>
                +{achievements.length - 3} more
              </div>
            )}
          </div>
        )}

        {isOwnProfile && stats.profile_completeness_percentage < 100 && (
          <div style={completenessBarContainerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>
                Profile Completeness
              </span>
              <span style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                {stats.profile_completeness_percentage}%
              </span>
            </div>
            <div style={completenessBarStyle}>
              <div style={completenessBarFillStyle} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
