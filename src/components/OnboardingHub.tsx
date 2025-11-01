import React, { useState } from 'react';
import { User } from '../data/types';
import { ROYAL_COLORS } from '../styles/royalTheme';

type OnboardingPathway = 'business_owner' | 'team_member' | 'browse' | null;

interface OnboardingHubProps {
  onSelectPathway: (pathway: OnboardingPathway) => void;
  onSkip?: () => void;
}

interface PathwayCard {
  id: OnboardingPathway;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  benefits: string[];
  color: string;
  gradient: string;
}

const PATHWAYS: PathwayCard[] = [
  {
    id: 'business_owner',
    icon: '🏢',
    title: 'יצירת עסק חדש',
    subtitle: 'אני בעל עסק',
    description: 'צור ונהל את העסק שלך עם מערכת לוגיסטיקה מקצועית',
    benefits: [
      'ניהול מלא של העסק והצוות',
      'מעקב פיננסי ודוחות מפורטים',
      'שליטה בכל היבטי התפעול',
      'הקמת צוות והקצאת תפקידים'
    ],
    color: '#f6c945',
    gradient: 'linear-gradient(135deg, rgba(246, 201, 69, 0.3), rgba(246, 201, 69, 0.1))'
  },
  {
    id: 'team_member',
    icon: '👥',
    title: 'הצטרפות לצוות',
    subtitle: 'אני נהג, מחסנאי או איש צוות',
    description: 'הצטרף לארגון קיים והתחל לעבוד מיד',
    benefits: [
      'קבלת משימות ומשלוחים',
      'מעקב אחר הביצועים שלך',
      'תקשורת עם הצוות',
      'קבלת תגמול והעדפות'
    ],
    color: '#4dd0e1',
    gradient: 'linear-gradient(135deg, rgba(77, 208, 225, 0.3), rgba(77, 208, 225, 0.1))'
  }
];

export function OnboardingHub({ onSelectPathway, onSkip }: OnboardingHubProps) {
  const [selectedPathway, setSelectedPathway] = useState<OnboardingPathway>(null);
  const [expandedCard, setExpandedCard] = useState<OnboardingPathway>(null);

  const handleCardClick = (pathwayId: OnboardingPathway) => {
    if (expandedCard === pathwayId) {
      setExpandedCard(null);
    } else {
      setExpandedCard(pathwayId);
      setSelectedPathway(pathwayId);
    }
  };

  const handleContinue = () => {
    if (selectedPathway) {
      onSelectPathway(selectedPathway);
    }
  };

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
      {/* Background decorative elements */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(80% 80% at 80% 10%, rgba(246, 201, 69, 0.08) 0%, rgba(20, 6, 58, 0) 60%), radial-gradient(65% 65% at 15% 20%, rgba(157, 78, 221, 0.18) 0%, rgba(38, 12, 85, 0) 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px',
          paddingTop: '20px'
        }}>
          <div style={{
            fontSize: '72px',
            marginBottom: '20px',
            animation: 'fadeInUp 0.8s ease-out'
          }}>
            🎯
          </div>
          <h1 style={{
            margin: 0,
            fontSize: '36px',
            fontWeight: '700',
            color: ROYAL_COLORS.textBright,
            marginBottom: '12px',
            animation: 'fadeInUp 0.8s ease-out 0.1s backwards'
          }}>
            ברוכים הבאים למערכת!
          </h1>
          <p style={{
            margin: 0,
            fontSize: '18px',
            color: ROYAL_COLORS.muted,
            lineHeight: '1.6',
            maxWidth: '600px',
            marginLeft: 'auto',
            marginRight: 'auto',
            animation: 'fadeInUp 0.8s ease-out 0.2s backwards'
          }}>
            בחרו את המסלול המתאים לכם כדי להתחיל
          </p>
        </div>

        {/* Pathway Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: window.innerWidth > 768 ? 'repeat(2, 1fr)' : '1fr',
          gap: '20px',
          marginBottom: '30px'
        }}>
          {PATHWAYS.map((pathway, index) => {
            const isExpanded = expandedCard === pathway.id;
            const isSelected = selectedPathway === pathway.id;

            return (
              <div
                key={pathway.id}
                onClick={() => handleCardClick(pathway.id)}
                style={{
                  background: pathway.gradient,
                  border: isSelected
                    ? `2px solid ${pathway.color}`
                    : `1px solid ${ROYAL_COLORS.cardBorder}`,
                  borderRadius: '20px',
                  padding: '28px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: isSelected
                    ? `0 8px 30px ${pathway.color}40`
                    : ROYAL_COLORS.shadow,
                  transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                  animation: `fadeInUp 0.8s ease-out ${0.3 + index * 0.1}s backwards`,
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = `0 12px 40px ${pathway.color}30`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = ROYAL_COLORS.shadow;
                  }
                }}
              >
                {/* Selection indicator */}
                {isSelected && (
                  <div style={{
                    position: 'absolute',
                    top: '16px',
                    left: '16px',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: pathway.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    color: '#000',
                    fontWeight: '700',
                    boxShadow: `0 4px 12px ${pathway.color}60`
                  }}>
                    ✓
                  </div>
                )}

                {/* Icon */}
                <div style={{
                  fontSize: '56px',
                  marginBottom: '16px',
                  textAlign: 'center'
                }}>
                  {pathway.icon}
                </div>

                {/* Title */}
                <h3 style={{
                  margin: 0,
                  fontSize: '24px',
                  fontWeight: '700',
                  color: ROYAL_COLORS.textBright,
                  marginBottom: '8px',
                  textAlign: 'center'
                }}>
                  {pathway.title}
                </h3>

                {/* Subtitle */}
                <p style={{
                  margin: 0,
                  fontSize: '15px',
                  color: pathway.color,
                  fontWeight: '600',
                  marginBottom: '16px',
                  textAlign: 'center'
                }}>
                  {pathway.subtitle}
                </p>

                {/* Description */}
                <p style={{
                  margin: 0,
                  fontSize: '15px',
                  color: ROYAL_COLORS.text,
                  lineHeight: '1.6',
                  marginBottom: isExpanded ? '20px' : '0'
                }}>
                  {pathway.description}
                </p>

                {/* Expanded Benefits */}
                {isExpanded && (
                  <div style={{
                    animation: 'fadeIn 0.3s ease-out',
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: `1px solid ${pathway.color}40`
                  }}>
                    <h4 style={{
                      margin: '0 0 12px 0',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: ROYAL_COLORS.textBright
                    }}>
                      מה מקבלים:
                    </h4>
                    <ul style={{
                      margin: 0,
                      padding: '0 0 0 20px',
                      fontSize: '14px',
                      color: ROYAL_COLORS.text,
                      lineHeight: '1.8'
                    }}>
                      {pathway.benefits.map((benefit, i) => (
                        <li key={i} style={{ marginBottom: '8px' }}>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Expand indicator */}
                <div style={{
                  textAlign: 'center',
                  marginTop: '16px',
                  fontSize: '12px',
                  color: ROYAL_COLORS.muted,
                  fontWeight: '600'
                }}>
                  {isExpanded ? '▲ לחץ להסתרת פרטים' : '▼ לחץ לפרטים נוספים'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          animation: 'fadeInUp 0.8s ease-out 0.6s backwards'
        }}>
          <button
            onClick={handleContinue}
            disabled={!selectedPathway}
            style={{
              width: '100%',
              padding: '18px',
              background: selectedPathway
                ? 'linear-gradient(120deg, #9c6dff, #f6c945)'
                : ROYAL_COLORS.secondary,
              border: 'none',
              borderRadius: '16px',
              color: selectedPathway ? '#ffffff' : ROYAL_COLORS.hint,
              fontSize: '18px',
              fontWeight: '700',
              cursor: selectedPathway ? 'pointer' : 'not-allowed',
              opacity: selectedPathway ? 1 : 0.5,
              boxShadow: selectedPathway ? '0 6px 20px rgba(156, 109, 255, 0.5)' : 'none',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              if (selectedPathway) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(156, 109, 255, 0.6)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedPathway) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(156, 109, 255, 0.5)';
              }
            }}
          >
            {selectedPathway ? 'המשך ←' : 'בחר מסלול כדי להמשיך'}
          </button>

          {onSkip && (
            <button
              onClick={onSkip}
              style={{
                width: '100%',
                padding: '14px',
                background: 'transparent',
                border: `1px solid ${ROYAL_COLORS.border}`,
                borderRadius: '14px',
                color: ROYAL_COLORS.muted,
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = ROYAL_COLORS.cardBorderHover;
                e.currentTarget.style.color = ROYAL_COLORS.text;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = ROYAL_COLORS.border;
                e.currentTarget.style.color = ROYAL_COLORS.muted;
              }}
            >
              דלג לעכשיו
            </button>
          )}
        </div>

        {/* Info box */}
        <div style={{
          marginTop: '30px',
          padding: '20px',
          background: 'rgba(156, 109, 255, 0.1)',
          border: `1px solid ${ROYAL_COLORS.cardBorder}`,
          borderRadius: '14px',
          textAlign: 'center',
          animation: 'fadeIn 1s ease-out 0.8s backwards'
        }}>
          <div style={{
            fontSize: '24px',
            marginBottom: '8px'
          }}>
            💡
          </div>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: ROYAL_COLORS.muted,
            lineHeight: '1.6'
          }}>
            תוכל תמיד לשנות את ההגדרות והתפקיד שלך מדף ההגדרות
          </p>
        </div>
      </div>

      {/* Animations */}
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
      `}</style>
    </div>
  );
}
