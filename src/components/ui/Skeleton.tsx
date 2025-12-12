import React from 'react';

export type SkeletonProps = {
  children?: React.ReactNode;
  [key: string]: any;
};

export const Skeleton: React.FC<SkeletonProps> = ({ children, ...rest }) => {
  const Element: any = rest.as || (rest.href ? 'a' : rest.asElement || 'div');
  return <Element {...rest}>{children ?? 'Skeleton'}</Element>;
};