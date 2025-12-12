import React from 'react';
import { SwissMode } from './SwissContainer';
import SwissCard from './SwissCard';

type Props = {
  headers?: string[];
  rows?: React.ReactNode[][];
  mode?: SwissMode;
  density?: 'comfortable' | 'compact';
};

/**
 * Responsive table that can collapse into cards when mode !== 'table'.
 * Currently renders a very small placeholder table.
 */
export const SwissTable: React.FC<Props> = ({
  headers = [],
  rows = [],
  mode = 'table',
  density = 'comfortable',
}) => {
  if (mode !== 'table') {
    return (
      <div data-swiss-table data-mode={mode} data-density={density} style={{ display: 'grid', gap: 10 }}>
        {rows.map((row, idx) => (
          <SwissCard key={idx} mode="card" density={density}>
            {row.map((cell, cIdx) => (
              <div key={cIdx} style={{ marginBottom: 4 }}>
                {headers[cIdx] && <span style={{ fontSize: 12, opacity: 0.65, marginRight: 6 }}>{headers[cIdx]}:</span>}
                {cell}
              </div>
            ))}
          </SwissCard>
        ))}
      </div>
    );
  }

  return (
    <table
      data-swiss-table
      data-mode={mode}
      data-density={density}
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        borderSpacing: 0,
        fontSize: 14,
      }}
    >
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th key={i} style={{ textAlign: 'left', padding: density === 'compact' ? 8 : 12, opacity: 0.7 }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rIdx) => (
          <tr key={rIdx} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {row.map((cell, cIdx) => (
              <td key={cIdx} style={{ padding: density === 'compact' ? 8 : 12 }}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default SwissTable;
