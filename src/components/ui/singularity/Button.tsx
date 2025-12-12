import React from 'react';

type Variant = 'filled' | 'outline' | 'ghost' | 'soft' | 'destructive';
type Size = 'xs' | 'sm' | 'md' | 'lg';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export const SGButton: React.FC<Props> = ({ variant = 'filled', size = 'md', style, children, ...rest }) => {
  const padding =
    size === 'xs'
      ? '6px 10px'
      : size === 'sm'
      ? '8px 12px'
      : size === 'lg'
      ? '12px 18px'
      : '10px 14px';

  const baseStyle: React.CSSProperties = {
    border: '1px solid transparent',
    borderRadius: 12,
    background: '#1d9bf0',
    color: '#0b1020',
    fontWeight: 700,
    padding,
    cursor: 'pointer',
    transition: '200ms ease',
  };

  const styles: Record<Variant, React.CSSProperties> = {
    filled: baseStyle,
    outline: { ...baseStyle, background: 'transparent', color: '#e8ecf5', borderColor: 'rgba(255,255,255,0.24)' },
    ghost: { ...baseStyle, background: 'transparent', color: '#e8ecf5', borderColor: 'transparent' },
    soft: { ...baseStyle, background: 'rgba(29,155,240,0.12)', color: '#1d9bf0' },
    destructive: { ...baseStyle, background: '#ef4444', color: '#fff' },
  };

  return (
    <button style={{ ...styles[variant], ...style }} {...rest}>
      {children}
    </button>
  );
};

export default SGButton;
