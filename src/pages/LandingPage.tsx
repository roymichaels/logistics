import React, { useState, useEffect } from 'react';
import { hebrew } from '../lib/i18n';
import { ADMIN_THEME } from '../styles/roleThemes';

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const [isVisible, setIsVisible] = useState(false);
  const theme = ADMIN_THEME.colors;

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: theme.backgroundSolid,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      direction: 'rtl',
      color: theme.text
    }}>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
          opacity: 0;
        }

        .fade-in {
          animation: fadeIn 1s ease-out forwards;
          opacity: 0;
        }

        .delay-1 { animation-delay: 0.2s; }
        .delay-2 { animation-delay: 0.4s; }
        .delay-3 { animation-delay: 0.6s; }
        .delay-4 { animation-delay: 0.8s; }

        .cta-button {
          transition: all 0.3s ease;
        }

        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: ${theme.glowPrimaryStrong};
        }

        .cta-button:active {
          transform: translateY(0);
        }

        .feature-card {
          transition: all 0.3s ease;
        }

        .feature-card:hover {
          transform: translateY(-5px);
          box-shadow: ${theme.shadowStrong};
        }

        .capability-card {
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .capability-card:hover {
          transform: scale(1.05);
          box-shadow: ${theme.glowPrimaryStrong};
        }
      `}</style>

      {/* Hero Section */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: theme.white,
        padding: '80px 20px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className={`fade-in-up ${isVisible ? '' : ''}`}>
            <div style={{ fontSize: '72px', marginBottom: '20px', display: 'flex', justifyContent: 'center', gap: '20px' }}>
              <span>🏢</span>
              <span>💬</span>
              <span>📦</span>
              <span>🚚</span>
            </div>
          </div>

          <h1 className={`fade-in-up delay-1 ${isVisible ? '' : ''}`} style={{
            fontSize: '48px',
            fontWeight: '700',
            marginBottom: '20px',
            lineHeight: '1.2',
          }}>
            {hebrew.landing.title}
          </h1>

          <p className={`fade-in-up delay-2 ${isVisible ? '' : ''}`} style={{
            fontSize: '22px',
            marginBottom: '15px',
            lineHeight: '1.6',
            maxWidth: '900px',
            margin: '0 auto 15px',
            opacity: 0.95,
            fontWeight: '500'
          }}>
            {hebrew.landing.subtitle}
          </p>

          <p className={`fade-in-up delay-2 ${isVisible ? '' : ''}`} style={{
            fontSize: '18px',
            marginBottom: '40px',
            lineHeight: '1.6',
            maxWidth: '800px',
            margin: '0 auto 40px',
            opacity: 0.85,
          }}>
            {hebrew.landing.description}
          </p>

          <button
            className={`cta-button fade-in-up delay-3 ${isVisible ? '' : ''}`}
            onClick={onGetStarted}
            style={{
              padding: '18px 48px',
              fontSize: '20px',
              fontWeight: '600',
              background: theme.white,
              color: '#667eea',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              fontFamily: 'inherit',
            }}
          >
            {hebrew.landing.getStarted}
          </button>
        </div>
      </div>

      {/* Platform Capabilities Section */}
      <div style={{
        padding: '80px 20px',
        background: 'linear-gradient(to bottom, #f7f8fc, #ffffff)',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '36px',
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: '15px',
            color: theme.text,
          }}>
            {hebrew.landing.platformCapabilities.title}
          </h2>
          <p style={{
            fontSize: '18px',
            textAlign: 'center',
            marginBottom: '50px',
            color: theme.muted,
          }}>
            {hebrew.landing.platformCapabilities.subtitle}
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '25px',
          }}>
            {[
              {
                icon: '🚚',
                title: hebrew.landing.platformCapabilities.logistics.title,
                description: hebrew.landing.platformCapabilities.logistics.description,
                gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              },
              {
                icon: '💬',
                title: hebrew.landing.platformCapabilities.communication.title,
                description: hebrew.landing.platformCapabilities.communication.description,
                gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
              },
              {
                icon: '📊',
                title: hebrew.landing.platformCapabilities.business.title,
                description: hebrew.landing.platformCapabilities.business.description,
                gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
              },
              {
                icon: '🏗️',
                title: hebrew.landing.platformCapabilities.infrastructure.title,
                description: hebrew.landing.platformCapabilities.infrastructure.description,
                gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
              },
            ].map((capability, index) => (
              <div
                key={index}
                className="capability-card"
                style={{
                  background: capability.gradient,
                  padding: '35px',
                  borderRadius: '20px',
                  textAlign: 'center',
                  color: '#ffffff',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                }}
              >
                <div style={{ fontSize: '56px', marginBottom: '20px' }}>
                  {capability.icon}
                </div>
                <h3 style={{
                  fontSize: '22px',
                  fontWeight: '600',
                  marginBottom: '12px',
                }}>
                  {capability.title}
                </h3>
                <p style={{
                  fontSize: '15px',
                  lineHeight: '1.6',
                  opacity: 0.95,
                }}>
                  {capability.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Grid Section */}
      <div style={{
        padding: '80px 20px',
        maxWidth: '1200px',
        margin: '0 auto',
        background: theme.backgroundDark,
      }}>
        <h2 style={{
          fontSize: '36px',
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: '60px',
          color: theme.text,
        }}>
          {hebrew.landing.features.title}
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '30px',
        }}>
          {[
            {
              icon: '📋',
              title: hebrew.landing.features.orderManagement.title,
              description: hebrew.landing.features.orderManagement.description,
            },
            {
              icon: '🚚',
              title: hebrew.landing.features.deliveryManagement.title,
              description: hebrew.landing.features.deliveryManagement.description,
            },
            {
              icon: '📦',
              title: hebrew.landing.features.inventoryManagement.title,
              description: hebrew.landing.features.inventoryManagement.description,
            },
            {
              icon: '💬',
              title: hebrew.landing.features.realtimeChat.title,
              description: hebrew.landing.features.realtimeChat.description,
            },
            {
              icon: '🔐',
              title: hebrew.landing.features.encryptedMessaging.title,
              description: hebrew.landing.features.encryptedMessaging.description,
            },
            {
              icon: '📢',
              title: hebrew.landing.features.channels.title,
              description: hebrew.landing.features.channels.description,
            },
            {
              icon: '🏢',
              title: hebrew.landing.features.multiTenant.title,
              description: hebrew.landing.features.multiTenant.description,
            },
            {
              icon: '🏗️',
              title: hebrew.landing.features.infrastructure.title,
              description: hebrew.landing.features.infrastructure.description,
            },
            {
              icon: '🌐',
              title: hebrew.landing.features.web3Auth.title,
              description: hebrew.landing.features.web3Auth.description,
            },
            {
              icon: '📴',
              title: hebrew.landing.features.offlineFirst.title,
              description: hebrew.landing.features.offlineFirst.description,
            },
            {
              icon: '👥',
              title: hebrew.landing.features.userManagement.title,
              description: hebrew.landing.features.userManagement.description,
            },
            {
              icon: '📊',
              title: hebrew.landing.features.analytics.title,
              description: hebrew.landing.features.analytics.description,
            },
            {
              icon: '🔒',
              title: hebrew.landing.features.security.title,
              description: hebrew.landing.features.security.description,
            },
            {
              icon: '🔔',
              title: hebrew.landing.features.notifications.title,
              description: hebrew.landing.features.notifications.description,
            },
          ].map((feature, index) => (
            <div
              key={index}
              className={`feature-card fade-in-up delay-${Math.min(index % 3 + 1, 4)} ${isVisible ? '' : ''}`}
              style={{
                background: theme.card,
                border: `1px solid ${theme.cardBorder}`,
                padding: '30px',
                borderRadius: '16px',
                boxShadow: theme.shadow,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>
                {feature.icon}
              </div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '600',
                marginBottom: '12px',
                color: theme.text,
              }}>
                {feature.title}
              </h3>
              <p style={{
                fontSize: '15px',
                lineHeight: '1.6',
                color: theme.muted,
              }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Technology Section */}
      <div style={{
        padding: '80px 20px',
        background: theme.card,
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
        }}>
          <h2 style={{
            fontSize: '36px',
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: '60px',
            color: theme.text,
          }}>
            {hebrew.landing.technology.title}
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
          }}>
            {[
              { icon: '🌐', title: hebrew.landing.technology.web3.title, desc: hebrew.landing.technology.web3.description },
              { icon: '⚡', title: hebrew.landing.technology.realtime.title, desc: hebrew.landing.technology.realtime.description },
              { icon: '📴', title: hebrew.landing.technology.offline.title, desc: hebrew.landing.technology.offline.description },
              { icon: '🔐', title: hebrew.landing.technology.encrypted.title, desc: hebrew.landing.technology.encrypted.description },
              { icon: '📱', title: hebrew.landing.technology.mobile.title, desc: hebrew.landing.technology.mobile.description },
              { icon: '💬', title: hebrew.landing.technology.telegram.title, desc: hebrew.landing.technology.telegram.description },
            ].map((tech, index) => (
              <div
                key={index}
                style={{
                  background: theme.backgroundDark,
                  border: `2px solid ${theme.cardBorder}`,
                  padding: '25px',
                  borderRadius: '12px',
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.borderColor = theme.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = theme.cardBorder;
                }}
              >
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>
                  {tech.icon}
                </div>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: theme.text,
                }}>
                  {tech.title}
                </h3>
                <p style={{
                  fontSize: '13px',
                  color: theme.muted,
                }}>
                  {tech.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Roles Section */}
      <div style={{
        background: theme.backgroundDark,
        padding: '80px 20px',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
        }}>
          <h2 style={{
            fontSize: '36px',
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: '60px',
            color: theme.text,
          }}>
            {hebrew.landing.userRoles.title}
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '24px',
          }}>
            {[
              { icon: '🏛️', role: hebrew.landing.userRoles.infrastructureOwner, desc: hebrew.landing.userRoles.infrastructureOwnerDesc },
              { icon: '👔', role: hebrew.landing.userRoles.businessOwner, desc: hebrew.landing.userRoles.businessOwnerDesc },
              { icon: '📊', role: hebrew.landing.userRoles.manager, desc: hebrew.landing.userRoles.managerDesc },
              { icon: '📞', role: hebrew.landing.userRoles.dispatcher, desc: hebrew.landing.userRoles.dispatcherDesc },
              { icon: '🚗', role: hebrew.landing.userRoles.driver, desc: hebrew.landing.userRoles.driverDesc },
              { icon: '📦', role: hebrew.landing.userRoles.warehouse, desc: hebrew.landing.userRoles.warehouseDesc },
              { icon: '🛒', role: hebrew.landing.userRoles.sales, desc: hebrew.landing.userRoles.salesDesc },
              { icon: '💁', role: hebrew.landing.userRoles.support, desc: hebrew.landing.userRoles.supportDesc },
            ].map((user, index) => (
              <div
                key={index}
                style={{
                  background: theme.card,
                  border: `2px solid ${theme.cardBorder}`,
                  padding: '24px',
                  borderRadius: '12px',
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = theme.primary;
                  e.currentTarget.style.transform = 'translateY(-3px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = theme.cardBorder;
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>
                  {user.icon}
                </div>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: theme.text,
                }}>
                  {user.role}
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: theme.muted,
                  lineHeight: '1.5',
                }}>
                  {user.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: theme.white,
        padding: '80px 20px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '36px',
            fontWeight: '700',
            marginBottom: '30px',
          }}>
            {hebrew.landing.cta.title}
          </h2>
          <p style={{
            fontSize: '18px',
            marginBottom: '40px',
            lineHeight: '1.6',
            opacity: 0.95,
          }}>
            {hebrew.landing.cta.description}
          </p>
          <button
            className="cta-button"
            onClick={onGetStarted}
            style={{
              padding: '18px 48px',
              fontSize: '20px',
              fontWeight: '600',
              background: theme.white,
              color: '#667eea',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              fontFamily: 'inherit',
            }}
          >
            {hebrew.landing.cta.button}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        backgroundColor: theme.backgroundSolid,
        color: theme.text,
        padding: '40px 20px',
        textAlign: 'center',
        borderTop: `1px solid ${theme.border}`,
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '30px',
            marginBottom: '20px',
            flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '14px', opacity: 0.7 }}>🔒 {hebrew.landing.footer.secure}</span>
            <span style={{ fontSize: '14px', opacity: 0.7 }}>⚡ {hebrew.landing.footer.fast}</span>
            <span style={{ fontSize: '14px', opacity: 0.7 }}>📱 {hebrew.landing.footer.mobile}</span>
            <span style={{ fontSize: '14px', opacity: 0.7 }}>⏱️ {hebrew.landing.footer.realtime}</span>
            <span style={{ fontSize: '14px', opacity: 0.7 }}>🔐 {hebrew.landing.footer.encrypted}</span>
            <span style={{ fontSize: '14px', opacity: 0.7 }}>📴 {hebrew.landing.footer.offline}</span>
          </div>
          <p style={{
            fontSize: '14px',
            opacity: 0.6,
            margin: 0,
          }}>
            © {new Date().getFullYear()} UndergroundLab. {hebrew.landing.footer.copyright}
          </p>
        </div>
      </div>
    </div>
  );
}
