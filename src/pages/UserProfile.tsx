import React, { useEffect, useState } from 'react';
import { useAppServices } from '../context/AppServicesContext';
import { useAuth } from '../context/AuthContext';
import type { UserProfile, Post, User } from '../data/types';
import { PostCard } from '../components/social/PostCard';
import { Card } from '../components/molecules/Card';
import { Button } from '../components/atoms/Button';
import { Avatar } from '../components/atoms/Avatar';
import { Badge } from '../components/atoms/Badge';
import { Divider } from '../components/atoms/Divider';
import { EmptyState } from '../components/molecules/EmptyState';
import { LoadingState } from '../components/molecules/LoadingState';
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
    { id: 'posts', label: 'Posts' },
    { id: 'replies', label: 'Replies' },
    { id: 'media', label: 'Media' },
    { id: 'likes', label: 'Likes' }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.background.primary,
      padding: spacing.lg
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto'
      }}>
        <Card style={{ marginBottom: spacing.xl, overflow: 'hidden' }}>
          {profile.banner_url && (
            <div style={{
              height: '200px',
              background: `url(${profile.banner_url}) center/cover`,
              backgroundColor: colors.background.secondary
            }} />
          )}
          {!profile.banner_url && (
            <div style={{
              height: '200px',
              background: `linear-gradient(135deg, ${colors.brand.primary} 0%, ${colors.brand.primaryDark} 100%)`
            }} />
          )}

          <div style={{ padding: spacing.xl }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginTop: `-${spacing.xxxl}`,
              marginBottom: spacing.lg
            }}>
              <Avatar
                src={user.photo_url}
                alt={user.name || 'User'}
                size={120}
                fallback={user.name || user.username}
                online={isOwnProfile}
              />

              <div style={{ paddingTop: spacing.xl }}>
                {isOwnProfile ? (
                  <Button variant="secondary" size="md">
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

            <div style={{ marginTop: spacing.lg }}>
              <h1 style={{
                ...typography.heading1,
                color: colors.text.primary,
                marginBottom: spacing.xs
              }}>
                {user.name || user.username || 'Unknown User'}
              </h1>
              {user.username && (
                <p style={{
                  ...typography.body,
                  color: colors.text.secondary,
                  marginBottom: spacing.md
                }}>
                  @{user.username}
                </p>
              )}
              {user.role && (
                <Badge variant="primary" style={{ marginBottom: spacing.md }}>
                  {user.role}
                </Badge>
              )}
              {profile.bio && (
                <p style={{
                  ...typography.body,
                  color: colors.text.primary,
                  marginTop: spacing.md,
                  lineHeight: 1.6
                }}>
                  {profile.bio}
                </p>
              )}

              <div style={{
                display: 'flex',
                gap: spacing.lg,
                marginTop: spacing.md,
                color: colors.text.secondary,
                flexWrap: 'wrap'
              }}>
                {profile.location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                    <span>📍</span>
                    <span style={typography.small}>{profile.location}</span>
                  </div>
                )}
                {profile.website && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                    <span>🔗</span>
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        ...typography.small,
                        color: colors.brand.primary,
                        textDecoration: 'none'
                      }}
                    >
                      {profile.website}
                    </a>
                  </div>
                )}
              </div>

              <div style={{
                display: 'flex',
                gap: spacing.xl,
                marginTop: spacing.lg
              }}>
                <button style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  ...typography.body
                }}>
                  <span style={{ fontWeight: 700, color: colors.text.primary }}>
                    {profile.following_count}
                  </span>{' '}
                  <span style={{ color: colors.text.secondary }}>Following</span>
                </button>
                <button style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  ...typography.body
                }}>
                  <span style={{ fontWeight: 700, color: colors.text.primary }}>
                    {profile.followers_count}
                  </span>{' '}
                  <span style={{ color: colors.text.secondary }}>Followers</span>
                </button>
              </div>
            </div>
          </div>
        </Card>

        <Card style={{ marginBottom: spacing.xl }}>
          <div style={{
            display: 'flex',
            borderBottom: `1px solid ${colors.border.primary}`
          }}>
            {tabItems.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  flex: 1,
                  padding: spacing.lg,
                  background: 'transparent',
                  border: 'none',
                  ...typography.body,
                  fontWeight: 600,
                  color: activeTab === tab.id ? colors.brand.primary : colors.text.secondary,
                  borderBottom: activeTab === tab.id ? `3px solid ${colors.brand.primary}` : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {tab.label}
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
                    <PostCard
                      post={post}
                      onLike={(isLiked) => handleLike(post.id, isLiked)}
                      onRepost={(comment) => handleRepost(post.id, comment)}
                      onDelete={() => handleDelete(post.id)}
                    />
                    {index < posts.length - 1 && <Divider />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
