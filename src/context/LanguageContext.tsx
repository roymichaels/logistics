import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { hebrew } from '../lib/i18n';
import { english } from '../lib/i18n';
import { supabase } from '../lib/supabaseClient';

type Language = 'he' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof hebrew;
  isRTL: boolean;
  formatDate: (date: string | Date) => string;
  formatTime: (date: string | Date) => string;
  formatCurrency: (amount: number) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => {
    // Check localStorage first
    const stored = localStorage.getItem('app_language');
    return (stored === 'en' || stored === 'he') ? stored : 'he'; // Default to Hebrew
  });

  const translations = language === 'he' ? hebrew : english;
  const isRTL = language === 'he';

  // Update document direction when language changes
  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language, isRTL]);

  // Save to localStorage and database when language changes
  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);

    // Try to save to database if user is logged in
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('users')
          .update({ language_preference: lang })
          .eq('id', user.id);
      }
    } catch (error) {
      logger.warn('Failed to save language preference to database:', error);
      // Non-critical error, continue with localStorage
    }
  };

  // Load language preference from database on mount
  useEffect(() => {
    const loadUserLanguagePreference = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('users')
            .select('language_preference')
            .eq('id', user.id)
            .single();

          if (!error && data?.language_preference) {
            const dbLang = data.language_preference as Language;
            if (dbLang !== language) {
              setLanguageState(dbLang);
              localStorage.setItem('app_language', dbLang);
            }
          }
        }
      } catch (error) {
        logger.warn('Failed to load language preference from database:', error);
        // Continue with localStorage value
      }
    };

    loadUserLanguagePreference();
  }, []);

  const contextValue: LanguageContextType = {
    language,
    setLanguage,
    t: translations,
    isRTL,
    formatDate: language === 'he' ? hebrew.formatDate : english.formatDate,
    formatTime: language === 'he' ? hebrew.formatTime : english.formatTime,
    formatCurrency: language === 'he' ? hebrew.formatCurrency : english.formatCurrency
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Export a hook for easy access to translations
export function useTranslations() {
  const { t } = useLanguage();
  return t;
}
