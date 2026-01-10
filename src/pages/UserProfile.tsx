import React, { useEffect, useState } from 'react';
import { useAppServices } from '../context/AppServicesContext';
import { useAuth } from '../context/AuthContext';
import type { UserProfile, Post, User } from '../data/types';
import { undergroundTheme } from '../styles/undergroundTheme';
import { UndergroundCard } from '../components/underground/UndergroundCard';
import { UndergroundButton } from '../components/underground/UndergroundButton';
import { UndergroundBadge } from '../components/underground/UndergroundBadge';
import { UndergroundAvatar } from '../components/underground/UndergroundAvatar';
import { PostCard } from '../components/social/PostCard';
import { EditProfileModal } from '../components/organisms/EditProfileModal';
import { SettingsModal } from '../components/organisms/SettingsModal';
import { logger } from '../lib/logger';

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
        id: targetUserId,
        name: updatedProfile.name,
        username: updatedProfile.username,
        bio: updatedProfile.bio,
        location: updatedProfile.location,
        website: updatedProfile.website,
        photo_url: updatedProfile.photo_url,
        avatar_url: updatedProfile.photo_url,
      });

      await loadProfile();
      logger.info('[UserProfile] Profile updated successfully');
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
        background: undergroundTheme.colors.gradient.primary
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: undergroundTheme.spacing.md }}>⏳</div>
          <div style={{
            color: undergroundTheme.colors.text.secondary,
            fontSize: undergroundTheme.typography.fontSize.lg
          }}>
            Loading profile...
          </div>
        </div>
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
      background: undergroundTheme.colors.gradient.primary,
      paddingBottom: undergroundTheme.spacing['8xl']
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', position: 'relative' }}>
        {isOwnProfile && (
          <button
            onClick={() => setSettingsModalOpen(true)}
            style={{
              position: 'absolute',
              top: undergroundTheme.spacing.lg,
              right: undergroundTheme.spacing.lg,
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: undergroundTheme.colors.glassmorphism.medium,
              border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '20px',
              transition: undergroundTheme.transitions.fast,
              zIndex: 10
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = undergroundTheme.colors.glassmorphism.dark;
              e.currentTarget.style.borderColor = undergroundTheme.colors.accent.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = undergroundTheme.colors.glassmorphism.medium;
              e.currentTarget.style.borderColor = undergroundTheme.colors.glassmorphism.border;
            }}
          >
            ⚙️
          </button>
        )}

        <UndergroundCard style={{
          margin: undergroundTheme.spacing.lg,
          padding: `${undergroundTheme.spacing['3xl']} ${undergroundTheme.spacing.xl}`,
          textAlign: 'center'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: undergroundTheme.spacing.xl
          }}>
            <UndergroundAvatar
              src={user.photo_url}
              name={user.name || user.username || 'User'}
              size={140}
              online={isOwnProfile}
            />
          </div>

          {isOwnProfile && (
            <UndergroundButton
              variant="secondary"
              size="md"
              onClick={() => setEditModalOpen(true)}
              style={{ marginBottom: undergroundTheme.spacing.xl }}
            >
              Edit Profile
            </UndergroundButton>
          )}

          {!isOwnProfile && (
            <UndergroundButton
              variant={isFollowing ? 'secondary' : 'primary'}
              size="md"
              onClick={handleFollow}
              style={{ marginBottom: undergroundTheme.spacing.xl }}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </UndergroundButton>
          )}

          <h1 style={{
            color: undergroundTheme.colors.text.primary,
            marginBottom: undergroundTheme.spacing.xs,
            fontSize: 'clamp(24px, 5vw, 28px)',
            fontWeight: undergroundTheme.typography.fontWeight.bold,
            letterSpacing: '-0.5px'
          }}>
            {user.name || user.username || 'Unknown User'}
          </h1>

          {user.username && (
            <p style={{
              color: undergroundTheme.colors.text.tertiary,
              marginBottom: undergroundTheme.spacing.md,
              fontSize: undergroundTheme.typography.fontSize.md
            }}>
              @{user.username}
            </p>
          )}

          {user.wallet_address && (
            <p style={{
              color: undergroundTheme.colors.text.tertiary,
              marginBottom: undergroundTheme.spacing.md,
              fontSize: undergroundTheme.typography.fontSize.xs,
              fontFamily: 'monospace',
              wordBreak: 'break-all',
              padding: `${undergroundTheme.spacing.xs} ${undergroundTheme.spacing.md}`,
              background: undergroundTheme.colors.glassmorphism.light,
              borderRadius: undergroundTheme.borderRadius.md,
              display: 'inline-block'
            }}>
              {user.wallet_address}
            </p>
          )}

          {user.role && (
            <div style={{
              display: 'inline-block',
              marginBottom: undergroundTheme.spacing.lg
            }}>
              <UndergroundBadge variant="primary">
                {user.role}
              </UndergroundBadge>
            </div>
          )}

          {profile.bio && (
            <p style={{
              color: undergroundTheme.colors.text.primary,
              marginTop: undergroundTheme.spacing.lg,
              marginBottom: undergroundTheme.spacing.lg,
              lineHeight: 1.6,
              fontSize: undergroundTheme.typography.fontSize.md,
              maxWidth: '400px',
              margin: `${undergroundTheme.spacing.lg} auto`
            }}>
              {profile.bio}
            </p>
          )}

          {(profile.location || profile.website) && (
            <div style={{
              display: 'flex',
              gap: undergroundTheme.spacing.lg,
              justifyContent: 'center',
              marginTop: undergroundTheme.spacing.lg,
              marginBottom: undergroundTheme.spacing.xl,
              color: undergroundTheme.colors.text.tertiary,
              flexWrap: 'wrap'
            }}>
              {profile.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: undergroundTheme.spacing.xs }}>
                  <span style={{ fontSize: '16px' }}>📍</span>
                  <span style={{ fontSize: undergroundTheme.typography.fontSize.sm }}>{profile.location}</span>
                </div>
              )}
              {profile.website && (
                <div style={{ display: 'flex', alignItems: 'center', gap: undergroundTheme.spacing.xs }}>
                  <span style={{ fontSize: '16px' }}>🔗</span>
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      color: undergroundTheme.colors.accent.primary,
                      textDecoration: 'none'
                    }}
                  >
                    {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
            </div>
          )}

          <div style={{
            display: 'flex',
            gap: undergroundTheme.spacing.xl,
            justifyContent: 'center',
            marginTop: undergroundTheme.spacing.xl,
            paddingTop: undergroundTheme.spacing.lg,
            borderTop: `1px solid ${undergroundTheme.colors.glassmorphism.border}`
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: undergroundTheme.typography.fontSize.xl,
                fontWeight: undergroundTheme.typography.fontWeight.bold,
                color: undergroundTheme.colors.accent.primary,
                marginBottom: undergroundTheme.spacing.xs
              }}>
                {profile.following_count || 0}
              </div>
              <div style={{
                fontSize: undergroundTheme.typography.fontSize.xs,
                color: undergroundTheme.colors.text.tertiary,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Following
              </div>
            </div>
            <div style={{
              width: '1px',
              background: undergroundTheme.colors.glassmorphism.border
            }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: undergroundTheme.typography.fontSize.xl,
                fontWeight: undergroundTheme.typography.fontWeight.bold,
                color: undergroundTheme.colors.accent.primary,
                marginBottom: undergroundTheme.spacing.xs
              }}>
                {profile.followers_count || 0}
              </div>
              <div style={{
                fontSize: undergroundTheme.typography.fontSize.xs,
                color: undergroundTheme.colors.text.tertiary,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Followers
              </div>
            </div>
          </div>
        </UndergroundCard>

        <UndergroundCard style={{
          margin: undergroundTheme.spacing.lg,
          marginTop: undergroundTheme.spacing.xl,
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${tabItems.length}, 1fr)`,
            borderBottom: `1px solid ${undergroundTheme.colors.glassmorphism.border}`
          }}>
            {tabItems.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: undergroundTheme.spacing.lg,
                  background: 'transparent',
                  border: 'none',
                  fontWeight: undergroundTheme.typography.fontWeight.semibold,
                  color: activeTab === tab.id ? undergroundTheme.colors.accent.primary : undergroundTheme.colors.text.tertiary,
                  borderBottom: activeTab === tab.id ? `2px solid ${undergroundTheme.colors.accent.primary}` : '2px solid transparent',
                  cursor: 'pointer',
                  transition: undergroundTheme.transitions.fast,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: undergroundTheme.spacing.sm,
                  fontSize: undergroundTheme.typography.fontSize.sm
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.color = undergroundTheme.colors.text.secondary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.color = undergroundTheme.colors.text.tertiary;
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
              <div style={{ padding: undergroundTheme.spacing['4xl'], textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: undergroundTheme.spacing.md }}>⏳</div>
                <div style={{ color: undergroundTheme.colors.text.secondary }}>Loading posts...</div>
              </div>
            ) : posts.length === 0 ? (
              <div style={{ padding: undergroundTheme.spacing['4xl'], textAlign: 'center' }}>
                <div style={{ fontSize: '64px', marginBottom: undergroundTheme.spacing.md }}>📝</div>
                <div style={{
                  color: undergroundTheme.colors.text.primary,
                  fontSize: undergroundTheme.typography.fontSize.lg,
                  fontWeight: undergroundTheme.typography.fontWeight.semibold,
                  marginBottom: undergroundTheme.spacing.sm
                }}>
                  No posts yet
                </div>
                <div style={{ color: undergroundTheme.colors.text.tertiary }}>
                  {isOwnProfile ? "You haven't posted anything yet" : "This user hasn't posted anything yet"}
                </div>
              </div>
            ) : (
              <div>
                {posts.map((post, index) => (
                  <div key={post.id}>
                    <div style={{ padding: undergroundTheme.spacing.lg }}>
                      <PostCard
                        post={post}
                        onLike={(isLiked) => handleLike(post.id, isLiked)}
                        onRepost={(comment) => handleRepost(post.id, comment)}
                        onDelete={() => handleDelete(post.id)}
                      />
                    </div>
                    {index < posts.length - 1 && (
                      <div style={{
                        height: '1px',
                        background: undergroundTheme.colors.glassmorphism.border
                      }} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </UndergroundCard>
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
