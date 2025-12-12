import React from 'react';

type Props = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  collapsible?: boolean;
  expanded?: boolean;
  onToggle?: (next: boolean) => void;
  density?: 'comfortable' | 'compact';
};

export const SwissSection: React.FC<Props> = ({
  title,
  description,
  children,
  collapsible = true,
  expanded: controlledExpanded,
  onToggle,
  density = 'comfortable',
}) => {
  const [uncontrolled, setUncontrolled] = React.useState(true);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : uncontrolled;

  const handleToggle = () => {
    const next = !isExpanded;
    if (controlledExpanded === undefined) setUncontrolled(next);
    onToggle?.(next);
  };

  return (
    <section
      data-swiss-section
      data-density={density}
      data-expanded={isExpanded}
      style={{
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.06)',
        padding: density === 'compact' ? 12 : 16,
        background: 'rgba(255,255,255,0.02)',
      }}
    >
      {(title || description) && (
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div>
            {title && <div style={{ fontWeight: 700 }}>{title}</div>}
            {description && <div style={{ fontSize: 12, opacity: 0.7 }}>{description}</div>}
          </div>
          {collapsible && (
            <button
              type="button"
              onClick={handleToggle}
              style={{
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.04)',
                color: '#e5f0ff',
                borderRadius: 999,
                padding: '4px 10px',
                cursor: 'pointer',
              }}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </button>
          )}
        </header>
      )}
      {(!collapsible || isExpanded) && <div style={{ marginTop: 12 }}>{children}</div>}
    </section>
  );
};

export default SwissSection;
