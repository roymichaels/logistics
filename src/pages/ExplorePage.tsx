import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, Sparkles, ShoppingBag, Users } from 'lucide-react';
import { feedAlgorithmService, TrendingTopic } from '../services/feedAlgorithm';
import { shoppableContentService } from '../services/shoppableContent';
import { LoadingState } from '../components/molecules/LoadingState';
import { useNavigate } from 'react-router-dom';
import { logger } from '../lib/logger';

type ExploreTab = 'for-you' | 'trending' | 'shopping' | 'people';

export function ExplorePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ExploreTab>('for-you');
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [exploreContent, setExploreContent] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadExploreContent();
  }, [activeTab]);

  const loadExploreContent = async () => {
    try {
      setLoading(true);

      const [topics, content, recs] = await Promise.all([
        feedAlgorithmService.getTrendingTopics(10),
        feedAlgorithmService.exploreContent(undefined, 20),
        feedAlgorithmService.getUserRecommendations(undefined, 10),
      ]);

      setTrendingTopics(topics);
      setExploreContent(content);
      setRecommendations(recs);
    } catch (error) {
      logger.error('Failed to load explore content', { error });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '20px',
      }}
    >
      <div
        style={{
          position: 'sticky',
          top: 0,
          backgroundColor: 'white',
          zIndex: 100,
          paddingBottom: '20px',
          borderBottom: '1px solid #dbdbdb',
          marginBottom: '20px',
        }}
      >
        <form
          onSubmit={handleSearch}
          style={{
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              backgroundColor: '#efefef',
              borderRadius: '8px',
            }}
          >
            <Search size={20} color="#8e8e8e" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                backgroundColor: 'transparent',
                outline: 'none',
                fontSize: '14px',
                color: '#262626',
              }}
            />
          </div>
        </form>

        <div
          style={{
            display: 'flex',
            gap: '8px',
          }}
        >
          <button
            onClick={() => setActiveTab('for-you')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === 'for-you' ? '#262626' : 'transparent',
              color: activeTab === 'for-you' ? 'white' : '#8e8e8e',
              border: '1px solid #dbdbdb',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Sparkles size={16} />
            For You
          </button>
          <button
            onClick={() => setActiveTab('trending')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === 'trending' ? '#262626' : 'transparent',
              color: activeTab === 'trending' ? 'white' : '#8e8e8e',
              border: '1px solid #dbdbdb',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <TrendingUp size={16} />
            Trending
          </button>
          <button
            onClick={() => setActiveTab('shopping')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === 'shopping' ? '#262626' : 'transparent',
              color: activeTab === 'shopping' ? 'white' : '#8e8e8e',
              border: '1px solid #dbdbdb',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ShoppingBag size={16} />
            Shopping
          </button>
          <button
            onClick={() => setActiveTab('people')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === 'people' ? '#262626' : 'transparent',
              color: activeTab === 'people' ? 'white' : '#8e8e8e',
              border: '1px solid #dbdbdb',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Users size={16} />
            People
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : (
        <div
          style={{
            display: 'flex',
            gap: '30px',
          }}
        >
          <div
            style={{
              flex: 1,
            }}
          >
            {activeTab === 'trending' && (
              <div>
                <h2
                  style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    marginBottom: '20px',
                    color: '#262626',
                  }}
                >
                  Trending Now
                </h2>
                {trendingTopics.length > 0 ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                      gap: '16px',
                    }}
                  >
                    {trendingTopics.map((topic, index) => (
                      <div
                        key={topic.id}
                        style={{
                          padding: '16px',
                          border: '1px solid #dbdbdb',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#fafafa';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'white';
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '8px',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '12px',
                              color: '#8e8e8e',
                              fontWeight: '600',
                            }}
                          >
                            #{index + 1} Trending
                          </span>
                          <TrendingUp size={14} color="#ff3b5c" />
                        </div>
                        <div
                          style={{
                            fontSize: '18px',
                            fontWeight: '700',
                            marginBottom: '4px',
                            color: '#262626',
                          }}
                        >
                          {topic.topic_type === 'hashtag' ? '#' : ''}
                          {topic.topic_value}
                        </div>
                        <div
                          style={{
                            fontSize: '14px',
                            color: '#8e8e8e',
                          }}
                        >
                          {topic.mention_count.toLocaleString()} posts •{' '}
                          {topic.engagement_count.toLocaleString()} engagements
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '40px',
                      textAlign: 'center',
                      color: '#8e8e8e',
                    }}
                  >
                    No trending topics available
                  </div>
                )}
              </div>
            )}

            {activeTab === 'for-you' && (
              <div>
                <h2
                  style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    marginBottom: '20px',
                    color: '#262626',
                  }}
                >
                  Recommended For You
                </h2>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '4px',
                  }}
                >
                  {exploreContent.map((post) => (
                    <div
                      key={post.id}
                      style={{
                        aspectRatio: '1',
                        backgroundColor: '#efefef',
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                      onClick={() => navigate(`/posts/${post.id}`)}
                    >
                      {post.media_urls?.[0] && (
                        <img
                          src={post.media_urls[0]}
                          alt="Post"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      )}
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(0, 0, 0, 0)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0,
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)';
                          e.currentTarget.style.opacity = '1';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '0';
                        }}
                      >
                        <div
                          style={{
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '20px',
                          }}
                        >
                          <span>❤️ {post.likes_count?.toLocaleString() || 0}</span>
                          <span>💬 {post.comments_count?.toLocaleString() || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'shopping' && (
              <div>
                <h2
                  style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    marginBottom: '20px',
                    color: '#262626',
                  }}
                >
                  Shop the Feed
                </h2>
                <div
                  style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: '#8e8e8e',
                  }}
                >
                  <ShoppingBag size={48} style={{ marginBottom: '16px' }} />
                  <p>Shopping content will appear here</p>
                </div>
              </div>
            )}

            {activeTab === 'people' && (
              <div>
                <h2
                  style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    marginBottom: '20px',
                    color: '#262626',
                  }}
                >
                  Suggested For You
                </h2>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                  {recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '16px',
                        border: '1px solid #dbdbdb',
                        borderRadius: '12px',
                      }}
                    >
                      <div
                        style={{
                          width: '60px',
                          height: '60px',
                          borderRadius: '50%',
                          backgroundColor: '#efefef',
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: '600',
                            marginBottom: '4px',
                            color: '#262626',
                          }}
                        >
                          Recommended {rec.recommendation_type}
                        </div>
                        <div
                          style={{
                            fontSize: '14px',
                            color: '#8e8e8e',
                          }}
                        >
                          {rec.recommendation_reason}
                        </div>
                      </div>
                      <button
                        style={{
                          padding: '8px 24px',
                          backgroundColor: '#0095f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        Follow
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              width: '320px',
              position: 'sticky',
              top: '120px',
              alignSelf: 'flex-start',
            }}
          >
            <div
              style={{
                padding: '20px',
                backgroundColor: '#fafafa',
                borderRadius: '12px',
                marginBottom: '20px',
              }}
            >
              <h3
                style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  marginBottom: '16px',
                  color: '#262626',
                }}
              >
                Trending Topics
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {trendingTopics.slice(0, 5).map((topic) => (
                  <div
                    key={topic.id}
                    style={{
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: '8px',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#262626',
                        marginBottom: '2px',
                      }}
                    >
                      {topic.topic_type === 'hashtag' ? '#' : ''}
                      {topic.topic_value}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#8e8e8e',
                      }}
                    >
                      {topic.mention_count.toLocaleString()} posts
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
