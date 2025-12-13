import React, { createContext, useContext, useState, ReactNode } from 'react';

interface PageTitleContextValue {
  title: string;
  subtitle: string;
  setTitle: (title: string) => void;
  setSubtitle: (subtitle: string) => void;
}

const PageTitleContext = createContext<PageTitleContextValue | null>(null);

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState<string>('');
  const [subtitle, setSubtitle] = useState<string>('');

  return (
    <PageTitleContext.Provider value={{ title, setTitle, subtitle, setSubtitle }}>
      {children}
    </PageTitleContext.Provider>
  );
}

export function usePageTitle() {
  const context = useContext(PageTitleContext);
  if (!context) {
    throw new Error('usePageTitle must be used within PageTitleProvider');
  }
  return context;
}
