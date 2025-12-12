import React from 'react';
import { migrationFlags } from '../../migration/flags';

export type TopbarProps = {
  children?: React.ReactNode;
  [key: string]: any;
};

export const Topbar: React.FC<TopbarProps> = ({ children, ...rest }) => {
  if (migrationFlags.unifiedApp) {
    return null;
  }
  const Element: any = rest.as || (rest.href ? 'a' : rest.asElement || 'div');
  return <Element {...rest}>{children ?? 'Topbar'}</Element>;
};
