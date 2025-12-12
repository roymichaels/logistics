import React, { useRef } from 'react';
import { Popover } from '../../components/primitives/Popover';

export default function MetricsPopoverMigration(props: any) {
  const { isOpen, onClose, anchorEl } = props;
  const anchorRef = useRef<HTMLElement | null>(null);
  // Provide current anchor element to Popover via ref
  (anchorRef as any).current = anchorEl || null;

  return (
    <Popover isOpen={!!isOpen} onClose={onClose} anchorRef={anchorRef}>
      <div style={{ display: 'grid', gap: 8, color: 'var(--color-text)' }}>
        <div style={{ fontWeight: 700 }}>Metrics</div>
        <div style={{ color: 'var(--color-text-muted)' }}>Orders: —</div>
        <div style={{ color: 'var(--color-text-muted)' }}>Revenue: —</div>
        <div style={{ color: 'var(--color-text-muted)' }}>Conversion: —</div>
      </div>
    </Popover>
  );
}
