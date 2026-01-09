import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { UniversalProfileHeader } from '../components/profile/UniversalProfileHeader';
import { PostCard } from '../components/social/PostCard';
import { LoadingState } from '../components/molecules/LoadingState';
import { EmptyState } from '../components/molecules/EmptyState';
import { Button } from '../components/atoms/Button';
import { EditOverlay, EditButton, QuickActionMenu } from '../components/edit';
import { EditAvatarModal, EditBioModal } from '../components/modals';
import { colors, spacing, borderRadius, typography } from '../styles/design-system';
import { profileService, UserProfileData, ProfileStats, Achievement } from '../services/profileService';
import { logger } from '../lib/logger';
import { Pencil, Settings, Share2, MessageCircle, UserPlus, UserMinus, MoreVertical, Trash2 } from 'lucide-react';

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

export function EnhancedPublicUserProfile() {
  const { username, userId } = useParams<{ username?: string; userId?: string }>();
  const { user: currentUser } = useAuth();
  const { openModal, closeModal } = useModal();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

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
        logger.error('[EnhancedPublicUserProfile] Profile not found');
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

    } catch (error) {
      logger.error('[EnhancedPublicUserProfile] Failed to load profile:', error);
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
      logger.error('[EnhancedPublicUserProfile] Failed to record profile view:', error);
    }
  };

  const handleEditAvatar = () => {
    const modalId = openModal({
      component: (
        <EditAvatarModal
          currentAvatar={profile?.avatar_url}
          onSave={async (file) => {
            await profileService.updateProfileAvatar(currentUser!.id, file);
            await loadProfile();
            closeModal(modalId);
          }}
          onClose={() => closeModal(modalId)}
        />
      ),
    });
  };

  const handleEditBio = () => {
    const modalId = openModal({
      component: (
        <EditBioModal
          currentBio={profile?.bio}
          currentDisplayName={profile?.name}
          currentUsername={profile?.username}
          onSave={async (data) => {
            await profileService.updateProfile(currentUser!.id, data);
            await loadProfile();
            closeModal(modalId);
          }}
          onClose={() => closeModal(modalId)}
        />
      ),
    });
  };

  const handleFollow = async () => {
    if (!targetUserId) return;
    try {
      setIsFollowing(true);
      await loadProfile();
    } catch (error) {
      logger.error('[EnhancedPublicUserProfile] Failed to follow user:', error);
    }
  };

  const handleUnfollow = async () => {
    if (!targetUserId) return;
    try {
      setIsFollowing(false);
      await loadProfile();
    } catch (error) {
      logger.error('[EnhancedPublicUserProfile] Failed to unfollow user:', error);
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
        logger.info('[EnhancedPublicUserProfile] Share cancelled or failed');
      }
    } else {
      await navigator.clipboard.writeText(url);
      alert('Profile link copied to clipboard!');
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

  return (
    <div style={containerStyle}>
      <div style={{ position: 'relative' }}>
        <EditOverlay
          entityType="profile"
          entityOwnerId={currentUser?.id}
          onEdit={handleEditAvatar}
          position="top-right"
        >
          <UniversalProfileHeader
            profile={profile}
            stats={stats}
            achievements={achievements}
            isOwnProfile={isOwnProfile}
            isFollowing={isFollowing}
            onEditProfile={undefined}
            onFollow={!isOwnProfile ? handleFollow : undefined}
            onUnfollow={!isOwnProfile ? handleUnfollow : undefined}
            onMessage={!isOwnProfile ? handleMessage : undefined}
            onShare={handleShare}
          />
        </EditOverlay>

        {isOwnProfile && (
          <div style={{
            position: 'absolute',
            top: spacing.md,
            right: spacing.md,
            display: 'flex',
            gap: spacing.sm,
          }}>
            <EditButton
              entityType="profile"
              entityOwnerId={currentUser?.id}
              onClick={handleEditBio}
              variant="icon"
              size="md"
            />
          </div>
        )}
      </div>

      <div style={{
        display: 'flex',
        gap: spacing.md,
        borderBottom: `1px solid ${colors.border.primary}`,
        marginTop: spacing.xl,
        marginBottom: spacing.xl,
        overflowX: 'auto',
      }}>
        {(['posts', 'media', 'likes', 'about'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: `${spacing.md} ${spacing.lg}`,
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${activeTab === tab ? colors.primary.DEFAULT : 'transparent'}`,
              color: activeTab === tab ? colors.text.primary : colors.text.secondary,
              fontSize: typography.fontSize.base,
              fontWeight: typography.fontWeight.semibold,
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
              textTransform: 'capitalize',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={{ marginTop: spacing.xl }}>
        {activeTab === 'posts' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: spacing.lg,
          }}>
            {posts.length > 0 ? (
              posts.map((post) => (
                <div key={post.id} style={{ position: 'relative' }}>
                  <PostCard post={post} />
                  {isOwnProfile && (
                    <div style={{
                      position: 'absolute',
                      top: spacing.sm,
                      right: spacing.sm,
                    }}>
                      <QuickActionMenu
                        entityType="post"
                        entityOwnerId={currentUser?.id}
                        actions={[
                          {
                            label: 'Edit Post',
                            icon: <Pencil size={16} />,
                            onClick: () => {},
                            requirePermission: 'edit',
                          },
                          {
                            label: 'Delete Post',
                            icon: <Trash2 size={16} />,
                            onClick: () => {},
                            variant: 'danger',
                            requirePermission: 'delete',
                          },
                        ]}
                      />
                    </div>
                  )}
                </div>
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

        {activeTab === 'about' && (
          <div style={{
            backgroundColor: colors.ui.card,
            borderRadius: borderRadius.xl,
            padding: spacing.xl,
            border: `1px solid ${colors.border.primary}`,
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing.lg,
            }}>
              <h2 style={{
                fontSize: typography.fontSize.xl,
                fontWeight: typography.fontWeight.bold,
              }}>
                About
              </h2>
              {isOwnProfile && (
                <EditButton
                  entityType="profile"
                  entityOwnerId={currentUser?.id}
                  onClick={handleEditBio}
                  variant="ghost"
                  size="sm"
                />
              )}
            </div>

            {profile.role && (
              <div style={{ marginBottom: spacing.lg }}>
                <div style={{
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.text.secondary,
                  marginBottom: spacing.xs,
                }}>
                  Role
                </div>
                <div style={{
                  fontSize: typography.fontSize.base,
                  color: colors.text.primary,
                }}>
                  {profile.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </div>
              </div>
            )}

            <div style={{ marginBottom: spacing.lg }}>
              <div style={{
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.semibold,
                color: colors.text.secondary,
                marginBottom: spacing.xs,
              }}>
                Member Since
              </div>
              <div style={{
                fontSize: typography.fontSize.base,
                color: colors.text.primary,
              }}>
                {new Date(profile.created_at).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
