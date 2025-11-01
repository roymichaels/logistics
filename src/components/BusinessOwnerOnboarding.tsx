import React, { useState, useEffect } from 'react';
import { DataStore, BusinessType } from '../data/types';
import { ROYAL_COLORS } from '../styles/royalTheme';
import { telegram } from '../lib/telegram';
import { Toast } from './Toast';
import { waitForSupabaseInit } from '../lib/supabaseClient';
import { useSupabaseReady } from '../context/SupabaseReadyContext';

interface BusinessOwnerOnboardingProps {
  dataStore: DataStore;
  onComplete: () => void;
  onBack: () => void;
}

type OnboardingStep = 'business_type' | 'business_details' | 'branding' | 'completing';

interface FormErrors {
  businessType?: string;
  businessName?: string;
  businessNameHebrew?: string;
  orderPrefix?: string;
}

interface FormData {
  selectedType: string;
  businessName: string;
  businessNameHebrew: string;
  orderPrefix: string;
  primaryColor: string;
  secondaryColor: string;
}

const DEFAULT_COLORS = [
  { primary: '#9c6dff', secondary: '#7b3ff2', name: 'סגול מלכותי' },
  { primary: '#f6c945', secondary: '#e5b834', name: 'זהב' },
  { primary: '#ff6b8a', secondary: '#ff4d73', name: 'אדום' },
  { primary: '#4dd0e1', secondary: '#26c6da', name: 'תכלת' },
  { primary: '#4ade80', secondary: '#22c55e', name: 'ירוק' },
  { primary: '#ff9500', secondary: '#ff8800', name: 'כתום' }
];

export function BusinessOwnerOnboarding({ dataStore, onComplete, onBack }: BusinessOwnerOnboardingProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('business_type');
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const { isSupabaseReady } = useSupabaseReady();

  // Form state
  const [selectedType, setSelectedType] = useState<string>('');
  const [businessName, setBusinessName] = useState('');
  const [businessNameHebrew, setBusinessNameHebrew] = useState('');
  const [orderPrefix, setOrderPrefix] = useState('');
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_COLORS[0].primary);
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_COLORS[0].secondary);

  // Load form data from localStorage if available
  useEffect(() => {
    const savedData = localStorage.getItem('business_onboarding_draft');
    if (savedData) {
      try {
        const parsed: FormData = JSON.parse(savedData);
        setSelectedType(parsed.selectedType || '');
        setBusinessName(parsed.businessName || '');
        setBusinessNameHebrew(parsed.businessNameHebrew || '');
        setOrderPrefix(parsed.orderPrefix || '');
        setPrimaryColor(parsed.primaryColor || DEFAULT_COLORS[0].primary);
        setSecondaryColor(parsed.secondaryColor || DEFAULT_COLORS[0].secondary);
        console.log('✅ Restored draft business data from localStorage');
      } catch (error) {
        console.error('Failed to restore draft data:', error);
      }
    }
  }, []);

  // Auto-save form data to localStorage
  useEffect(() => {
    const formData: FormData = {
      selectedType,
      businessName,
      businessNameHebrew,
      orderPrefix,
      primaryColor,
      secondaryColor
    };
    localStorage.setItem('business_onboarding_draft', JSON.stringify(formData));
  }, [selectedType, businessName, businessNameHebrew, orderPrefix, primaryColor, secondaryColor]);

  useEffect(() => {
    initializeOnboarding();
  }, [isSupabaseReady]);

  const initializeOnboarding = async () => {
    if (!isSupabaseReady) {
      console.log('⏳ BusinessOwnerOnboarding: Waiting for Supabase...');
      return;
    }

    try {
      setLoading(true);
      setInitError(null);

      const supabaseClient = dataStore.supabase;
      if (!supabaseClient) {
        await waitForSupabaseInit(15000, 200);
      }

      await loadBusinessTypes();
      setIsInitialized(true);
    } catch (error) {
      console.error('❌ BusinessOwnerOnboarding: Initialization failed:', error);
      setInitError('שגיאה באתחול המערכת. אנא נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  const loadBusinessTypes = async () => {
    try {
      const types = await dataStore.listBusinessTypes?.() || [];
      setBusinessTypes(types.filter(t => t.active));
      if (types.length === 0) {
        console.warn('⚠️ No business types found, using defaults');
        setBusinessTypes([
          {
            id: 'default-logistics',
            type_value: 'logistics',
            label_hebrew: 'לוגיסטיקה',
            label_english: 'Logistics',
            icon: '🚚',
            description: 'ניהול הפצה ומשלוחים',
            active: true,
            display_order: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: null
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to load business types:', error);
      Toast.error('שגיאה בטעינת סוגי עסקים');
      throw error;
    }
  };

  const validateStep = (step: OnboardingStep): boolean => {
    const newErrors: FormErrors = {};

    if (step === 'business_type') {
      if (!selectedType) {
        newErrors.businessType = 'חובה לבחור סוג עסק';
      }
    } else if (step === 'business_details') {
      if (!businessName.trim()) {
        newErrors.businessName = 'חובה להזין שם עסק באנגלית';
      } else if (businessName.length < 2) {
        newErrors.businessName = 'שם העסק חייב להכיל לפחות 2 תווים';
      }

      if (!businessNameHebrew.trim()) {
        newErrors.businessNameHebrew = 'חובה להזין שם עסק בעברית';
      } else if (businessNameHebrew.length < 2) {
        newErrors.businessNameHebrew = 'שם העסק חייב להכיל לפחות 2 תווים';
      }

      if (!orderPrefix.trim()) {
        newErrors.orderPrefix = 'חובה להזין קידומת להזמנות';
      } else if (orderPrefix.length < 2 || orderPrefix.length > 4) {
        newErrors.orderPrefix = 'הקידומת חייבת להיות בין 2-4 תווים';
      } else if (!/^[A-Z0-9]+$/.test(orderPrefix)) {
        newErrors.orderPrefix = 'הקידומת יכולה להכיל רק אותיות אנגליות גדולות ומספרים';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    telegram.hapticFeedback('impact', 'light');

    if (currentStep === 'business_type') {
      if (!validateStep('business_type')) {
        Toast.error('אנא בחר סוג עסק');
        return;
      }
      setCurrentStep('business_details');
    } else if (currentStep === 'business_details') {
      if (!validateStep('business_details')) {
        Toast.error('אנא תקן את השגיאות בטופס');
        return;
      }
      setCurrentStep('branding');
    } else if (currentStep === 'branding') {
      handleCreateBusiness();
    }
  };

  const handleBack = () => {
    telegram.hapticFeedback('impact', 'light');

    if (currentStep === 'business_type') {
      onBack();
    } else if (currentStep === 'business_details') {
      setCurrentStep('business_type');
    } else if (currentStep === 'branding') {
      setCurrentStep('business_details');
    }
  };

  const handleCreateBusiness = async () => {
    try {
      setCurrentStep('completing');
      telegram.hapticFeedback('impact', 'medium');

      console.log('🔄 Creating business with data:', {
        name: businessName,
        name_hebrew: businessNameHebrew,
        business_type: selectedType,
        order_number_prefix: orderPrefix
      });

      if (!dataStore.createBusiness) {
        throw new Error('createBusiness method not available');
      }

      const result = await dataStore.createBusiness({
        name: businessName,
        name_hebrew: businessNameHebrew,
        business_type: selectedType,
        order_number_prefix: orderPrefix.toUpperCase(),
        default_currency: 'ILS',
        primary_color: primaryColor,
        secondary_color: secondaryColor
      });

      console.log('✅ Business created successfully:', result);

      // Clear the draft from localStorage
      localStorage.removeItem('business_onboarding_draft');

      telegram.hapticFeedback('notification', 'success');
      Toast.success('העסק נוצר בהצלחה!');

      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (error) {
      console.error('❌ Failed to create business:', error);
      const errorMessage = error instanceof Error ? error.message : 'שגיאה ביצירת העסק';
      Toast.error(errorMessage);
      telegram.hapticFeedback('notification', 'error');
      setCurrentStep('branding');
    }
  };

  const selectColor = (color: { primary: string; secondary: string }) => {
    setPrimaryColor(color.primary);
    setSecondaryColor(color.secondary);
    telegram.hapticFeedback('impact', 'light');
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'business_type':
        return 'בחר סוג עסק';
      case 'business_details':
        return 'פרטי העסק';
      case 'branding':
        return 'מיתוג ועיצוב';
      case 'completing':
        return 'יוצר את העסק...';
      default:
        return '';
    }
  };

  const getStepNumber = () => {
    switch (currentStep) {
      case 'business_type':
        return 1;
      case 'business_details':
        return 2;
      case 'branding':
        return 3;
      default:
        return 3;
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'radial-gradient(125% 125% at 50% 0%, rgba(95, 46, 170, 0.55) 0%, rgba(12, 2, 25, 0.95) 45%, #03000a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: ROYAL_COLORS.text,
        direction: 'rtl'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <div>טוען...</div>
        </div>
      </div>
    );
  }

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
        background: 'radial-gradient(80% 80% at 80% 10%, rgba(246, 201, 69, 0.08) 0%, rgba(20, 6, 58, 0) 60%)',
        pointerEvents: 'none'
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '700px', margin: '0 auto' }}>
        {/* Header with progress */}
        {currentStep !== 'completing' && (
          <div style={{ marginBottom: '32px' }}>
            {/* Progress bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '20px',
              gap: '8px'
            }}>
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  style={{
                    flex: 1,
                    height: '4px',
                    background: step <= getStepNumber()
                      ? 'linear-gradient(90deg, #9c6dff, #f6c945)'
                      : 'rgba(156, 109, 255, 0.2)',
                    borderRadius: '2px',
                    transition: 'all 0.3s ease'
                  }}
                />
              ))}
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏢</div>
              <h2 style={{
                margin: 0,
                fontSize: '28px',
                fontWeight: '700',
                color: ROYAL_COLORS.textBright,
                marginBottom: '8px'
              }}>
                {getStepTitle()}
              </h2>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: ROYAL_COLORS.muted
              }}>
                שלב {getStepNumber()} מתוך 3
              </p>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div style={{
          background: ROYAL_COLORS.card,
          border: `1px solid ${ROYAL_COLORS.cardBorder}`,
          borderRadius: '20px',
          padding: '28px',
          marginBottom: '20px',
          boxShadow: ROYAL_COLORS.shadow
        }}>
          {/* Business Type Selection */}
          {currentStep === 'business_type' && (
            <div>
              <p style={{
                margin: '0 0 20px 0',
                fontSize: '15px',
                color: ROYAL_COLORS.text,
                lineHeight: '1.6'
              }}>
                בחר את סוג העסק שלך. זה יעזור לנו להתאים את המערכת לצרכים שלך.
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: window.innerWidth > 600 ? 'repeat(2, 1fr)' : '1fr',
                gap: '12px'
              }}>
                {businessTypes.map((type) => {
                  const isSelected = selectedType === type.type_value;
                  return (
                    <div
                      key={type.id}
                      onClick={() => {
                        setSelectedType(type.type_value);
                        telegram.hapticFeedback('impact', 'light');
                      }}
                      style={{
                        padding: '20px',
                        borderRadius: '12px',
                        border: isSelected
                          ? `2px solid ${ROYAL_COLORS.primary}`
                          : `1px solid ${ROYAL_COLORS.border}`,
                        background: isSelected
                          ? 'rgba(156, 109, 255, 0.15)'
                          : ROYAL_COLORS.secondary,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        position: 'relative'
                      }}
                    >
                      {isSelected && (
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          fontSize: '16px',
                          color: ROYAL_COLORS.primary
                        }}>
                          ✓
                        </div>
                      )}
                      <div style={{
                        fontSize: '32px',
                        marginBottom: '8px',
                        textAlign: 'center'
                      }}>
                        {type.icon || '🏢'}
                      </div>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: ROYAL_COLORS.text,
                        textAlign: 'center',
                        marginBottom: '4px'
                      }}>
                        {type.label_hebrew}
                      </div>
                      {type.description && (
                        <div style={{
                          fontSize: '13px',
                          color: ROYAL_COLORS.muted,
                          textAlign: 'center'
                        }}>
                          {type.description}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Business Details */}
          {currentStep === 'business_details' && (
            <div>
              <p style={{
                margin: '0 0 24px 0',
                fontSize: '15px',
                color: ROYAL_COLORS.text,
                lineHeight: '1.6'
              }}>
                מלא את פרטי העסק שלך
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: ROYAL_COLORS.text,
                    marginBottom: '8px'
                  }}>
                    שם העסק (אנגלית)
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => {
                      setBusinessName(e.target.value);
                      if (errors.businessName) {
                        setErrors({ ...errors, businessName: undefined });
                      }
                    }}
                    placeholder="Business Name"
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '12px',
                      border: `1px solid ${errors.businessName ? '#ff6b8a' : ROYAL_COLORS.border}`,
                      background: ROYAL_COLORS.secondary,
                      color: ROYAL_COLORS.text,
                      fontSize: '15px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = errors.businessName ? '#ff6b8a' : ROYAL_COLORS.primary;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = errors.businessName ? '#ff6b8a' : ROYAL_COLORS.border;
                    }}
                  />
                  {errors.businessName && (
                    <p style={{
                      margin: '6px 0 0 0',
                      fontSize: '12px',
                      color: '#ff6b8a'
                    }}>
                      {errors.businessName}
                    </p>
                  )}
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: ROYAL_COLORS.text,
                    marginBottom: '8px'
                  }}>
                    שם העסק (עברית)
                  </label>
                  <input
                    type="text"
                    value={businessNameHebrew}
                    onChange={(e) => {
                      setBusinessNameHebrew(e.target.value);
                      if (errors.businessNameHebrew) {
                        setErrors({ ...errors, businessNameHebrew: undefined });
                      }
                    }}
                    placeholder="שם העסק"
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '12px',
                      border: `1px solid ${errors.businessNameHebrew ? '#ff6b8a' : ROYAL_COLORS.border}`,
                      background: ROYAL_COLORS.secondary,
                      color: ROYAL_COLORS.text,
                      fontSize: '15px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      direction: 'rtl'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = errors.businessNameHebrew ? '#ff6b8a' : ROYAL_COLORS.primary;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = errors.businessNameHebrew ? '#ff6b8a' : ROYAL_COLORS.border;
                    }}
                  />
                  {errors.businessNameHebrew && (
                    <p style={{
                      margin: '6px 0 0 0',
                      fontSize: '12px',
                      color: '#ff6b8a',
                      direction: 'rtl'
                    }}>
                      {errors.businessNameHebrew}
                    </p>
                  )}
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: ROYAL_COLORS.text,
                    marginBottom: '8px'
                  }}>
                    קידומת מספר הזמנה
                  </label>
                  <input
                    type="text"
                    value={orderPrefix}
                    onChange={(e) => {
                      setOrderPrefix(e.target.value.toUpperCase().slice(0, 4));
                      if (errors.orderPrefix) {
                        setErrors({ ...errors, orderPrefix: undefined });
                      }
                    }}
                    placeholder="ORD"
                    maxLength={4}
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '12px',
                      border: `1px solid ${errors.orderPrefix ? '#ff6b8a' : ROYAL_COLORS.border}`,
                      background: ROYAL_COLORS.secondary,
                      color: ROYAL_COLORS.text,
                      fontSize: '15px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      textTransform: 'uppercase'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = errors.orderPrefix ? '#ff6b8a' : ROYAL_COLORS.primary;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = errors.orderPrefix ? '#ff6b8a' : ROYAL_COLORS.border;
                    }}
                  />
                  {errors.orderPrefix ? (
                    <p style={{
                      margin: '6px 0 0 0',
                      fontSize: '12px',
                      color: '#ff6b8a',
                      direction: 'rtl'
                    }}>
                      {errors.orderPrefix}
                    </p>
                  ) : (
                    <p style={{
                      margin: '6px 0 0 0',
                      fontSize: '12px',
                      color: ROYAL_COLORS.muted
                    }}>
                      לדוגמה: {orderPrefix || 'ORD'}-0001, {orderPrefix || 'ORD'}-0002
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Branding */}
          {currentStep === 'branding' && (
            <div>
              <p style={{
                margin: '0 0 24px 0',
                fontSize: '15px',
                color: ROYAL_COLORS.text,
                lineHeight: '1.6'
              }}>
                בחר צבעי מותג לעסק שלך
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px'
              }}>
                {DEFAULT_COLORS.map((color, index) => {
                  const isSelected = primaryColor === color.primary;
                  return (
                    <div
                      key={index}
                      onClick={() => selectColor(color)}
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        border: isSelected
                          ? `2px solid ${color.primary}`
                          : `1px solid ${ROYAL_COLORS.border}`,
                        background: `linear-gradient(135deg, ${color.primary}40, ${color.secondary}20)`,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        position: 'relative'
                      }}
                    >
                      {isSelected && (
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          fontSize: '16px',
                          color: color.primary
                        }}>
                          ✓
                        </div>
                      )}
                      <div style={{
                        width: '100%',
                        height: '40px',
                        borderRadius: '8px',
                        background: `linear-gradient(135deg, ${color.primary}, ${color.secondary})`,
                        marginBottom: '8px'
                      }} />
                      <div style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: ROYAL_COLORS.text,
                        textAlign: 'center'
                      }}>
                        {color.name}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Preview */}
              <div style={{
                marginTop: '24px',
                padding: '20px',
                borderRadius: '12px',
                background: `linear-gradient(135deg, ${primaryColor}20, ${secondaryColor}10)`,
                border: `1px solid ${primaryColor}40`
              }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: ROYAL_COLORS.text,
                  marginBottom: '12px'
                }}>
                  תצוגה מקדימה:
                </div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: primaryColor,
                  marginBottom: '8px'
                }}>
                  {businessNameHebrew || 'שם העסק'}
                </div>
                <div style={{
                  display: 'inline-block',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  הזמנה #{orderPrefix || 'ORD'}-0001
                </div>
              </div>
            </div>
          )}

          {/* Completing */}
          {currentStep === 'completing' && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{
                fontSize: '72px',
                marginBottom: '20px',
                animation: 'pulse 1.5s ease-in-out infinite'
              }}>
                🎉
              </div>
              <h3 style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: '700',
                color: ROYAL_COLORS.textBright,
                marginBottom: '12px'
              }}>
                יוצר את העסק שלך...
              </h3>
              <p style={{
                margin: 0,
                fontSize: '15px',
                color: ROYAL_COLORS.muted
              }}>
                רק עוד רגע...
              </p>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        {currentStep !== 'completing' && (
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
                border: `1px solid ${ROYAL_COLORS.border}`,
                borderRadius: '14px',
                color: ROYAL_COLORS.text,
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = ROYAL_COLORS.cardBorderHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = ROYAL_COLORS.border;
              }}
            >
              → חזור
            </button>

            <button
              onClick={handleNext}
              style={{
                flex: 2,
                padding: '16px',
                background: 'linear-gradient(120deg, #9c6dff, #f6c945)',
                border: 'none',
                borderRadius: '14px',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(156, 109, 255, 0.5)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(156, 109, 255, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(156, 109, 255, 0.5)';
              }}
            >
              {currentStep === 'branding' ? 'צור עסק' : 'המשך ←'}
            </button>
          </div>
        )}
      </div>

      <style>{`
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
