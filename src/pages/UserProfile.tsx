import React, { useEffect, useState } from 'react';
import { useAppServices } from '../context/AppServicesContext';
import { useAuth } from '../context/AuthContext';
import type { UserProfile, Post, User } from '../data/types';
import { PostCard } from '../components/social/PostCard';
import { Card } from '../components/molecules/Card';
import { MetricCard, MetricGrid } from '../components/dashboard/MetricCard';
import { Button } from '../components/atoms/Button';
import { Avatar } from '../components/atoms/Avatar';
import { Badge } from '../components/atoms/Badge';
import { Divider } from '../components/atoms/Divider';
import { EmptyState } from '../components/molecules/EmptyState';
import { LoadingState } from '../components/molecules/LoadingState';
import { EditProfileModal } from '../components/organisms/EditProfileModal';
import { logger } from '../lib/logger';
import { colors, spacing, borderRadius, shadows, typography } from '../styles/design-system';

interface UserProfileProps {
  userId?: string;
}

export function UserProfilePage({ userId }: UserProfileProps) {
  const { dataStore } = useAppServices();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'replies' | 'media' | 'likes'>('posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const isOwnProfile = !userId || userId === currentUser?.id;
  const targetUserId = userId || currentUser?.id;

  useEffect(() => {
    if (targetUserId) {
      loadProfile();
      loadPosts();
      if (!isOwnProfile) {
        checkFollowStatus();
      }
    }
  }, [targetUserId]);

  const loadProfile = async () => {
    try {
      if (!targetUserId) {
        logger.warn('[UserProfile] No target user ID');
        return;
      }

      const profileData = await dataStore.getUserProfile?.(targetUserId);
      if (profileData) {
        setProfile(profileData);
      } else {
        setProfile({
          id: targetUserId,
          bio: '',
          website: '',
          location: '',
          banner_url: '',
          followers_count: 0,
          following_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      const userData = await dataStore.getUser?.(targetUserId);
      if (userData) {
        setUser(userData);
      } else {
        setUser({
          id: targetUserId,
          wallet_address: targetUserId,
          name: targetUserId.slice(0, 8),
          username: targetUserId.slice(0, 12),
          role: 'customer',
          created_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Failed to load profile:', error);
    }
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      const postsData = await dataStore.getUserPosts?.(targetUserId!, 50);
      setPosts(postsData || []);
    } catch (error) {
      logger.error('Failed to load posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    try {
      const following = await dataStore.isFollowing?.(targetUserId!);
      setIsFollowing(!!following);
    } catch (error) {
      logger.error('Failed to check follow status:', error);
    }
  };

  const handleFollow = async () => {
    if (!targetUserId) return;
    try {
      if (isFollowing) {
        await dataStore.unfollowUser?.(targetUserId);
      } else {
        await dataStore.followUser?.(targetUserId);
      }
      setIsFollowing(!isFollowing);
      await loadProfile();
    } catch (error) {
      logger.error('Failed to follow/unfollow:', error);
    }
  };

  const handleLike = async (postId: string, isLiked: boolean) => {
    try {
      if (isLiked) {
        await dataStore.unlikePost?.(postId);
      } else {
        await dataStore.likePost?.(postId);
      }
      await loadPosts();
    } catch (error) {
      logger.error('Failed to like/unlike post:', error);
    }
  };

  const handleRepost = async (postId: string, comment?: string) => {
    try {
      await dataStore.repostPost?.(postId, comment);
      await loadPosts();
    } catch (error) {
      logger.error('Failed to repost:', error);
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      await dataStore.deletePost?.(postId);
      await loadPosts();
    } catch (error) {
      logger.error('Failed to delete post:', error);
    }
  };

  const handleSaveProfile = async (updatedProfile: {
    name?: string;
    username?: string;
    bio?: string;
    location?: string;
    website?: string;
    photo_url?: string;
  }) => {
    try {
      await dataStore.updateProfile?.({
        ...currentUser,
        ...updatedProfile,
      });
      await dataStore.updateUserProfile?.(targetUserId!, {
        bio: updatedProfile.bio,
        location: updatedProfile.location,
        website: updatedProfile.website,
      });
      await loadProfile();
    } catch (error) {
      logger.error('Failed to save profile:', error);
      throw error;
    }
  };

  if (!profile || !user) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: colors.background.primary
      }}>
        <LoadingState message="Loading profile..." />
      </div>
    );
  }

  const tabItems = [
    { id: 'posts', label: 'Posts', icon: '📝' },
    { id: 'replies', label: 'Replies', icon: '💬' },
    { id: 'media', label: 'Media', icon: '📷' },
    { id: 'likes', label: 'Likes', icon: '❤️' }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.background.primary,
      paddingBottom: spacing['3xl']
    }}>
      <div style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: spacing.lg
      }}>
        <Card style={{ marginBottom: spacing.xl, overflow: 'hidden', boxShadow: shadows.xl }}>
          {profile.banner_url ? (
            <div style={{
              height: '240px',
              background: `url(${profile.banner_url}) center/cover`,
              backgroundColor: colors.background.secondary
            }} />
          ) : (
            <div style={{
              height: '240px',
              background: `linear-gradient(135deg, ${colors.brand.primary} 0%, ${colors.brand.primaryDark} 100%)`,
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '-50%',
                right: '-10%',
                width: '400px',
                height: '400px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '50%',
                filter: 'blur(60px)'
              }} />
            </div>
          )}

          <div style={{ padding: spacing.xl }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginTop: `-${spacing['4xl']}`,
              marginBottom: spacing.xl
            }}>
              <Avatar
                src={user.photo_url}
                alt={user.name || 'User'}
                size={140}
                fallback={user.name || user.username}
                online={isOwnProfile}
              />

              <div style={{ paddingTop: spacing.xl }}>
                {isOwnProfile ? (
                  <Button variant="secondary" size="md" onClick={() => setEditModalOpen(true)}>
                    Edit Profile
                  </Button>
                ) : (
                  <Button
                    variant={isFollowing ? 'secondary' : 'primary'}
                    size="md"
                    onClick={handleFollow}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </Button>
                )}
              </div>
            </div>

            <div style={{ marginTop: spacing.xl }}>
              <h1 style={{
                color: colors.text.primary,
                marginBottom: spacing.xs,
                fontSize: 'clamp(24px, 5vw, 32px)',
                fontWeight: 800
              }}>
                {user.name || user.username || 'Unknown User'}
              </h1>
              {user.username && (
                <p style={{
                  color: colors.text.secondary,
                  marginBottom: spacing.md,
                  fontSize: typography.fontSize.base
                }}>
                  @{user.username}
                </p>
              )}
              {user.role && (
                <Badge
                  variant="primary"
                  style={{
                    marginBottom: spacing.md,
                    background: `linear-gradient(135deg, ${colors.brand.primary} 0%, ${colors.brand.primaryDark} 100%)`,
                    color: colors.white,
                    border: 'none',
                    padding: `${spacing.sm} ${spacing.md}`,
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.bold
                  }}
                >
                  {user.role}
                </Badge>
              )}
              {profile.bio && (
                <p style={{
                  color: colors.text.primary,
                  marginTop: spacing.lg,
                  lineHeight: 1.7,
                  fontSize: typography.fontSize.base
                }}>
                  {profile.bio}
                </p>
              )}

              <div style={{
                display: 'flex',
                gap: spacing.xl,
                marginTop: spacing.lg,
                color: colors.text.secondary,
                flexWrap: 'wrap'
              }}>
                {profile.location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                    <span style={{ fontSize: '18px' }}>📍</span>
                    <span style={{ fontSize: typography.fontSize.base }}>{profile.location}</span>
                  </div>
                )}
                {profile.website && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                    <span style={{ fontSize: '18px' }}>🔗</span>
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: typography.fontSize.base,
                        color: colors.brand.primary,
                        textDecoration: 'none',
                        fontWeight: typography.fontWeight.medium
                      }}
                    >
                      {profile.website}
                    </a>
                  </div>
                )}
              </div>

              <MetricGrid columns={2} style={{ marginTop: spacing.xl }}>
                <MetricCard
                  label="Following"
                  value={profile.following_count}
                  icon="👥"
                  variant="primary"
                  size="small"
                />
                <MetricCard
                  label="Followers"
                  value={profile.followers_count}
                  icon="⭐"
                  variant="success"
                  size="small"
                />
              </MetricGrid>
            </div>
          </div>
        </Card>

        <Card style={{ marginBottom: spacing.xl, boxShadow: shadows.lg }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${tabItems.length}, 1fr)`,
            borderBottom: `2px solid ${colors.border.primary}`
          }}>
            {tabItems.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: spacing.lg,
                  background: activeTab === tab.id
                    ? `linear-gradient(to bottom, ${colors.brand.primaryFaded}, transparent)`
                    : 'transparent',
                  border: 'none',
                  fontWeight: 600,
                  color: activeTab === tab.id ? colors.brand.primary : colors.text.secondary,
                  borderBottom: activeTab === tab.id ? `3px solid ${colors.brand.primary}` : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing.sm
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div>
            {loading ? (
              <div style={{ padding: spacing.xxl }}>
                <LoadingState message="Loading posts..." />
              </div>
            ) : posts.length === 0 ? (
              <div style={{ padding: spacing.xxl }}>
                <EmptyState
                  icon="📝"
                  title="No posts yet"
                  description={isOwnProfile ? "You haven't posted anything yet" : "This user hasn't posted anything yet"}
                />
              </div>
            ) : (
              <div>
                {posts.map((post, index) => (
                  <div key={post.id}>
                    <div style={{ padding: spacing.lg }}>
                      <PostCard
                        post={post}
                        onLike={(isLiked) => handleLike(post.id, isLiked)}
                        onRepost={(comment) => handleRepost(post.id, comment)}
                        onDelete={() => handleDelete(post.id)}
                      />
                    </div>
                    {index < posts.length - 1 && <Divider />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      <EditProfileModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        currentProfile={{
          name: user?.name,
          username: user?.username,
          bio: profile?.bio,
          location: profile?.location,
          website: profile?.website,
          photo_url: user?.photo_url,
        }}
        onSave={handleSaveProfile}
      />
    </div>
  );
}
