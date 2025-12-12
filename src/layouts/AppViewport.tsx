import React from 'react';
import { migrationFlags } from '../migration/flags';

type Props = {
  children: React.ReactNode;
};

/**
 * Universal viewport wrapper that constrains width, centers content,
 * and prevents horizontal overflow across layouts.
 */
export function AppViewport({ children }: Props) {
  if (migrationFlags.unifiedShell || migrationFlags.unifiedApp) {
    return null;
  }
  return (
    <div
      style={{
        width: '100%',
        maxWidth: '100%',
        margin: 0,
        padding: '0 16px',
        overflowX: 'hidden',
      }}
      className="app-viewport"
    >
      {children}
    </div>
  );
}

export default AppViewport;
