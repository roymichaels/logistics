import React from 'react';

export type SidebarProps = {
  children?: React.ReactNode;
  [key: string]: any;
};

export const Sidebar: React.FC<SidebarProps> = ({ children, ...rest }) => {
  const Element: any = rest.as || (rest.href ? 'a' : rest.asElement || 'div');
  return <Element {...rest}>{children ?? 'Sidebar'}</Element>;
};