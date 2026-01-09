import React, { useState, useEffect } from 'react';
import { Settings, Grid, Bookmark, Users, MoreVertical, Link as LinkIcon } from 'lucide-react';
import { StoriesRing } from '../stories/StoriesRing';
import { storiesService, StoryHighlight } from '../../services/stories';
import { useAuth } from '../../context/AuthContext';

interface ProfileStats {
  posts: number;
  followers: number;
  following: number;
}

interface EnhancedProfileHeaderProps {
  userId: string;
  username: string;
  fullName: string;
  bio?: string;
  avatarUrl?: string;
  websiteUrl?: string;
  stats: ProfileStats;
  isOwnProfile: boolean;
  isFollowing?: boolean;
  onFollowToggle?: () => void;
  onMessageClick?: () => void;
  onStoriesClick?: () => void;
  onEditProfile?: () => void;
}

export function EnhancedProfileHeader({
  userId,
  username,
  fullName,
  bio,
  avatarUrl,
  websiteUrl,
  stats,
  isOwnProfile,
  isFollowing = false,
  onFollowToggle,
  onMessageClick,
  onStoriesClick,
  onEditProfile,
}: EnhancedProfileHeaderProps) {
  const [highlights, setHighlights] = useState<StoryHighlight[]>([]);
  const [hasActiveStories, setHasActiveStories] = useState(false);

  useEffect(() => {
    loadHighlights();
    checkActiveStories();
  }, [userId]);

  const loadHighlights = async () => {
    const userHighlights = await storiesService.getUserHighlights(userId);
    setHighlights(userHighlights);
  };

  const checkActiveStories = async () => {
    const stories = await storiesService.getUserStories(userId);
    setHasActiveStories(stories.length > 0);
  };

  return (
    <div
      style={{
        maxWidth: '935px',
        margin: '0 auto',
        padding: '30px 20px',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '80px',
          marginBottom: '44px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <StoriesRing
            hasActiveStories={hasActiveStories}
            hasUnviewedStories={hasActiveStories && !isOwnProfile}
            imageUrl={avatarUrl}
            username={username}
            size="large"
            isOwnProfile={isOwnProfile}
            onClick={hasActiveStories ? onStoriesClick : undefined}
          />
        </div>

        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              marginBottom: '20px',
            }}
          >
            <h2
              style={{
                fontSize: '28px',
                fontWeight: '300',
                margin: 0,
                color: '#262626',
              }}
            >
              {username}
            </h2>

            {isOwnProfile ? (
              <>
                <button
                  onClick={onEditProfile}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'transparent',
                    border: '1px solid #dbdbdb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    color: '#262626',
                  }}
                >
                  Edit profile
                </button>
                <button
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Settings size={24} color="#262626" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onFollowToggle}
                  style={{
                    padding: '8px 24px',
                    backgroundColor: isFollowing ? 'transparent' : '#0095f6',
                    border: isFollowing ? '1px solid #dbdbdb' : 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    color: isFollowing ? '#262626' : 'white',
                  }}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
                <button
                  onClick={onMessageClick}
                  style={{
                    padding: '8px 24px',
                    backgroundColor: 'transparent',
                    border: '1px solid #dbdbdb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    color: '#262626',
                  }}
                >
                  Message
                </button>
                <button
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <MoreVertical size={24} color="#262626" />
                </button>
              </>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              gap: '40px',
              marginBottom: '20px',
            }}
          >
            <div>
              <span style={{ fontWeight: '600', color: '#262626' }}>
                {stats.posts.toLocaleString()}
              </span>{' '}
              <span style={{ color: '#262626' }}>posts</span>
            </div>
            <div style={{ cursor: 'pointer' }}>
              <span style={{ fontWeight: '600', color: '#262626' }}>
                {stats.followers.toLocaleString()}
              </span>{' '}
              <span style={{ color: '#262626' }}>followers</span>
            </div>
            <div style={{ cursor: 'pointer' }}>
              <span style={{ fontWeight: '600', color: '#262626' }}>
                {stats.following.toLocaleString()}
              </span>{' '}
              <span style={{ color: '#262626' }}>following</span>
            </div>
          </div>

          <div>
            <div
              style={{
                fontWeight: '600',
                color: '#262626',
                marginBottom: '4px',
              }}
            >
              {fullName}
            </div>
            {bio && (
              <div
                style={{
                  color: '#262626',
                  whiteSpace: 'pre-wrap',
                  marginBottom: '4px',
                }}
              >
                {bio}
              </div>
            )}
            {websiteUrl && (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#00376b',
                  textDecoration: 'none',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <LinkIcon size={14} />
                {new URL(websiteUrl).hostname}
              </a>
            )}
          </div>
        </div>
      </div>

      {highlights.length > 0 && (
        <div
          style={{
            borderTop: '1px solid #dbdbdb',
            borderBottom: '1px solid #dbdbdb',
            padding: '16px 0',
            marginBottom: '44px',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '40px',
              overflowX: 'auto',
              padding: '0 20px',
            }}
          >
            {highlights.map((highlight) => (
              <div
                key={highlight.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  minWidth: '80px',
                }}
              >
                <div
                  style={{
                    width: '77px',
                    height: '77px',
                    borderRadius: '50%',
                    border: '1px solid #dbdbdb',
                    padding: '3px',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={highlight.cover_image || '/placeholder-story.png'}
                    alt={highlight.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      objectFit: 'cover',
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: '12px',
                    color: '#262626',
                    maxWidth: '80px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                  }}
                >
                  {highlight.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
