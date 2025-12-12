import React from 'react';

export type BadgeProps = {
  children?: React.ReactNode;
  [key: string]: any;
};

export const Badge: React.FC<BadgeProps> = ({ children, ...rest }) => {
  const Element: any = rest.as || (rest.href ? 'a' : rest.asElement || 'div');
  return <Element {...rest}>{children ?? 'Badge'}</Element>;
};