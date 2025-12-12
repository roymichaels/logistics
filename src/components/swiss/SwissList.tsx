import React from 'react';
import { SwissMode } from './SwissContainer';

type Props = {
  items: React.ReactNode[];
  mode?: SwissMode;
  density?: 'comfortable' | 'compact';
  renderItem?: (node: React.ReactNode, index: number) => React.ReactNode;
};

export const SwissList: React.FC<Props> = ({ items, mode = 'auto', density = 'comfortable', renderItem }) => {
  return (
    <div data-swiss-list data-mode={mode} data-density={density} style={{ display: 'grid', gap: density === 'compact' ? 8 : 12 }}>
      {items.map((node, idx) => (
        <div key={idx}>{renderItem ? renderItem(node, idx) : node}</div>
      ))}
    </div>
  );
};

export default SwissList;
