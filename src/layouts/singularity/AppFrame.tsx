import React from 'react';
import { ViewportContainer } from './ViewportContainer';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';
import { Topbar } from './Topbar';
import { BottomBar } from './BottomBar';

type Props = {
  left?: React.ReactNode;
  right?: React.ReactNode;
  top?: React.ReactNode;
  bottom?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Responsive 3-column frame inspired by Twitter/Telegram.
 * Placeholder only; does not alter existing flows.
 */
export const AppFrame: React.FC<Props> = ({ left, right, top, bottom, children }) => {
  return (
    <ViewportContainer>
      <Topbar>{top ?? <Topbar.Placeholder />}</Topbar>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 260px) minmax(0, 1fr) minmax(0, 320px)',
          gap: '16px',
          padding: '16px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <LeftSidebar>{left ?? <LeftSidebar.Placeholder />}</LeftSidebar>
        <main style={{ minHeight: '60vh' }}>{children}</main>
        <RightSidebar>{right ?? <RightSidebar.Placeholder />}</RightSidebar>
      </div>
      <BottomBar>{bottom ?? <BottomBar.Placeholder />}</BottomBar>
    </ViewportContainer>
  );
};

export default AppFrame;
