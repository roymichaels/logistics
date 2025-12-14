import React from 'react';
import { RoyalDashboardZoneCoverage } from '../../data/types';
import { colors } from '../../styles/design-system';
import { TWITTER_COLORS } from '../../styles/twitterTheme';

interface ZoneCoverageWidgetProps {
  zones: RoyalDashboardZoneCoverage[];
}

const numberFormatter = new Intl.NumberFormat('he-IL');

export function ZoneCoverageWidget({ zones }: ZoneCoverageWidgetProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {zones.map(zone => (
        <ZoneCard key={zone.zoneId} zone={zone} />
      ))}
    </div>
  );
}

function ZoneCard({ zone }: { zone: RoyalDashboardZoneCoverage }) {
  return (
    <div
      style={{
        padding: '16px',
        borderRadius: '16px',
        background: TWITTER_COLORS.backgroundSecondary,
        border: `1px solid ${TWITTER_COLORS.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ color: colors.text.primary }}>{zone.zoneName}</strong>
        <span style={{ fontSize: '12px', color: colors.text.secondary }}>
          {numberFormatter.format(zone.activeDrivers)} נהגים
        </span>
      </div>
      <div style={{ fontSize: '12px', color: colors.text.secondary }}>
        {zone.outstandingOrders > 0
          ? `${numberFormatter.format(zone.outstandingOrders)} משלוחים ממתינים`
          : 'אין משלוחים ממתינים'}
      </div>
      <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(255, 255, 255, 0.1)', overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.min(zone.coveragePercent, 100)}%`,
            background: `linear-gradient(90deg, ${colors.brand.primary}, ${colors.status.success})`,
            height: '100%'
          }}
        />
      </div>
      <div style={{ fontSize: '12px', color: colors.text.secondary }}>
        כיסוי {numberFormatter.format(zone.coveragePercent)}%
      </div>
    </div>
  );
}
