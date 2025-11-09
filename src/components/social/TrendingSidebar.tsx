import React, { useEffect, useState } from 'react';
import { useAppServices } from '../../context/AppServicesContext';
import { i18n } from '../../lib/i18n';
import type { TrendingTopic, User } from '../../data/types';
import { logger } from '../../lib/logger';
import { TWITTER_COLORS } from '../../styles/twitterTheme';

export function TrendingSidebar() {
  const { dataStore } = useAppServices();
  const [trending, setTrending] = useState<TrendingTopic[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSidebarData();
  }, []);

  const loadSidebarData = async () => {
    try {
      setLoading(true);
      const [trendingData, usersData] = await Promise.all([
        dataStore.getTrendingTopics?.(10) || Promise.resolve([]),
        dataStore.searchUsers?.('', 5) || Promise.resolve([])
      ]);
      setTrending(trendingData);
      setSuggestedUsers(usersData);
    } catch (error) {
      logger.error('Failed to load sidebar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (userId: string) => {
    try {
      await dataStore.followUser?.(userId);
      setSuggestedUsers(prev => prev.filter(u => u.id !== userId));
    } catch (error) {
      logger.error('Failed to follow user:', error);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{
        background: TWITTER_COLORS.backgroundSecondary,
        borderRadius: '16px',
        overflow: 'hidden',
        border: `1px solid ${TWITTER_COLORS.border}`
      }}>
        <div style={{ padding: '12px 16px' }}>
          <input
            type="text"
            placeholder={i18n.getTranslations().social.searchPlaceholder}
            aria-label={i18n.getTranslations().social.search}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: TWITTER_COLORS.background,
              border: `1px solid ${TWITTER_COLORS.border}`,
              borderRadius: '9999px',
              color: TWITTER_COLORS.text,
              fontSize: '15px',
              outline: 'none',
              transition: 'all 200ms ease-in-out'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = TWITTER_COLORS.primary;
              e.currentTarget.style.background = TWITTER_COLORS.background;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = TWITTER_COLORS.border;
              e.currentTarget.style.background = TWITTER_COLORS.background;
            }}
          />
        </div>
      </div>

      <div style={{
        background: TWITTER_COLORS.backgroundSecondary,
        borderRadius: '16px',
        overflow: 'hidden',
        border: `1px solid ${TWITTER_COLORS.border}`
      }}>
        <div style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${TWITTER_COLORS.border}`
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '800',
            color: TWITTER_COLORS.text,
            margin: 0
          }}>{i18n.getTranslations().social.trending}</h2>
        </div>

        {loading ? (
          <div style={{
            padding: '16px',
            textAlign: 'center',
            color: TWITTER_COLORS.textSecondary
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              border: `3px solid ${TWITTER_COLORS.border}`,
              borderTopColor: TWITTER_COLORS.primary,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }} />
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : trending.length === 0 ? (
          <div style={{
            padding: '16px',
            textAlign: 'center',
            color: TWITTER_COLORS.textSecondary,
            fontSize: '14px'
          }}>
            {i18n.getTranslations().social.noTrendingYet}
          </div>
        ) : (
          <div>
            {trending.map((topic, index) => (
              <div
                key={topic.id}
                style={{
                  padding: '12px 16px',
                  borderBottom: index < trending.length - 1 ? `1px solid ${TWITTER_COLORS.border}` : 'none',
                  cursor: 'pointer',
                  transition: 'background-color 200ms ease-in-out'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = TWITTER_COLORS.backgroundHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{
                      fontSize: '13px',
                      color: TWITTER_COLORS.textSecondary,
                      margin: '0 0 2px 0'
                    }}>
                      {index + 1} · {i18n.getTranslations().social.trending}
                    </p>
                    <p style={{
                      fontWeight: '700',
                      color: TWITTER_COLORS.text,
                      fontSize: '15px',
                      margin: '0 0 2px 0'
                    }}>
                      #{topic.hashtag?.tag}
                    </p>
                    <p style={{
                      fontSize: '13px',
                      color: TWITTER_COLORS.textSecondary,
                      margin: 0
                    }}>
                      {topic.posts_count} {topic.posts_count === 1 ? i18n.getTranslations().social.post : i18n.getTranslations().social.posts}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{
          padding: '16px',
          borderTop: `1px solid ${TWITTER_COLORS.border}`
        }}>
          <button
            style={{
              background: 'transparent',
              border: 'none',
              color: TWITTER_COLORS.primary,
              fontSize: '15px',
              cursor: 'pointer',
              padding: 0,
              fontWeight: '400'
            }}
            aria-label={i18n.getTranslations().social.showMore}
            onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
            onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
          >
            {i18n.getTranslations().social.showMore}
          </button>
        </div>
      </div>

      {suggestedUsers.length > 0 && (
        <div style={{
          background: TWITTER_COLORS.backgroundSecondary,
          borderRadius: '16px',
          overflow: 'hidden',
          border: `1px solid ${TWITTER_COLORS.border}`
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: `1px solid ${TWITTER_COLORS.border}`
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '800',
              color: TWITTER_COLORS.text,
              margin: 0
            }}>{i18n.getTranslations().social.whoToFollow}</h2>
          </div>

          <div>
            {suggestedUsers.map((user, index) => (
              <div
                key={user.id}
                style={{
                  padding: '12px 16px',
                  borderBottom: index < suggestedUsers.length - 1 ? `1px solid ${TWITTER_COLORS.border}` : 'none',
                  transition: 'background-color 200ms ease-in-out'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = TWITTER_COLORS.backgroundHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                  <div style={{ flexShrink: 0 }}>
                    {user.photo_url ? (
                      <img
                        src={user.photo_url}
                        alt={user.name || 'User'}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: TWITTER_COLORS.primary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: TWITTER_COLORS.white,
                        fontSize: '15px',
                        fontWeight: '700'
                      }}>
                        {(user.name?.[0] || user.username?.[0] || 'U').toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontWeight: '700',
                      color: TWITTER_COLORS.text,
                      fontSize: '15px',
                      margin: '0 0 2px 0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
                    >
                      {user.name || user.username || 'Unknown'}
                    </p>
                    {user.username && (
                      <p style={{
                        color: TWITTER_COLORS.textSecondary,
                        fontSize: '15px',
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>@{user.username}</p>
                    )}
                  </div>

                  <button
                    onClick={() => handleFollow(user.id)}
                    style={{
                      padding: '6px 16px',
                      background: TWITTER_COLORS.white,
                      color: TWITTER_COLORS.textInverse,
                      borderRadius: '9999px',
                      fontSize: '14px',
                      fontWeight: '700',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 200ms ease-in-out',
                      flexShrink: 0
                    }}
                    aria-label={`${i18n.getTranslations().social.follow} ${user.name || user.username}`}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#e7e7e8'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = TWITTER_COLORS.white; }}
                  >
                    {i18n.getTranslations().social.follow}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{
            padding: '16px',
            borderTop: `1px solid ${TWITTER_COLORS.border}`
          }}>
            <button
              style={{
                background: 'transparent',
                border: 'none',
                color: TWITTER_COLORS.primary,
                fontSize: '15px',
                cursor: 'pointer',
                padding: 0,
                fontWeight: '400'
              }}
              aria-label={i18n.getTranslations().social.showMore}
              onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
              onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
            >
              {i18n.getTranslations().social.showMore}
            </button>
          </div>
        </div>
      )}

      <div style={{
        fontSize: '13px',
        color: TWITTER_COLORS.textSecondary,
        padding: '0 16px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <a href="#" style={{ color: TWITTER_COLORS.textSecondary, textDecoration: 'none' }}
           onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
           onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}>
          Terms of Service
        </a>
        <a href="#" style={{ color: TWITTER_COLORS.textSecondary, textDecoration: 'none' }}
           onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
           onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}>
          Privacy Policy
        </a>
        <a href="#" style={{ color: TWITTER_COLORS.textSecondary, textDecoration: 'none' }}
           onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
           onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}>
          Cookie Policy
        </a>
        <a href="#" style={{ color: TWITTER_COLORS.textSecondary, textDecoration: 'none' }}
           onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
           onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}>
          Accessibility
        </a>
        <a href="#" style={{ color: TWITTER_COLORS.textSecondary, textDecoration: 'none' }}
           onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
           onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}>
          Ads info
        </a>
        <p style={{ margin: '8px 0 0 0', width: '100%' }}>© 2025 Social Platform</p>
      </div>
    </div>
  );
}
