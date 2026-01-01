import React, { useState } from 'react';
import { User } from '../data/types';
import { tokens } from '../styles/tokens';

import { Toast } from './Toast';
import { hebrew, roleNames, roleIcons } from '../lib/i18n';

interface TeamMemberOnboardingProps {
  onComplete: (role: User['role']) => void;
  onBack: () => void;
}

type OnboardingStep = 'role_selection' | 'role_details' | 'submitting';

interface RoleOption {
  value: User['role'];
  icon: string;
  label: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
}

const TEAM_ROLES: RoleOption[] = [
  {
    value: 'driver',
    icon: '🚗',
    label: 'נהג משלוחים',
    description: 'ביצוע משלוחים ומסירת הזמנות ללקוחות',
    responsibilities: [
      'קבלת משימות משלוח',
      'ניווט למיקומי לקוחות',
      'מסירת הזמנות בזמן',
      'עדכון סטטוס משלוח',
      'ניהול מלאי רכב'
    ],
    requirements: [
      'רישיון נהיגה בתוקף',
      'רכב או אופנוע',
      'זמינות לעבודה',
      'טלפון חכם'
    ]
  },
  {
    value: 'warehouse',
    icon: '📦',
    label: 'עובד מחסן',
    description: 'ניהול מלאי, קליטה ואריזת הזמנות',
    responsibilities: [
      'קליטת סחורה',
      'ספירת מלאי',
      'אריזת הזמנות',
      'העברות בין מחסנים',
      'דיווח על מחסורים'
    ],
    requirements: [
      'יכולת פיזית',
      'דיוק וקפדנות',
      'עבודת צוות',
      'זמינות למשמרות'
    ]
  },
  {
    value: 'sales',
    icon: '💼',
    label: 'איש מכירות',
    description: 'יצירת הזמנות ושירות לקוחות',
    responsibilities: [
      'קבלת הזמנות טלפוניות',
      'יצירת הזמנות במערכת',
      'ייעוץ ללקוחות',
      'מעקב אחר הזמנות',
      'דיווח מכירות'
    ],
    requirements: [
      'כישורי תקשורת',
      'שירותיות',
      'היכרות עם מוצרים',
      'יכולת עבודה תחת לחץ'
    ]
  },
  {
    value: 'dispatcher',
    icon: '📋',
    label: 'מוקדן',
    description: 'ניהול משלוחים ושיבוץ נהגים',
    responsibilities: [
      'קבלת הזמנות',
      'שיבוץ נהגים',
      'תכנון מסלולים',
      'תיאום עם לקוחות',
      'מעקב בזמן אמת'
    ],
    requirements: [
      'יכולת ארגון',
      'ניהול זמן',
      'עבודה תחת לחץ',
      'כישורי תקשורת'
    ]
  },
  {
    value: 'customer_service',
    icon: '🎧',
    label: 'שירות לקוחות',
    description: 'מענה לפניות וטיפול בבעיות',
    responsibilities: [
      'מענה לפניות',
      'טיפול בתלונות',
      'עדכון סטטוס הזמנות',
      'תיאום עם מחלקות',
      'תיעוד בעיות'
    ],
    requirements: [
      'סבלנות ואמפתיה',
      'כישורי תקשורת',
      'פתרון בעיות',
      'שליטה במערכות'
    ]
  },
  {
    value: 'manager',
    icon: '👔',
    label: 'מנהל',
    description: 'ניהול תפעולי של העסק והצוות',
    responsibilities: [
      'פיקוח על הצוות',
      'ניהול מבצעים',
      'קבלת החלטות',
      'דיווח להנהלה',
      'שיפור תהליכים'
    ],
    requirements: [
      'ניסיון ניהולי',
      'מנהיגות',
      'קבלת החלטות',
      'אחריות ומחויבות'
    ]
  }
];

export function TeamMemberOnboarding({ onComplete, onBack }: TeamMemberOnboardingProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('role_selection');
  const [selectedRole, setSelectedRole] = useState<User['role'] | null>(null);
  const [expandedRole, setExpandedRole] = useState<User['role'] | null>(null);

  const handleRoleSelect = (role: User['role']) => {

    if (expandedRole === role) {
      setExpandedRole(null);
    } else {
      setExpandedRole(role);
      setSelectedRole(role);
    }
  };

  const handleNext = () => {
    if (!selectedRole) {
      Toast.error('אנא בחר תפקיד');
      return;
    }

    if (currentStep === 'role_selection') {
      setCurrentStep('role_details');
    } else if (currentStep === 'role_details') {
      handleSubmit();
    }
  };

  const handleBack = () => {

    if (currentStep === 'role_selection') {
      onBack();
    } else if (currentStep === 'role_details') {
      setCurrentStep('role_selection');
    }
  };

  const handleSubmit = async () => {
    if (!selectedRole) return;

    setCurrentStep('submitting');

    setTimeout(() => {

      Toast.success('הבקשה נשלחה למנהל לאישור!');
      setTimeout(() => {
        onComplete(selectedRole);
      }, 1500);
    }, 1500);
  };

  const selectedRoleData = TEAM_ROLES.find(r => r.value === selectedRole);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(125% 125% at 50% 0%, rgba(95, 46, 170, 0.55) 0%, rgba(12, 2, 25, 0.95) 45%, #03000a 100%)',
      padding: '20px',
      paddingBottom: '100px',
      direction: 'rtl',
      position: 'relative',
      overflow: 'auto'
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(80% 80% at 80% 10%, rgba(77, 208, 225, 0.08) 0%, rgba(20, 6, 58, 0) 60%)',
        pointerEvents: 'none'
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        {currentStep !== 'submitting' && (
          <div style={{
            textAlign: 'center',
            marginBottom: '32px'
          }}>
            <div style={{
              fontSize: '64px',
              marginBottom: '16px',
              animation: 'fadeInUp 0.6s ease-out'
            }}>
              🚗
            </div>
            <h2 style={{
              margin: 0,
              fontSize: '28px',
              fontWeight: '700',
              color: tokens.colors.text.primaryBright,
              marginBottom: '8px',
              animation: 'fadeInUp 0.6s ease-out 0.1s backwards'
            }}>
              {currentStep === 'role_selection' ? 'בחר את התפקיד שלך' : 'סקירת התפקיד'}
            </h2>
            <p style={{
              margin: 0,
              fontSize: '15px',
              color: tokens.colors.text.secondary,
              animation: 'fadeInUp 0.6s ease-out 0.2s backwards'
            }}>
              {currentStep === 'role_selection'
                ? 'התחל כנהג משלוחים או בחר תפקיד אחר'
                : 'בדוק את הדרישות לפני ששולח בקשה'}
            </p>
          </div>
        )}

        {/* Role Selection */}
        {currentStep === 'role_selection' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: window.innerWidth > 600 ? 'repeat(2, 1fr)' : '1fr',
            gap: '16px',
            marginBottom: '20px'
          }}>
            {TEAM_ROLES.map((role, index) => {
              const isExpanded = expandedRole === role.value;
              const isSelected = selectedRole === role.value;

              return (
                <div
                  key={role.value}
                  onClick={() => handleRoleSelect(role.value)}
                  style={{
                    background: tokens.colors.background.card,
                    border: isSelected
                      ? `2px solid ${tokens.colors.brand.primary}`
                      : `1px solid ${tokens.colors.background.cardBorder}`,
                    borderRadius: '16px',
                    padding: '20px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    boxShadow: isSelected ? tokens.glows.primaryStrong : tokens.shadows.md,
                    animation: `fadeInUp 0.6s ease-out ${0.3 + index * 0.05}s backwards`
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.borderColor = tokens.colors.background.cardBorderHover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = tokens.colors.background.cardBorder;
                    }
                  }}
                >
                  {isSelected && (
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: tokens.colors.brand.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      color: '#fff',
                      fontWeight: '700'
                    }}>
                      ✓
                    </div>
                  )}

                  <div style={{
                    fontSize: '48px',
                    textAlign: 'center',
                    marginBottom: '12px'
                  }}>
                    {role.icon}
                  </div>

                  <h3 style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: '700',
                    color: tokens.colors.text.primaryBright,
                    marginBottom: '8px',
                    textAlign: 'center'
                  }}>
                    {role.label}
                  </h3>

                  <p style={{
                    margin: 0,
                    fontSize: '14px',
                    color: tokens.colors.text.primary,
                    lineHeight: '1.5',
                    marginBottom: isExpanded ? '16px' : '0'
                  }}>
                    {role.description}
                  </p>

                  {isExpanded && (
                    <div style={{
                      marginTop: '16px',
                      paddingTop: '16px',
                      borderTop: `1px solid ${tokens.colors.border.default}`,
                      animation: 'fadeIn 0.3s ease-out'
                    }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: tokens.colors.text.primary,
                        marginBottom: '8px'
                      }}>
                        אחריות עיקרית:
                      </div>
                      <ul style={{
                        margin: 0,
                        padding: '0 0 0 16px',
                        fontSize: '12px',
                        color: tokens.colors.text.secondary,
                        lineHeight: '1.6'
                      }}>
                        {role.responsibilities.slice(0, 3).map((resp, i) => (
                          <li key={i}>{resp}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div style={{
                    textAlign: 'center',
                    marginTop: '12px',
                    fontSize: '11px',
                    color: tokens.colors.text.secondary,
                    fontWeight: '600'
                  }}>
                    {isExpanded ? '▲ הסתר' : '▼ לחץ לפרטים'}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Role Details */}
        {currentStep === 'role_details' && selectedRoleData && (
          <div style={{
            background: tokens.colors.background.card,
            border: `1px solid ${tokens.colors.background.cardBorder}`,
            borderRadius: '20px',
            padding: '28px',
            marginBottom: '20px',
            boxShadow: tokens.shadows.md
          }}>
            <div style={{
              textAlign: 'center',
              marginBottom: '24px'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '12px' }}>
                {selectedRoleData.icon}
              </div>
              <h3 style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: '700',
                color: tokens.colors.text.primaryBright,
                marginBottom: '8px'
              }}>
                {selectedRoleData.label}
              </h3>
              <p style={{
                margin: 0,
                fontSize: '15px',
                color: tokens.colors.text.primary
              }}>
                {selectedRoleData.description}
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h4 style={{
                margin: '0 0 12px 0',
                fontSize: '16px',
                fontWeight: '700',
                color: tokens.colors.text.primaryBright,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>📋</span>
                אחריות ומשימות עיקריות
              </h4>
              <ul style={{
                margin: 0,
                padding: '0 0 0 20px',
                fontSize: '14px',
                color: tokens.colors.text.primary,
                lineHeight: '1.8'
              }}>
                {selectedRoleData.responsibilities.map((resp, i) => (
                  <li key={i} style={{ marginBottom: '6px' }}>{resp}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 style={{
                margin: '0 0 12px 0',
                fontSize: '16px',
                fontWeight: '700',
                color: tokens.colors.text.primaryBright,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>✅</span>
                דרישות ומיומנויות
              </h4>
              <ul style={{
                margin: 0,
                padding: '0 0 0 20px',
                fontSize: '14px',
                color: tokens.colors.text.primary,
                lineHeight: '1.8'
              }}>
                {selectedRoleData.requirements.map((req, i) => (
                  <li key={i} style={{ marginBottom: '6px' }}>{req}</li>
                ))}
              </ul>
            </div>

            <div style={{
              marginTop: '24px',
              padding: '16px',
              background: 'rgba(77, 208, 225, 0.15)',
              border: '1px solid rgba(77, 208, 225, 0.3)',
              borderRadius: '12px'
            }}>
              <div style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start'
              }}>
                <div style={{ fontSize: '24px' }}>💡</div>
                <div style={{ flex: 1 }}>
                  <p style={{
                    margin: 0,
                    fontSize: '13px',
                    color: tokens.colors.text.primary,
                    lineHeight: '1.6'
                  }}>
                    בקשתך תישלח למנהל העסק לאישור. תקבל הודעה ברגע שהבקשה תאושר ותוכל להתחיל לעבוד.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submitting */}
        {currentStep === 'submitting' && (
          <div style={{
            background: tokens.colors.background.card,
            border: `1px solid ${tokens.colors.background.cardBorder}`,
            borderRadius: '20px',
            padding: '60px 28px',
            textAlign: 'center',
            boxShadow: tokens.shadows.md
          }}>
            <div style={{
              fontSize: '72px',
              marginBottom: '20px',
              animation: 'pulse 1.5s ease-in-out infinite'
            }}>
              📨
            </div>
            <h3 style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: '700',
              color: tokens.colors.text.primaryBright,
              marginBottom: '12px'
            }}>
              שולח בקשה...
            </h3>
            <p style={{
              margin: 0,
              fontSize: '15px',
              color: tokens.colors.text.secondary
            }}>
              הבקשה נשלחת למנהל לאישור
            </p>
          </div>
        )}

        {/* Navigation Buttons */}
        {currentStep !== 'submitting' && (
          <div style={{
            display: 'flex',
            gap: '12px'
          }}>
            <button
              onClick={handleBack}
              style={{
                flex: 1,
                padding: '16px',
                background: 'transparent',
                border: `1px solid ${tokens.colors.border.default}`,
                borderRadius: '14px',
                color: tokens.colors.text.primary,
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = tokens.colors.background.cardBorderHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = tokens.colors.border.default;
              }}
            >
              → חזור
            </button>

            <button
              onClick={handleNext}
              disabled={!selectedRole}
              style={{
                flex: 2,
                padding: '16px',
                background: selectedRole
                  ? 'linear-gradient(120deg, #4dd0e1, #26c6da)'
                  : tokens.colors.background.secondary,
                border: 'none',
                borderRadius: '14px',
                color: selectedRole ? '#ffffff' : tokens.colors.text.hint,
                fontSize: '16px',
                fontWeight: '700',
                cursor: selectedRole ? 'pointer' : 'not-allowed',
                opacity: selectedRole ? 1 : 0.5,
                boxShadow: selectedRole ? '0 6px 20px rgba(77, 208, 225, 0.5)' : 'none',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (selectedRole) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(77, 208, 225, 0.6)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedRole) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(77, 208, 225, 0.5)';
                }
              }}
            >
              {currentStep === 'role_details' ? 'שלח בקשה' : 'המשך ←'}
            </button>
          </div>
        )}
      </div>

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
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  );
}
