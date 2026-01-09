import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UniversalProfileHeader } from '../components/profile/UniversalProfileHeader';
import { PostCard } from '../components/social/PostCard';
import { LoadingState } from '../components/molecules/LoadingState';
import { EmptyState } from '../components/molecules/EmptyState';
import { Button } from '../components/atoms/Button';
import { colors, spacing, borderRadius, typography } from '../styles/design-system';
import { profileService, UserProfileData, ProfileStats, Achievement } from '../services/profileService';
import { logger } from '../lib/logger';
import { EnhancedEditProfileModal } from '../components/organisms/EnhancedEditProfileModal';

interface Post {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  media_urls?: string[];
}

type TabType = 'posts' | 'media' | 'likes' | 'about';

export function PublicUserProfile() {
  const { username, userId } = useParams<{ username?: string; userId?: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const targetUserId = userId || profile?.id;
  const isOwnProfile = targetUserId === currentUser?.id;

  useEffect(() => {
    loadProfile();
  }, [username, userId]);

  useEffect(() => {
    if (targetUserId) {
      recordProfileView();
    }
  }, [targetUserId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      let profileData: UserProfileData | null = null;

      if (username) {
        profileData = await profileService.getUserProfileByUsername(username);
      } else if (userId) {
        profileData = await profileService.getUserProfile(userId);
      }

      if (!profileData) {
        logger.error('[PublicUserProfile] Profile not found');
        setLoading(false);
        return;
      }

      setProfile(profileData);

      const [statsData, achievementsData] = await Promise.all([
        profileService.getProfileStats(profileData.id),
        profileService.getUserAchievements(profileData.id, true),
      ]);

      setStats(statsData);
      setAchievements(achievementsData);

      // Load posts (placeholder - integrate with your posts service)
      // const postsData = await postsService.getUserPosts(profileData.id);
      // setPosts(postsData);

    } catch (error) {
      logger.error('[PublicUserProfile] Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const recordProfileView = async () => {
    if (!targetUserId || isOwnProfile) return;

    try {
      await profileService.recordProfileView(
        targetUserId,
        currentUser?.id,
        undefined,
        document.referrer,
        navigator.userAgent
      );
    } catch (error) {
      logger.error('[PublicUserProfile] Failed to record profile view:', error);
    }
  };

  const handleFollow = async () => {
    if (!targetUserId) return;
    try {
      // Integrate with your follow service
      // await followService.followUser(targetUserId);
      setIsFollowing(true);
      await loadProfile();
    } catch (error) {
      logger.error('[PublicUserProfile] Failed to follow user:', error);
    }
  };

  const handleUnfollow = async () => {
    if (!targetUserId) return;
    try {
      // Integrate with your follow service
      // await followService.unfollowUser(targetUserId);
      setIsFollowing(false);
      await loadProfile();
    } catch (error) {
      logger.error('[PublicUserProfile] Failed to unfollow user:', error);
    }
  };

  const handleMessage = () => {
    if (!targetUserId) return;
    navigate(`/messages/${targetUserId}`);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile?.name || profile?.username}'s Profile`,
          text: profile?.bio || '',
          url,
        });
      } catch (error) {
        logger.info('[PublicUserProfile] Share cancelled or failed');
      }
    } else {
      // Fallback: Copy to clipboard
      await navigator.clipboard.writeText(url);
      alert('Profile link copied to clipboard!');
    }
  };

  const handleSaveProfile = async (updates: any) => {
    if (!currentUser?.id) return;

    try {
      await profileService.updateProfile(currentUser.id, updates);
      await loadProfile();
      setEditModalOpen(false);
    } catch (error) {
      logger.error('[PublicUserProfile] Failed to save profile:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div style={{ padding: spacing.xl }}>
        <LoadingState />
      </div>
    );
  }

  if (!profile || !stats) {
    return (
      <div style={{ padding: spacing.xl }}>
        <EmptyState
          title="Profile Not Found"
          description="The profile you're looking for doesn't exist or has been removed."
          action={<Button onClick={() => navigate('/')}>Go Home</Button>}
        />
      </div>
    );
  }

  const containerStyle: React.CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: spacing.xl,
  };

  const tabsContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: spacing.md,
    borderBottom: `1px solid ${colors.border.primary}`,
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
    overflowX: 'auto',
  };

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    padding: `${spacing.md} ${spacing.lg}`,
    background: 'transparent',
    border: 'none',
    borderBottom: `2px solid ${isActive ? colors.primary.DEFAULT : 'transparent'}`,
    color: isActive ? colors.text.primary : colors.text.secondary,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  });

  const contentStyle: React.CSSProperties = {
    marginTop: spacing.xl,
  };

  const postsGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: spacing.lg,
  };

  const mediaGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: spacing.md,
  };

  const mediaItemStyle: React.CSSProperties = {
    aspectRatio: '1',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    cursor: 'pointer',
    position: 'relative',
  };

  const aboutSectionStyle: React.CSSProperties = {
    backgroundColor: colors.ui.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    border: `1px solid ${colors.border.primary}`,
  };

  const aboutItemStyle: React.CSSProperties = {
    marginBottom: spacing.lg,
  };

  const aboutLabelStyle: React.CSSProperties = {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  };

  const aboutValueStyle: React.CSSProperties = {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  };

  return (
    <div style={containerStyle}>
      <UniversalProfileHeader
        profile={profile}
        stats={stats}
        achievements={achievements}
        isOwnProfile={isOwnProfile}
        isFollowing={isFollowing}
        onEditProfile={isOwnProfile ? () => setEditModalOpen(true) : undefined}
        onFollow={!isOwnProfile ? handleFollow : undefined}
        onUnfollow={!isOwnProfile ? handleUnfollow : undefined}
        onMessage={!isOwnProfile ? handleMessage : undefined}
        onShare={handleShare}
      />

      <div style={tabsContainerStyle}>
        <button
          onClick={() => setActiveTab('posts')}
          style={tabStyle(activeTab === 'posts')}
        >
          Posts {stats.posts_count > 0 && `(${stats.posts_count})`}
        </button>
        <button
          onClick={() => setActiveTab('media')}
          style={tabStyle(activeTab === 'media')}
        >
          Media {stats.media_posts_count > 0 && `(${stats.media_posts_count})`}
        </button>
        <button
          onClick={() => setActiveTab('likes')}
          style={tabStyle(activeTab === 'likes')}
        >
          Likes {stats.total_likes_given > 0 && `(${stats.total_likes_given})`}
        </button>
        <button
          onClick={() => setActiveTab('about')}
          style={tabStyle(activeTab === 'about')}
        >
          About
        </button>
      </div>

      <div style={contentStyle}>
        {activeTab === 'posts' && (
          <div style={postsGridStyle}>
            {posts.length > 0 ? (
              posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))
            ) : (
              <EmptyState
                title="No Posts Yet"
                description={
                  isOwnProfile
                    ? "You haven't posted anything yet. Share your first post!"
                    : "This user hasn't posted anything yet."
                }
              />
            )}
          </div>
        )}

        {activeTab === 'media' && (
          <div style={mediaGridStyle}>
            {posts.filter(p => p.media_urls && p.media_urls.length > 0).length > 0 ? (
              posts
                .filter(p => p.media_urls && p.media_urls.length > 0)
                .map((post) => (
                  <div key={post.id} style={mediaItemStyle}>
                    <img
                      src={post.media_urls?.[0]}
                      alt="Post media"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ))
            ) : (
              <EmptyState
                title="No Media Posts"
                description={
                  isOwnProfile
                    ? "You haven't posted any photos or videos yet."
                    : "This user hasn't posted any media yet."
                }
              />
            )}
          </div>
        )}

        {activeTab === 'likes' && (
          <div style={postsGridStyle}>
            <EmptyState
              title="Liked Posts"
              description="Posts liked by this user will appear here."
            />
          </div>
        )}

        {activeTab === 'about' && (
          <div style={aboutSectionStyle}>
            <h2 style={{ marginBottom: spacing.lg, fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold }}>
              About
            </h2>

            {profile.role && (
              <div style={aboutItemStyle}>
                <div style={aboutLabelStyle}>Role</div>
                <div style={aboutValueStyle}>{profile.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
              </div>
            )}

            {profile.interests && profile.interests.length > 0 && (
              <div style={aboutItemStyle}>
                <div style={aboutLabelStyle}>Interests</div>
                <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
                  {profile.interests.map((interest, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: `${spacing.xs} ${spacing.sm}`,
                        backgroundColor: colors.ui.secondary,
                        borderRadius: borderRadius.md,
                        fontSize: typography.fontSize.sm,
                        color: colors.text.primary,
                      }}
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {profile.skills && profile.skills.length > 0 && (
              <div style={aboutItemStyle}>
                <div style={aboutLabelStyle}>Skills</div>
                <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
                  {profile.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: `${spacing.xs} ${spacing.sm}`,
                        backgroundColor: colors.ui.secondary,
                        borderRadius: borderRadius.md,
                        fontSize: typography.fontSize.sm,
                        color: colors.text.primary,
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {achievements.length > 0 && (
              <div style={aboutItemStyle}>
                <div style={aboutLabelStyle}>Achievements ({achievements.length})</div>
                <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.sm }}>
                  {achievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      style={{
                        padding: spacing.md,
                        backgroundColor: colors.ui.secondary,
                        borderRadius: borderRadius.md,
                        fontSize: typography.fontSize.sm,
                        border: `1px solid ${colors.border.primary}`,
                      }}
                      title={achievement.achievement_description || ''}
                    >
                      <div style={{ fontSize: typography.fontSize['2xl'], marginBottom: spacing.xs }}>
                        {achievement.achievement_icon}
                      </div>
                      <div style={{ fontWeight: typography.fontWeight.semibold, marginBottom: spacing.xs }}>
                        {achievement.achievement_name}
                      </div>
                      {achievement.is_rare && (
                        <span style={{ fontSize: typography.fontSize.xs, color: colors.status.warning }}>
                          ⭐ Rare
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isOwnProfile && (
              <div style={aboutItemStyle}>
                <div style={aboutLabelStyle}>Profile Views</div>
                <div style={aboutValueStyle}>
                  {stats.profile_views_count} total views
                  {stats.profile_views_this_week > 0 && ` • ${stats.profile_views_this_week} this week`}
                </div>
              </div>
            )}

            <div style={aboutItemStyle}>
              <div style={aboutLabelStyle}>Member Since</div>
              <div style={aboutValueStyle}>
                {new Date(profile.created_at).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {isOwnProfile && (
        <EnhancedEditProfileModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          currentProfile={profile}
          onSave={handleSaveProfile}
          role={profile.role}
        />
      )}
    </div>
  );
}
