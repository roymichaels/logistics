import React, { useState, useEffect } from 'react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
          box-shadow: 0 8px 16px rgba(0, 122, 255, 0.3);
        }

        .cta-button:active {
          transform: translateY(0);
        }

        .feature-card {
          transition: all 0.3s ease;
        }

        .feature-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        }
      `}</style>

      {/* Hero Section */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff',
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
            מערכת לוגיסטיקה חכמה
          </h1>

          <h2 className={`fade-in-up delay-1 ${isVisible ? '' : ''}`} style={{
            fontSize: '32px',
            fontWeight: '600',
            marginBottom: '20px',
            lineHeight: '1.3',
            opacity: 0.95,
          }}>
            Smart Logistics Management System
          </h2>

          <p className={`fade-in-up delay-2 ${isVisible ? '' : ''}`} style={{
            fontSize: '20px',
            marginBottom: '40px',
            lineHeight: '1.6',
            maxWidth: '800px',
            margin: '0 auto 40px',
            opacity: 0.9,
          }}>
            ניהול מתקדם של הזמנות, משלוחים ומלאי בזמן אמת. פתרון מקצועי לעסקים מכל הגדלים.
            <br />
            <span style={{ fontSize: '18px', opacity: 0.85 }}>
              Advanced order, delivery, and inventory management in real-time
            </span>
          </p>

          <button
            className={`cta-button fade-in-up delay-3 ${isVisible ? '' : ''}`}
            onClick={onGetStarted}
            style={{
              padding: '18px 48px',
              fontSize: '20px',
              fontWeight: '600',
              backgroundColor: '#fff',
              color: '#667eea',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              fontFamily: 'inherit',
            }}
          >
            התחל עכשיו • Get Started
          </button>
        </div>
      </div>

      {/* Features Section */}
      <div style={{
        padding: '80px 20px',
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        <h2 style={{
          fontSize: '36px',
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: '60px',
          color: '#1a1a1a',
        }}>
          יכולות מתקדמות • Key Features
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
              title: 'ניהול הזמנות',
              titleEn: 'Order Management',
              description: 'מעקב אחר הזמנות בזמן אמת, עדכוני סטטוס אוטומטיים ויצירת הזמנות מהירה',
              descriptionEn: 'Real-time order tracking, automatic status updates, and quick order creation',
            },
            {
              icon: '🚚',
              title: 'ניהול משלוחים',
              titleEn: 'Delivery Management',
              description: 'הקצאת משלוחים לנהגים, תכנון מסלולים אופטימלי ומעקב GPS',
              descriptionEn: 'Driver assignment, optimal route planning, and GPS tracking',
            },
            {
              icon: '📦',
              title: 'ניהול מלאי',
              titleEn: 'Inventory Management',
              description: 'מעקב מלאי מדויק, התראות על מלאי נמוך ובקשות חידוש מלאי',
              descriptionEn: 'Accurate inventory tracking, low stock alerts, and restock requests',
            },
            {
              icon: '👥',
              title: 'ניהול משתמשים',
              titleEn: 'User Management',
              description: 'תפקידים מותאמים אישית, הרשאות מתקדמות ומערכת אימות מאובטחת',
              descriptionEn: 'Custom roles, advanced permissions, and secure authentication',
            },
            {
              icon: '📊',
              title: 'דוחות וניתוחים',
              titleEn: 'Reports & Analytics',
              description: 'תובנות עסקיות בזמן אמת, דוחות מפורטים ומדדי ביצועים',
              descriptionEn: 'Real-time business insights, detailed reports, and KPIs',
            },
            {
              icon: '🔒',
              title: 'אבטחה מתקדמת',
              titleEn: 'Advanced Security',
              description: 'הצפנה מלאה, בקרת גישה מבוססת תפקידים ומעקב אודיט',
              descriptionEn: 'Full encryption, role-based access control, and audit trails',
            },
          ].map((feature, index) => (
            <div
              key={index}
              className={`feature-card fade-in-up delay-${Math.min(index % 3 + 1, 4)} ${isVisible ? '' : ''}`}
              style={{
                backgroundColor: '#fff',
                padding: '30px',
                borderRadius: '16px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>
                {feature.icon}
              </div>
              <h3 style={{
                fontSize: '22px',
                fontWeight: '600',
                marginBottom: '8px',
                color: '#1a1a1a',
              }}>
                {feature.title}
              </h3>
              <h4 style={{
                fontSize: '18px',
                fontWeight: '500',
                marginBottom: '12px',
                color: '#667eea',
              }}>
                {feature.titleEn}
              </h4>
              <p style={{
                fontSize: '15px',
                lineHeight: '1.6',
                color: '#666',
                marginBottom: '8px',
                direction: 'rtl',
              }}>
                {feature.description}
              </p>
              <p style={{
                fontSize: '14px',
                lineHeight: '1.5',
                color: '#888',
              }}>
                {feature.descriptionEn}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* User Roles Section */}
      <div style={{
        backgroundColor: '#fff',
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
            color: '#1a1a1a',
          }}>
            מי משתמש במערכת? • Who Uses The System?
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '24px',
          }}>
            {[
              { icon: '👔', role: 'בעל עסק', roleEn: 'Business Owner', desc: 'ניהול מלא של העסק' },
              { icon: '📊', role: 'מנהל', roleEn: 'Manager', desc: 'פיקוח ותכנון' },
              { icon: '📞', role: 'דיספצ\'ר', roleEn: 'Dispatcher', desc: 'ניהול משלוחים' },
              { icon: '🚗', role: 'נהג', roleEn: 'Driver', desc: 'ביצוע משלוחים' },
              { icon: '📦', role: 'מחסנאי', roleEn: 'Warehouse', desc: 'ניהול מלאי' },
              { icon: '🛒', role: 'איש מכירות', roleEn: 'Sales', desc: 'יצירת הזמנות' },
            ].map((user, index) => (
              <div
                key={index}
                style={{
                  backgroundColor: '#f8f9fa',
                  padding: '24px',
                  borderRadius: '12px',
                  textAlign: 'center',
                  border: '2px solid #e9ecef',
                }}
              >
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>
                  {user.icon}
                </div>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  marginBottom: '4px',
                  color: '#1a1a1a',
                }}>
                  {user.role}
                </h3>
                <h4 style={{
                  fontSize: '16px',
                  fontWeight: '500',
                  marginBottom: '8px',
                  color: '#667eea',
                }}>
                  {user.roleEn}
                </h4>
                <p style={{
                  fontSize: '14px',
                  color: '#666',
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
        color: '#fff',
        padding: '80px 20px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '36px',
            fontWeight: '700',
            marginBottom: '20px',
          }}>
            מוכנים להתחיל?
          </h2>
          <h3 style={{
            fontSize: '28px',
            fontWeight: '600',
            marginBottom: '30px',
            opacity: 0.95,
          }}>
            Ready to Get Started?
          </h3>
          <p style={{
            fontSize: '18px',
            marginBottom: '40px',
            lineHeight: '1.6',
            opacity: 0.9,
          }}>
            הצטרפו למערכת הניהול הלוגיסטית המתקדמת ביותר
            <br />
            Join the most advanced logistics management system
          </p>
          <button
            className="cta-button"
            onClick={onGetStarted}
            style={{
              padding: '18px 48px',
              fontSize: '20px',
              fontWeight: '600',
              backgroundColor: '#fff',
              color: '#667eea',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              fontFamily: 'inherit',
            }}
          >
            כניסה למערכת • Sign In
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        backgroundColor: '#1a1a1a',
        color: '#fff',
        padding: '40px 20px',
        textAlign: 'center',
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
            <span style={{ fontSize: '14px', opacity: 0.7 }}>🔒 מאובטח לחלוטין • Fully Secure</span>
            <span style={{ fontSize: '14px', opacity: 0.7 }}>⚡ מהיר ויעיל • Fast & Efficient</span>
            <span style={{ fontSize: '14px', opacity: 0.7 }}>📱 תומך במובייל • Mobile Ready</span>
          </div>
          <p style={{
            fontSize: '14px',
            opacity: 0.6,
            margin: 0,
          }}>
            © {new Date().getFullYear()} Logistics Management System. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
