import React from 'react';

export type AvatarProps = {
  children?: React.ReactNode;
  [key: string]: any;
};

export const Avatar: React.FC<AvatarProps> = ({ children, ...rest }) => {
  const Element: any = rest.as || (rest.href ? 'a' : rest.asElement || 'div');
  return <Element {...rest}>{children ?? 'Avatar'}</Element>;
};