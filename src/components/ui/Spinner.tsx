import React from 'react';

export type SpinnerProps = {
  children?: React.ReactNode;
  [key: string]: any;
};

export const Spinner: React.FC<SpinnerProps> = ({ children, ...rest }) => {
  const Element: any = rest.as || (rest.href ? 'a' : rest.asElement || 'div');
  return <Element {...rest}>{children ?? 'Spinner'}</Element>;
};