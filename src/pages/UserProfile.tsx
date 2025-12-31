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
import { SettingsModal } from '../components/organisms/SettingsModal';
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
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

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
      background: '#15202B',
      paddingBottom: spacing['3xl']
    }}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        position: 'relative'
      }}>
        {/* Settings Button - Top Right */}
        {isOwnProfile && (
          <button
            onClick={() => setSettingsModalOpen(true)}
            style={{
              position: 'absolute',
              top: spacing.lg,
              right: spacing.lg,
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '20px',
              color: 'rgba(255, 255, 255, 0.7)',
              transition: 'all 0.2s ease',
              zIndex: 10
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            ⚙️
          </button>
        )}

        {/* Profile Content */}
        <div style={{
          background: 'rgba(30, 30, 35, 0.8)',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          margin: spacing.lg,
          padding: `${spacing['3xl']} ${spacing.xl}`,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          textAlign: 'center'
        }}>
          {/* Avatar */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: spacing.xl
          }}>
            <div style={{ position: 'relative' }}>
              <Avatar
                src={user.photo_url}
                alt={user.name || 'User'}
                size={140}
                fallback={user.name || user.username}
                online={isOwnProfile}
              />
            </div>
          </div>

          {/* Edit Profile Button */}
          {isOwnProfile && (
            <Button
              variant="secondary"
              size="md"
              onClick={() => setEditModalOpen(true)}
              style={{
                marginBottom: spacing.xl,
                background: 'rgba(29, 155, 240, 0.1)',
                color: '#1D9BF0',
                border: '1px solid rgba(29, 155, 240, 0.3)',
                padding: '10px 24px',
                borderRadius: '20px',
                fontWeight: 600
              }}
            >
              Edit Profile
            </Button>
          )}

          {!isOwnProfile && (
            <Button
              variant={isFollowing ? 'secondary' : 'primary'}
              size="md"
              onClick={handleFollow}
              style={{
                marginBottom: spacing.xl,
                padding: '10px 32px',
                borderRadius: '20px',
                fontWeight: 600
              }}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
          )}

          {/* User Info */}
          <h1 style={{
            color: '#E7E9EA',
            marginBottom: spacing.xs,
            fontSize: 'clamp(24px, 5vw, 28px)',
            fontWeight: 700,
            letterSpacing: '-0.5px'
          }}>
            {user.name || user.username || 'Unknown User'}
          </h1>

          {user.username && (
            <p style={{
              color: '#71767B',
              marginBottom: spacing.md,
              fontSize: '15px'
            }}>
              @{user.username}
            </p>
          )}

          {user.wallet_address && (
            <p style={{
              color: '#71767B',
              marginBottom: spacing.md,
              fontSize: '13px',
              fontFamily: 'monospace',
              wordBreak: 'break-all',
              padding: `${spacing.xs} ${spacing.md}`,
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              display: 'inline-block'
            }}>
              {user.wallet_address}
            </p>
          )}

          {user.role && (
            <div style={{
              display: 'inline-block',
              marginBottom: spacing.lg
            }}>
              <Badge
                variant="primary"
                style={{
                  background: 'rgba(29, 155, 240, 0.15)',
                  color: '#1D9BF0',
                  border: '1px solid rgba(29, 155, 240, 0.3)',
                  padding: `${spacing.sm} ${spacing.md}`,
                  fontSize: '13px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                {user.role}
              </Badge>
            </div>
          )}

          {profile.bio && (
            <p style={{
              color: '#E7E9EA',
              marginTop: spacing.lg,
              marginBottom: spacing.lg,
              lineHeight: 1.6,
              fontSize: '15px',
              maxWidth: '400px',
              margin: `${spacing.lg} auto`
            }}>
              {profile.bio}
            </p>
          )}

          {/* Location & Website */}
          {(profile.location || profile.website) && (
            <div style={{
              display: 'flex',
              gap: spacing.lg,
              justifyContent: 'center',
              marginTop: spacing.lg,
              marginBottom: spacing.xl,
              color: '#71767B',
              flexWrap: 'wrap'
            }}>
              {profile.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                  <span style={{ fontSize: '16px' }}>📍</span>
                  <span style={{ fontSize: '14px' }}>{profile.location}</span>
                </div>
              )}
              {profile.website && (
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                  <span style={{ fontSize: '16px' }}>🔗</span>
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '14px',
                      color: '#1D9BF0',
                      textDecoration: 'none'
                    }}
                  >
                    {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Stats - Followers/Following */}
          <div style={{
            display: 'flex',
            gap: spacing.xl,
            justifyContent: 'center',
            marginTop: spacing.xl,
            paddingTop: spacing.lg,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#E7E9EA',
                marginBottom: spacing.xs
              }}>
                {profile.following_count || 0}
              </div>
              <div style={{
                fontSize: '13px',
                color: '#71767B',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Following
              </div>
            </div>
            <div style={{
              width: '1px',
              background: 'rgba(255, 255, 255, 0.1)'
            }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#E7E9EA',
                marginBottom: spacing.xs
              }}>
                {profile.followers_count || 0}
              </div>
              <div style={{
                fontSize: '13px',
                color: '#71767B',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Followers
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div style={{
          background: 'rgba(30, 30, 35, 0.8)',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          margin: spacing.lg,
          marginTop: spacing.xl,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${tabItems.length}, 1fr)`,
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {tabItems.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: spacing.lg,
                  background: 'transparent',
                  border: 'none',
                  fontWeight: 600,
                  color: activeTab === tab.id ? '#1D9BF0' : '#71767B',
                  borderBottom: activeTab === tab.id ? '2px solid #1D9BF0' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing.sm,
                  fontSize: '14px'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.color = '#8B98A5';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.color = '#71767B';
                  }
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
        </div>
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

      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />
    </div>
  );
}
