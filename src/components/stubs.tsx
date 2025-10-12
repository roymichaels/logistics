import React, { ReactNode } from 'react';

export const BottomNavigation: React.FC<any> = () => null;

export const ErrorDisplay: React.FC<any> = ({ error, theme }) => (
  <div style={{
    padding: '20px',
    textAlign: 'center',
    direction: 'rtl',
    backgroundColor: theme?.bg_color || '#fff',
    color: theme?.text_color || '#000'
  }}>
    <h2>שגיאה</h2>
    <p>{error}</p>
  </div>
);

export const OrderCreationWizard: React.FC<any> = () => null;
export const DualModeOrderEntry: React.FC<any> = () => null;
export const BusinessManager: React.FC<any> = () => null;
export const SuperadminSetup: React.FC<any> = () => null;
export const FloatingActionMenu: React.FC<any> = () => null;
export const Header: React.FC<any> = () => null;

export const SecurityGate: React.FC<{ children: ReactNode; userId: string; telegramId: string | number; onSecurityError: (error: string) => void }> = ({ children }) => <>{children}</>;

export const RightSidebarMenu: React.FC<any> = () => null;
export const SidebarToggleButton: React.FC<any> = () => null;

export const debugLog = {
  error: (message: string, error?: any) => console.error(message, error),
  info: (message: string) => console.log(message),
  warn: (message: string) => console.warn(message)
};
