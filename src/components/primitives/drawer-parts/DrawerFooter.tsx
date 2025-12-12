import React from 'react';

type DrawerFooterProps = {
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end';
};

export function DrawerFooter({ children, align = 'end' }: DrawerFooterProps) {
  const justify =
    align === 'start' ? 'flex-start' : align === 'center' ? 'center' : 'flex-end';

  return (
    <div
      style={{
        paddingTop: '12px',
        borderTop: '1px solid var(--color-border)',
        display: 'flex',
        justifyContent: justify,
        gap: '8px'
      }}
    >
      {children}
    </div>
  );
}
