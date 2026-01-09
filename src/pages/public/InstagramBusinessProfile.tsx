import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { BusinessProfileHeader } from '../../components/business/BusinessProfileHeader';
import { BusinessProfileTabs, type TabType } from '../../components/business/BusinessProfileTabs';
import { BusinessPostGrid } from '../../components/business/BusinessPostGrid';
import { EnhancedPostCard } from '../../components/business/EnhancedPostCard';
import { ReviewCard } from '../../components/business/ReviewCard';
import { ReviewSubmissionForm } from '../../components/business/ReviewSubmissionForm';
import { ProductCard } from '../../components/molecules/ProductCard';
import { businessSocialService } from '../../services/businessSocial';
import { getPublicBusinessCatalog } from '../../services/business';
import type { BusinessProfile, BusinessReview, EnhancedBusinessPost, ReviewSummary } from '../../types/businessSocial';
import { logger } from '../../lib/logger';

export default function InstagramBusinessProfile() {
  const { businessId } = useParams<{ businessId: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [posts, setPosts] = useState<EnhancedBusinessPost[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [reviews, setReviews] = useState<BusinessReview[]>([]);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);
  const [selectedPost, setSelectedPost] = useState<EnhancedBusinessPost | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'feed'>('grid');

  useEffect(() => {
    if (businessId) {
      loadBusinessData();
    }
  }, [businessId]);

  const loadBusinessData = async () => {
    if (!businessId) return;

    try {
      setLoading(true);
      setError(null);

      const [profileData, postsData, productsData, reviewsData, summaryData] = await Promise.all([
        businessSocialService.getBusinessProfile(businessId),
        businessSocialService.getBusinessPosts(businessId, 50),
        getPublicBusinessCatalog(businessId),
        businessSocialService.getBusinessReviews({ business_id: businessId, limit: 20 }),
        businessSocialService.getReviewSummary(businessId)
      ]);

      setProfile(profileData);
      setPosts(postsData);
      setProducts(productsData);
      setReviews(reviewsData);
      setReviewSummary(summaryData);
    } catch (err) {
      logger.error('[InstagramBusinessProfile] Failed to load business data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load business');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#fafafa'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid #dbdbdb',
          borderTopColor: '#262626',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#fafafa',
        padding: '20px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '12px' }}>Business Not Found</h2>
          <p style={{ color: '#8e8e8e', marginBottom: '20px' }}>
            {error || 'The business you are looking for does not exist.'}
          </p>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: '10px 24px',
              background: '#0095f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const renderPostsTab = () => {
    if (viewMode === 'grid') {
      return <BusinessPostGrid posts={posts} onPostClick={setSelectedPost} />;
    }

    return (
      <div style={{
        maxWidth: '614px',
        margin: '24px auto',
        padding: '0 16px'
      }}>
        {posts.map(post => (
          <EnhancedPostCard
            key={post.id}
            post={post}
            onLike={() => loadBusinessData()}
            onComment={() => {}}
            onProductClick={(productId) => {
              setActiveTab('products');
              setTimeout(() => {
                document.getElementById(`product-${productId}`)?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
          />
        ))}
      </div>
    );
  };

  const renderProductsTab = () => {
    if (products.length === 0) {
      return (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#8e8e8e'
        }}>
          <h3 style={{ fontSize: '22px', fontWeight: '300', marginBottom: '8px' }}>
            No Products Yet
          </h3>
          <p style={{ fontSize: '14px' }}>
            This business hasn't added any products to their catalog yet.
          </p>
        </div>
      );
    }

    return (
      <div style={{
        maxWidth: '935px',
        margin: '24px auto',
        padding: '0 16px'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: '24px'
        }}>
          {products.map(product => (
            <div key={product.id} id={`product-${product.id}`}>
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderReviewsTab = () => {
    return (
      <div style={{
        maxWidth: '800px',
        margin: '24px auto',
        padding: '0 16px'
      }}>
        {reviewSummary && (
          <div style={{
            background: 'white',
            border: '1px solid #dbdbdb',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '32px',
              marginBottom: '24px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', fontWeight: '600', marginBottom: '4px' }}>
                  {reviewSummary.avg_rating.toFixed(1)}
                </div>
                <div style={{ color: '#ffc107', fontSize: '24px', marginBottom: '4px' }}>
                  {'★'.repeat(Math.round(reviewSummary.avg_rating))}
                  {'☆'.repeat(5 - Math.round(reviewSummary.avg_rating))}
                </div>
                <div style={{ color: '#8e8e8e', fontSize: '14px' }}>
                  {reviewSummary.total_reviews} {reviewSummary.total_reviews === 1 ? 'review' : 'reviews'}
                </div>
              </div>

              <div style={{ flex: 1 }}>
                {[5, 4, 3, 2, 1].map(star => {
                  const count = reviewSummary.rating_distribution[star as keyof typeof reviewSummary.rating_distribution] || 0;
                  const percentage = reviewSummary.total_reviews > 0
                    ? (count / reviewSummary.total_reviews) * 100
                    : 0;

                  return (
                    <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <span style={{ width: '60px', fontSize: '14px' }}>{star} stars</span>
                      <div style={{
                        flex: 1,
                        height: '8px',
                        background: '#efefef',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${percentage}%`,
                          height: '100%',
                          background: '#ffc107',
                          transition: 'width 0.3s'
                        }} />
                      </div>
                      <span style={{ width: '40px', fontSize: '13px', color: '#8e8e8e', textAlign: 'right' }}>
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {!showReviewForm && (
              <button
                onClick={() => setShowReviewForm(true)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#0095f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Write a Review
              </button>
            )}
          </div>
        )}

        {showReviewForm && (
          <div style={{ marginBottom: '24px' }}>
            <ReviewSubmissionForm
              businessId={businessId!}
              onSubmit={() => {
                setShowReviewForm(false);
                loadBusinessData();
              }}
              onCancel={() => setShowReviewForm(false)}
            />
          </div>
        )}

        <div style={{
          background: 'white',
          border: '1px solid #dbdbdb',
          borderRadius: '12px',
          padding: '24px'
        }}>
          {reviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8e8e8e' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '300', marginBottom: '8px' }}>
                No Reviews Yet
              </h3>
              <p style={{ fontSize: '14px' }}>
                Be the first to review this business!
              </p>
            </div>
          ) : (
            reviews.map(review => (
              <ReviewCard
                key={review.id}
                review={review}
                onRefresh={loadBusinessData}
              />
            ))
          )}
        </div>
      </div>
    );
  };

  const renderAboutTab = () => {
    return (
      <div style={{
        maxWidth: '800px',
        margin: '24px auto',
        padding: '0 16px'
      }}>
        <div style={{
          background: 'white',
          border: '1px solid #dbdbdb',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '16px' }}>
            About {profile.name}
          </h2>

          {profile.description && (
            <div style={{
              fontSize: '14px',
              lineHeight: '1.6',
              marginBottom: '24px',
              whiteSpace: 'pre-wrap'
            }}>
              {profile.description}
            </div>
          )}

          {profile.operating_hours && profile.operating_hours.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                Operating Hours
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {profile.operating_hours.map(hours => (
                  <div key={hours.day} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '14px'
                  }}>
                    <span style={{ fontWeight: '500' }}>{hours.day}</span>
                    <span style={{ color: '#8e8e8e' }}>
                      {hours.closed ? 'Closed' : `${hours.open} - ${hours.close}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {profile.location && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                Location
              </h3>
              <div style={{ fontSize: '14px', color: '#262626' }}>
                {profile.location.address && <div>{profile.location.address}</div>}
                {(profile.location.city || profile.location.state) && (
                  <div>
                    {profile.location.city}{profile.location.city && profile.location.state && ', '}
                    {profile.location.state}
                  </div>
                )}
                {profile.location.country && <div>{profile.location.country}</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ background: '#fafafa', minHeight: '100vh' }}>
      <BusinessProfileHeader
        profile={profile}
        onRefresh={loadBusinessData}
      />

      <BusinessProfileTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={{
          posts: profile.stats?.posts_count,
          products: profile.stats?.products_count,
          reviews: profile.stats?.reviews_count
        }}
      />

      <div style={{ paddingBottom: '40px' }}>
        {activeTab === 'posts' && (
          <div>
            <div style={{
              maxWidth: '935px',
              margin: '16px auto',
              padding: '0 16px',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px'
            }}>
              <button
                onClick={() => setViewMode('grid')}
                style={{
                  padding: '8px 16px',
                  background: viewMode === 'grid' ? '#262626' : 'white',
                  color: viewMode === 'grid' ? 'white' : '#262626',
                  border: '1px solid #dbdbdb',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('feed')}
                style={{
                  padding: '8px 16px',
                  background: viewMode === 'feed' ? '#262626' : 'white',
                  color: viewMode === 'feed' ? 'white' : '#262626',
                  border: '1px solid #dbdbdb',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Feed
              </button>
            </div>
            {renderPostsTab()}
          </div>
        )}
        {activeTab === 'products' && renderProductsTab()}
        {activeTab === 'reviews' && renderReviewsTab()}
        {activeTab === 'about' && renderAboutTab()}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
