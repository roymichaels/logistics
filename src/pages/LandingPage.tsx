import React, { useState, useEffect } from 'react';
import { hebrew } from '../lib/hebrew';
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

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
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
      `}</style>

      {/* Hero Section */}
      <div style={{
        background: theme.gradientPrimary,
        color: theme.white,
        padding: '60px 20px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className={`fade-in-up ${isVisible ? '' : ''}`}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>
              📦
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
            fontSize: '20px',
            marginBottom: '40px',
            lineHeight: '1.6',
            maxWidth: '800px',
            margin: '0 auto 40px',
            opacity: 0.95,
          }}>
            {hebrew.landing.subtitle}
            <br />
            <span style={{ fontSize: '18px', opacity: 0.85 }}>
              {hebrew.landing.description}
            </span>
          </p>

          <button
            className={`cta-button fade-in-up delay-3 ${isVisible ? '' : ''}`}
            onClick={onGetStarted}
            style={{
              padding: '18px 48px',
              fontSize: '20px',
              fontWeight: '600',
              background: theme.white,
              color: theme.primary,
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: theme.shadowSoft,
              fontFamily: 'inherit',
            }}
          >
            {hebrew.landing.getStarted}
          </button>
        </div>
      </div>

      {/* Features Section */}
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
          marginBottom: '60px',
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
                fontSize: '22px',
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

      {/* User Roles Section */}
      <div style={{
        background: theme.card,
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
              { icon: '👔', role: hebrew.landing.userRoles.businessOwner, desc: hebrew.landing.userRoles.businessOwnerDesc },
              { icon: '📊', role: hebrew.landing.userRoles.manager, desc: hebrew.landing.userRoles.managerDesc },
              { icon: '📞', role: hebrew.landing.userRoles.dispatcher, desc: hebrew.landing.userRoles.dispatcherDesc },
              { icon: '🚗', role: hebrew.landing.userRoles.driver, desc: hebrew.landing.userRoles.driverDesc },
              { icon: '📦', role: hebrew.landing.userRoles.warehouse, desc: hebrew.landing.userRoles.warehouseDesc },
              { icon: '🛒', role: hebrew.landing.userRoles.sales, desc: hebrew.landing.userRoles.salesDesc },
            ].map((user, index) => (
              <div
                key={index}
                style={{
                  background: theme.secondary,
                  border: `2px solid ${theme.cardBorder}`,
                  padding: '24px',
                  borderRadius: '12px',
                  textAlign: 'center',
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
        background: theme.gradientPrimary,
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
              color: theme.primary,
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: theme.shadowSoft,
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
          </div>
          <p style={{
            fontSize: '14px',
            opacity: 0.6,
            margin: 0,
          }}>
            © {new Date().getFullYear()} {hebrew.landing.title}. {hebrew.landing.footer.copyright}
          </p>
        </div>
      </div>
    </div>
  );
}
