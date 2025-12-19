import React, { useState, useEffect } from 'react';
import { hebrew } from '../lib/i18n';
import { colors } from '../styles/design-system';

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const [isVisible, setIsVisible] = useState(false);
  const theme = colors;

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

        @media (max-width: 768px) {
          .hero-section {
            padding: 40px 20px !important;
          }
          .hero-emojis {
            font-size: 48px !important;
            gap: 12px !important;
            margin-bottom: 12px !important;
          }
          .hero-title {
            font-size: 32px !important;
            margin-bottom: 12px !important;
          }
          .hero-subtitle {
            font-size: 18px !important;
            margin-bottom: 8px !important;
          }
          .hero-description {
            font-size: 16px !important;
            margin-bottom: 24px !important;
          }
          .cta-button {
            padding: 14px 32px !important;
            font-size: 18px !important;
          }
          .section-padding {
            padding: 40px 20px !important;
          }
          .section-title {
            font-size: 28px !important;
            margin-bottom: 24px !important;
          }
          .section-subtitle {
            display: none;
          }
          .grid-2-col {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 16px !important;
          }
          .capability-card {
            padding: 20px 12px !important;
          }
          .capability-icon {
            font-size: 40px !important;
            margin-bottom: 12px !important;
          }
          .capability-title {
            font-size: 16px !important;
            margin-bottom: 8px !important;
          }
          .capability-desc {
            font-size: 13px !important;
          }
          .feature-card {
            padding: 18px !important;
          }
          .feature-icon {
            font-size: 36px !important;
            margin-bottom: 12px !important;
          }
          .feature-title {
            font-size: 16px !important;
            margin-bottom: 8px !important;
          }
          .feature-desc {
            font-size: 13px !important;
          }
          .tech-card {
            padding: 16px 12px !important;
          }
          .tech-icon {
            font-size: 28px !important;
            margin-bottom: 8px !important;
          }
          .tech-title {
            font-size: 14px !important;
            margin-bottom: 4px !important;
          }
          .tech-desc {
            font-size: 11px !important;
          }
          .role-card {
            padding: 16px 12px !important;
          }
          .role-icon {
            font-size: 32px !important;
            margin-bottom: 8px !important;
          }
          .role-title {
            font-size: 15px !important;
            margin-bottom: 6px !important;
          }
          .role-desc {
            font-size: 12px !important;
          }
          .cta-section {
            padding: 40px 20px !important;
          }
          .cta-title {
            font-size: 28px !important;
            margin-bottom: 20px !important;
          }
          .cta-desc {
            font-size: 16px !important;
            margin-bottom: 24px !important;
          }
          .footer-section {
            padding: 24px 20px !important;
          }
          .footer-badges {
            gap: 12px !important;
          }
          .footer-badge {
            font-size: 12px !important;
          }
        }
      `}</style>

      {/* Hero Section */}
      <div className="hero-section" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: theme.white,
        padding: '80px 20px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className={`fade-in-up ${isVisible ? '' : ''}`}>
            <div className="hero-emojis" style={{ fontSize: '72px', marginBottom: '20px', display: 'flex', justifyContent: 'center', gap: '20px' }}>
              <span>🏢</span>
              <span>💬</span>
              <span>📦</span>
              <span>🚚</span>
            </div>
          </div>

          <h1 className={`hero-title fade-in-up delay-1 ${isVisible ? '' : ''}`} style={{
            fontSize: '48px',
            fontWeight: '700',
            marginBottom: '20px',
            lineHeight: '1.2',
          }}>
            {hebrew.landing.title}
          </h1>

          <p className={`hero-subtitle fade-in-up delay-2 ${isVisible ? '' : ''}`} style={{
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

          <p className={`hero-description fade-in-up delay-2 ${isVisible ? '' : ''}`} style={{
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
      <div className="section-padding" style={{
        padding: '80px 20px',
        background: 'linear-gradient(to bottom, #f7f8fc, #ffffff)',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 className="section-title" style={{
            fontSize: '36px',
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: '15px',
            color: theme.text,
          }}>
            {hebrew.landing.platformCapabilities.title}
          </h2>
          <p className="section-subtitle" style={{
            fontSize: '18px',
            textAlign: 'center',
            marginBottom: '50px',
            color: theme.muted,
          }}>
            {hebrew.landing.platformCapabilities.subtitle}
          </p>

          <div className="grid-2-col" style={{
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
                <div className="capability-icon" style={{ fontSize: '56px', marginBottom: '20px' }}>
                  {capability.icon}
                </div>
                <h3 className="capability-title" style={{
                  fontSize: '22px',
                  fontWeight: '600',
                  marginBottom: '12px',
                }}>
                  {capability.title}
                </h3>
                <p className="capability-desc" style={{
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
      <div className="section-padding" style={{
        padding: '80px 20px',
        maxWidth: '1200px',
        margin: '0 auto',
        background: theme.backgroundDark,
      }}>
        <h2 className="section-title" style={{
          fontSize: '36px',
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: '60px',
          color: theme.text,
        }}>
          {hebrew.landing.features.title}
        </h2>

        <div className="grid-2-col" style={{
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
              <div className="feature-icon" style={{ fontSize: '48px', marginBottom: '20px' }}>
                {feature.icon}
              </div>
              <h3 className="feature-title" style={{
                fontSize: '20px',
                fontWeight: '600',
                marginBottom: '12px',
                color: theme.text,
              }}>
                {feature.title}
              </h3>
              <p className="feature-desc" style={{
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
      <div className="section-padding" style={{
        padding: '80px 20px',
        background: theme.card,
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
        }}>
          <h2 className="section-title" style={{
            fontSize: '36px',
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: '60px',
            color: theme.text,
          }}>
            {hebrew.landing.technology.title}
          </h2>

          <div className="grid-2-col" style={{
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
                className="tech-card"
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
                <div className="tech-icon" style={{ fontSize: '36px', marginBottom: '12px' }}>
                  {tech.icon}
                </div>
                <h3 className="tech-title" style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: theme.text,
                }}>
                  {tech.title}
                </h3>
                <p className="tech-desc" style={{
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

      {/* Benefits Section */}
      <div className="section-padding" style={{
        background: theme.backgroundDark,
        padding: '80px 20px',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
        }}>
          <h2 className="section-title" style={{
            fontSize: '36px',
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: '15px',
            color: theme.text,
          }}>
            {hebrew.landing.benefits.title}
          </h2>
          <p className="section-subtitle" style={{
            fontSize: '18px',
            textAlign: 'center',
            marginBottom: '50px',
            color: theme.muted,
          }}>
            {hebrew.landing.benefits.subtitle}
          </p>

          <div className="grid-2-col" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '30px',
          }}>
            {[
              {
                icon: '✓',
                title: hebrew.landing.benefits.quality.title,
                desc: hebrew.landing.benefits.quality.description,
                gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              },
              {
                icon: '⚡',
                title: hebrew.landing.benefits.speed.title,
                desc: hebrew.landing.benefits.speed.description,
                gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
              },
              {
                icon: '🎯',
                title: hebrew.landing.benefits.variety.title,
                desc: hebrew.landing.benefits.variety.description,
                gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
              },
              {
                icon: '🛡️',
                title: hebrew.landing.benefits.trust.title,
                desc: hebrew.landing.benefits.trust.description,
                gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
              },
            ].map((benefit, index) => (
              <div
                key={index}
                className="capability-card"
                style={{
                  background: benefit.gradient,
                  padding: '35px',
                  borderRadius: '20px',
                  textAlign: 'center',
                  color: '#ffffff',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                }}
              >
                <div className="capability-icon" style={{ fontSize: '56px', marginBottom: '20px' }}>
                  {benefit.icon}
                </div>
                <h3 className="capability-title" style={{
                  fontSize: '22px',
                  fontWeight: '600',
                  marginBottom: '12px',
                }}>
                  {benefit.title}
                </h3>
                <p className="capability-desc" style={{
                  fontSize: '15px',
                  lineHeight: '1.6',
                  opacity: 0.95,
                }}>
                  {benefit.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="section-padding" style={{
        padding: '80px 20px',
        background: 'linear-gradient(to bottom, #ffffff, #f7f8fc)',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
        }}>
          <h2 className="section-title" style={{
            fontSize: '36px',
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: '15px',
            color: theme.text,
          }}>
            {hebrew.landing.howItWorks.title}
          </h2>
          <p className="section-subtitle" style={{
            fontSize: '18px',
            textAlign: 'center',
            marginBottom: '50px',
            color: theme.muted,
          }}>
            {hebrew.landing.howItWorks.subtitle}
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '30px',
          }}>
            {[
              {
                num: '1',
                icon: '🔍',
                title: hebrew.landing.howItWorks.step1.title,
                desc: hebrew.landing.howItWorks.step1.description
              },
              {
                num: '2',
                icon: '🛒',
                title: hebrew.landing.howItWorks.step2.title,
                desc: hebrew.landing.howItWorks.step2.description
              },
              {
                num: '3',
                icon: '✅',
                title: hebrew.landing.howItWorks.step3.title,
                desc: hebrew.landing.howItWorks.step3.description
              },
              {
                num: '4',
                icon: '📦',
                title: hebrew.landing.howItWorks.step4.title,
                desc: hebrew.landing.howItWorks.step4.description
              },
            ].map((step, index) => (
              <div
                key={index}
                style={{
                  background: theme.card,
                  border: `2px solid ${theme.cardBorder}`,
                  padding: '30px',
                  borderRadius: '16px',
                  textAlign: 'center',
                  position: 'relative',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = theme.primary;
                  e.currentTarget.style.transform = 'translateY(-5px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = theme.cardBorder;
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '-15px',
                  right: '20px',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '18px',
                }}>
                  {step.num}
                </div>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                  {step.icon}
                </div>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  marginBottom: '10px',
                  color: theme.text,
                }}>
                  {step.title}
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: theme.muted,
                  lineHeight: '1.6',
                }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Work With Us Section (Small) */}
      <div style={{
        padding: '60px 20px',
        background: theme.backgroundDark,
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h3 style={{
            fontSize: '24px',
            fontWeight: '600',
            marginBottom: '12px',
            color: theme.text,
          }}>
            {hebrew.landing.workWithUs.title}
          </h3>
          <p style={{
            fontSize: '16px',
            marginBottom: '24px',
            color: theme.muted,
          }}>
            {hebrew.landing.workWithUs.description}
          </p>
          <button
            onClick={onGetStarted}
            style={{
              padding: '12px 36px',
              fontSize: '16px',
              fontWeight: '600',
              background: 'transparent',
              color: theme.primary,
              border: `2px solid ${theme.primary}`,
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = theme.primary;
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = theme.primary;
            }}
          >
            {hebrew.landing.workWithUs.button}
          </button>
        </div>
      </div>

      {/* CTA Section */}
      <div className="cta-section" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: theme.white,
        padding: '80px 20px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 className="cta-title" style={{
            fontSize: '36px',
            fontWeight: '700',
            marginBottom: '30px',
          }}>
            {hebrew.landing.cta.title}
          </h2>
          <p className="cta-desc" style={{
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
      <div className="footer-section" style={{
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
          <div className="footer-badges" style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '30px',
            marginBottom: '20px',
            flexWrap: 'wrap',
          }}>
            <span className="footer-badge" style={{ fontSize: '14px', opacity: 0.7 }}>🔒 {hebrew.landing.footer.secure}</span>
            <span className="footer-badge" style={{ fontSize: '14px', opacity: 0.7 }}>⚡ {hebrew.landing.footer.fast}</span>
            <span className="footer-badge" style={{ fontSize: '14px', opacity: 0.7 }}>📱 {hebrew.landing.footer.mobile}</span>
            <span className="footer-badge" style={{ fontSize: '14px', opacity: 0.7 }}>⏱️ {hebrew.landing.footer.realtime}</span>
            <span className="footer-badge" style={{ fontSize: '14px', opacity: 0.7 }}>🔐 {hebrew.landing.footer.encrypted}</span>
            <span className="footer-badge" style={{ fontSize: '14px', opacity: 0.7 }}>📴 {hebrew.landing.footer.offline}</span>
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
