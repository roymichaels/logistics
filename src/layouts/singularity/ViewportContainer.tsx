import React from 'react';

type Props = {
  children: React.ReactNode;
};

export const ViewportContainer: React.FC<Props> = ({ children }) => {
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'var(--tx-bg, #0f1218)',
        color: 'var(--tx-text, #e8ecf5)',
      }}
    >
      {children}
    </div>
  );
};

export default ViewportContainer;
