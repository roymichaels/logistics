import React from 'react';

export type FormProps = {
  children?: React.ReactNode;
  [key: string]: any;
};

export const Form: React.FC<FormProps> = ({ children, ...rest }) => {
  const Element: any = rest.as || (rest.href ? 'a' : rest.asElement || 'div');
  return <Element {...rest}>{children ?? 'Form'}</Element>;
};