import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { i18n, hebrew, english, type Language } from '../lib/i18n';

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
    const lang = (stored === 'en' || stored === 'he') ? stored : 'he'; // Default to Hebrew
    // Initialize i18n service with stored language
    i18n.setLanguage(lang);
    return lang;
  });

  const translations = language === 'he' ? hebrew : english;
  const isRTL = language === 'he';

  // Update document direction when language changes
  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language, isRTL]);

  // Save to localStorage (frontend-only mode)
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    i18n.setLanguage(lang);
    localStorage.setItem('app_language', lang);
  };

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
