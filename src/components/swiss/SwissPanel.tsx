import React from 'react';
import clsx from 'clsx';

/**
 * SwissPanel
 * A responsive side panel that behaves like a sidebar on desktop
 * and a sliding drawer on mobile. Non-destructive placeholder.
 */
type SwissPanelProps = {
  open?: boolean;
  anchor?: 'left' | 'right';
  width?: number;
  className?: string;
  children: React.ReactNode;
};

export const SwissPanel: React.FC<SwissPanelProps> = ({
  open = true,
  anchor = 'right',
  width = 320,
  className,
  children,
}) => {
  const translateClass =
    anchor === 'right'
      ? open
        ? 'translate-x-0'
        : 'translate-x-full'
      : open
      ? 'translate-x-0'
      : '-translate-x-full';

  return (
    <aside
      className={clsx(
        'fixed top-0 h-full backdrop-blur-md bg-[rgba(16,16,20,0.85)] border border-white/10 shadow-xl transition-transform duration-300 z-40',
        translateClass,
        'sm:relative sm:translate-x-0 sm:bg-transparent sm:border-none sm:shadow-none',
        className,
      )}
      style={{ width }}
    >
      <div className="h-full w-full overflow-y-auto">{children}</div>
    </aside>
  );
};

