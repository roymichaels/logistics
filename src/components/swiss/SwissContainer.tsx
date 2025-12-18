import React from 'react';

export type SwissMode = 'auto' | 'card' | 'table' | 'compact';
export type SwissDensity = 'comfortable' | 'compact';

type Props = {
  children: React.ReactNode;
  mode?: SwissMode;
  density?: SwissDensity;
  collapsible?: boolean;
  expanded?: boolean;
  onExpand?: () => void;
  onCollapse?: () => void;
  interactive?: boolean;
  sheetMode?: boolean;
  className?: string;
};

/**
 * SwissContainer is the adaptive surface that future modes will plug into.
 * For now it is a lightweight wrapper that sets data attributes for styling.
 */
export const SwissContainer: React.FC<Props> = ({
  children,
  mode = 'auto',
  density = 'comfortable',
  collapsible = false,
  expanded = true,
  interactive = true,
  sheetMode = false,
  onExpand,
  onCollapse,
  className,
}) => {
  React.useEffect(() => {
    if (collapsible) {
      if (expanded) onExpand?.();
      else onCollapse?.();
    }
  }, [collapsible, expanded, onExpand, onCollapse]);

  return (
    <div
      className={className}
      data-swiss-container
      data-mode={mode}
      data-density={density}
      data-collapsible={collapsible ? 'true' : 'false'}
      data-expanded={expanded ? 'true' : 'false'}
      data-interactive={interactive ? 'true' : 'false'}
      data-sheet={sheetMode ? 'true' : 'false'}
      style={{
        width: '100%',
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {children}
    </div>
  );
};

export default SwissContainer;
