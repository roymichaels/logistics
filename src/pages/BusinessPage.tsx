import React, { useState, useEffect } from 'react';
import { DataStore } from '../data/types';
import { logger } from '../lib/logger';
import { telegram } from '../lib/telegram';

interface BusinessPageProps {
  dataStore: DataStore;
  businessId?: string;
  slug?: string;
  onNavigate: (page: string, params?: any) => void;
}

interface BusinessPageData {
  page: any;
  sections: any[];
  gallery: any[];
  operating_hours: any[];
  amenities: any[];
  special_hours: any[];
  is_open_now: boolean;
}

export function BusinessPage({ dataStore, businessId, slug, onNavigate }: BusinessPageProps) {
  const [pageData, setPageData] = useState<BusinessPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'about' | 'gallery' | 'hours' | 'contact'>('about');

  useEffect(() => {
    loadBusinessPage();
  }, [businessId, slug]);

  const loadBusinessPage = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!dataStore.supabase) {
        throw new Error('Supabase client not initialized');
      }

      const params = new URLSearchParams();
      if (slug) params.append('slug', slug);
      if (businessId) params.append('business_id', businessId);

      const { data: session } = await dataStore.supabase.auth.getSession();
      const headers: any = {
        'Content-Type': 'application/json'
      };

      if (session?.session?.access_token) {
        headers['Authorization'] = `Bearer ${session.session.access_token}`;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/business-page-get?${params}`,
        { headers }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load business page');
      }

      const data = await response.json();
      setPageData(data);
    } catch (err) {
      logger.error('Failed to load business page:', err);
      setError(err instanceof Error ? err.message : 'Failed to load business page');
    } finally {
      setLoading(false);
    }
  };

  const handleContactClick = () => {
    if (pageData?.page.whatsapp_number) {
      telegram.openLink(`https://wa.me/${pageData.page.whatsapp_number}`);
    } else if (pageData?.page.display_phone) {
      telegram.openLink(`tel:${pageData.page.display_phone}`);
    }
  };

  const handleDirectionsClick = () => {
    if (pageData?.page.latitude && pageData?.page.longitude) {
      const url = `https://maps.google.com/?q=${pageData.page.latitude},${pageData.page.longitude}`;
      telegram.openLink(url);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Loading business page...</p>
        </div>
      </div>
    );
  }

  if (error || !pageData) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <h3 style={styles.errorTitle}>Unable to Load Page</h3>
          <p style={styles.errorText}>{error || 'Business page not found'}</p>
          <button style={styles.backButton} onClick={() => onNavigate('businesses')}>
            Back to Businesses
          </button>
        </div>
      </div>
    );
  }

  const { page, sections, gallery, operating_hours, amenities, is_open_now } = pageData;

  return (
    <div style={styles.container}>
      {page.cover_image_url && (
        <div style={styles.coverImage}>
          <img src={page.cover_image_url} alt={page.page_title} style={styles.coverImg} />
        </div>
      )}

      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>{page.page_title}</h1>
          {page.tagline && <p style={styles.tagline}>{page.tagline}</p>}
          <div style={styles.statusRow}>
            <span style={{...styles.statusBadge, ...(is_open_now ? styles.openBadge : styles.closedBadge)}}>
              {is_open_now ? '● Open Now' : '● Closed'}
            </span>
            {page.view_count > 0 && (
              <span style={styles.viewCount}>{page.view_count.toLocaleString()} views</span>
            )}
          </div>
        </div>
      </div>

      <div style={styles.tabs}>
        <button
          style={{...styles.tab, ...(activeTab === 'about' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('about')}
        >
          About
        </button>
        {gallery.length > 0 && (
          <button
            style={{...styles.tab, ...(activeTab === 'gallery' ? styles.activeTab : {})}}
            onClick={() => setActiveTab('gallery')}
          >
            Gallery
          </button>
        )}
        <button
          style={{...styles.tab, ...(activeTab === 'hours' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('hours')}
        >
          Hours
        </button>
        <button
          style={{...styles.tab, ...(activeTab === 'contact' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('contact')}
        >
          Contact
        </button>
      </div>

      <div style={styles.content}>
        {activeTab === 'about' && (
          <div style={styles.aboutSection}>
            {page.about_business && (
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>About</h2>
                <p style={styles.text}>{page.about_business}</p>
              </div>
            )}

            {page.story && (
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Our Story</h2>
                <p style={styles.text}>{page.story}</p>
              </div>
            )}

            {sections.map((section) => (
              <div key={section.id} style={styles.section}>
                <h2 style={styles.sectionTitle}>{section.section_title}</h2>
                {section.section_subtitle && (
                  <p style={styles.subtitle}>{section.section_subtitle}</p>
                )}
                {section.content && <p style={styles.text}>{section.content}</p>}
                {section.image_url && (
                  <img src={section.image_url} alt={section.section_title} style={styles.sectionImage} />
                )}
              </div>
            ))}

            {amenities.length > 0 && (
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Amenities & Features</h2>
                <div style={styles.amenitiesGrid}>
                  {amenities.map((amenity: any) => (
                    <div key={amenity.id} style={styles.amenityCard}>
                      {amenity.icon && <span style={styles.amenityIcon}>{amenity.icon}</span>}
                      <span style={styles.amenityName}>{amenity.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'gallery' && gallery.length > 0 && (
          <div style={styles.galleryGrid}>
            {gallery.map((item: any) => (
              <div key={item.id} style={styles.galleryItem}>
                <img src={item.image_url} alt={item.title || ''} style={styles.galleryImage} />
                {item.title && <p style={styles.galleryTitle}>{item.title}</p>}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'hours' && (
          <div style={styles.hoursSection}>
            <h2 style={styles.sectionTitle}>Operating Hours</h2>
            <div style={styles.hoursTable}>
              {operating_hours.map((hour: any) => (
                <div key={hour.day_of_week} style={styles.hourRow}>
                  <span style={styles.dayName}>
                    {hour.day_of_week.charAt(0).toUpperCase() + hour.day_of_week.slice(1)}
                  </span>
                  <span style={styles.hourTime}>
                    {hour.is_open ? (
                      <>
                        {hour.open_time1} - {hour.close_time1}
                        {hour.open_time2 && `, ${hour.open_time2} - ${hour.close_time2}`}
                      </>
                    ) : (
                      'Closed'
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'contact' && (
          <div style={styles.contactSection}>
            <h2 style={styles.sectionTitle}>Contact Information</h2>

            {page.display_phone && (
              <div style={styles.contactItem}>
                <span style={styles.contactLabel}>📞 Phone:</span>
                <a href={`tel:${page.display_phone}`} style={styles.contactLink}>
                  {page.display_phone}
                </a>
              </div>
            )}

            {page.display_email && (
              <div style={styles.contactItem}>
                <span style={styles.contactLabel}>✉️ Email:</span>
                <a href={`mailto:${page.display_email}`} style={styles.contactLink}>
                  {page.display_email}
                </a>
              </div>
            )}

            {page.website_url && (
              <div style={styles.contactItem}>
                <span style={styles.contactLabel}>🌐 Website:</span>
                <a href={page.website_url} target="_blank" rel="noopener noreferrer" style={styles.contactLink}>
                  {page.website_url}
                </a>
              </div>
            )}

            {(page.address_line1 || page.city) && (
              <div style={styles.contactItem}>
                <span style={styles.contactLabel}>📍 Address:</span>
                <div style={styles.addressText}>
                  {page.address_line1}
                  {page.address_line2 && <><br />{page.address_line2}</>}
                  {page.city && <><br />{page.city}{page.postal_code && `, ${page.postal_code}`}</>}
                  {page.country && <><br />{page.country}</>}
                </div>
              </div>
            )}

            <div style={styles.actionButtons}>
              {page.whatsapp_number && (
                <button style={{...styles.actionButton, ...styles.whatsappButton}} onClick={handleContactClick}>
                  💬 WhatsApp
                </button>
              )}
              {page.latitude && page.longitude && (
                <button style={{...styles.actionButton, ...styles.directionsButton}} onClick={handleDirectionsClick}>
                  🗺️ Directions
                </button>
              )}
            </div>

            {(page.facebook_url || page.instagram_url || page.twitter_url) && (
              <div style={styles.socialSection}>
                <h3 style={styles.socialTitle}>Follow Us</h3>
                <div style={styles.socialLinks}>
                  {page.facebook_url && (
                    <a href={page.facebook_url} target="_blank" rel="noopener noreferrer" style={styles.socialLink}>
                      Facebook
                    </a>
                  )}
                  {page.instagram_url && (
                    <a href={page.instagram_url} target="_blank" rel="noopener noreferrer" style={styles.socialLink}>
                      Instagram
                    </a>
                  )}
                  {page.twitter_url && (
                    <a href={page.twitter_url} target="_blank" rel="noopener noreferrer" style={styles.socialLink}>
                      Twitter
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5'
  },
  coverImage: {
    width: '100%',
    height: 200,
    overflow: 'hidden'
  },
  coverImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  header: {
    padding: '20px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #e0e0e0'
  },
  headerContent: {
    maxWidth: 1200,
    margin: '0 auto'
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333'
  },
  tagline: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12
  },
  statusRow: {
    display: 'flex',
    gap: 16,
    alignItems: 'center'
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: '500'
  },
  openBadge: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32'
  },
  closedBadge: {
    backgroundColor: '#ffebee',
    color: '#c62828'
  },
  viewCount: {
    fontSize: 14,
    color: '#999'
  },
  tabs: {
    display: 'flex',
    backgroundColor: '#fff',
    borderBottom: '1px solid #e0e0e0',
    overflowX: 'auto'
  },
  tab: {
    flex: 1,
    padding: '12px 16px',
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
    cursor: 'pointer',
    borderBottom: '3px solid transparent',
    transition: 'all 0.2s'
  },
  activeTab: {
    color: '#007AFF',
    borderBottomColor: '#007AFF'
  },
  content: {
    padding: 20,
    maxWidth: 1200,
    margin: '0 auto'
  },
  aboutSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333'
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12
  },
  text: {
    fontSize: 15,
    lineHeight: 1.6,
    color: '#444',
    whiteSpace: 'pre-wrap'
  },
  sectionImage: {
    width: '100%',
    marginTop: 16,
    borderRadius: 8,
    maxHeight: 400,
    objectFit: 'cover'
  },
  amenitiesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: 12
  },
  amenityCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    textAlign: 'center'
  },
  amenityIcon: {
    fontSize: 24,
    marginBottom: 8
  },
  amenityName: {
    fontSize: 13,
    color: '#666'
  },
  galleryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: 16
  },
  galleryItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  galleryImage: {
    width: '100%',
    height: 200,
    objectFit: 'cover'
  },
  galleryTitle: {
    padding: 12,
    fontSize: 14,
    color: '#666'
  },
  hoursSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  hoursTable: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },
  hourRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #f0f0f0'
  },
  dayName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333'
  },
  hourTime: {
    fontSize: 15,
    color: '#666'
  },
  contactSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  contactItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottom: '1px solid #f0f0f0'
  },
  contactLabel: {
    display: 'block',
    fontSize: 13,
    color: '#999',
    marginBottom: 6
  },
  contactLink: {
    fontSize: 15,
    color: '#007AFF',
    textDecoration: 'none'
  },
  addressText: {
    fontSize: 15,
    color: '#444',
    lineHeight: 1.5
  },
  actionButtons: {
    display: 'flex',
    gap: 12,
    marginTop: 20
  },
  actionButton: {
    flex: 1,
    padding: '12px 20px',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'opacity 0.2s'
  },
  whatsappButton: {
    backgroundColor: '#25D366',
    color: '#fff'
  },
  directionsButton: {
    backgroundColor: '#007AFF',
    color: '#fff'
  },
  socialSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTop: '1px solid #e0e0e0'
  },
  socialTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333'
  },
  socialLinks: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap'
  },
  socialLink: {
    padding: '8px 16px',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    fontSize: 14,
    color: '#333',
    textDecoration: 'none'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh'
  },
  spinner: {
    width: 40,
    height: 40,
    border: '4px solid #f0f0f0',
    borderTop: '4px solid #007AFF',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#666'
  },
  errorContainer: {
    padding: 40,
    textAlign: 'center'
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#c62828',
    marginBottom: 12
  },
  errorText: {
    fontSize: 15,
    color: '#666',
    marginBottom: 24
  },
  backButton: {
    padding: '12px 24px',
    backgroundColor: '#007AFF',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: '500',
    cursor: 'pointer'
  }
};
