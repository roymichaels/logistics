import React from 'react';
import { RoyalDashboardAgent } from '../../data/types';
import { EmptyState } from './EmptyState';
import { colors } from '../../styles/design-system';
import { TWITTER_COLORS } from '../../styles/twitterTheme';

interface AgentsWidgetProps {
  agents: RoyalDashboardAgent[];
}

const numberFormatter = new Intl.NumberFormat('he-IL');

export function AgentsWidget({ agents }: AgentsWidgetProps) {
  if (agents.length === 0) {
    return <EmptyState message="אין נהגים מחוברים כעת" />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {agents.map(agent => (
        <AgentRow key={agent.id} agent={agent} />
      ))}
    </div>
  );
}

function AgentRow({ agent }: { agent: RoyalDashboardAgent }) {
  const statusTone = agent.status === 'offline' ? 'rgba(255, 255, 255, 0.2)' : colors.brand.primary;
  const statusLabel = agent.status === 'offline' ? 'מנותק' : agent.status === 'available' ? 'זמין' : 'במשימה';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        borderRadius: '16px',
        background: TWITTER_COLORS.backgroundSecondary,
        border: `1px solid ${TWITTER_COLORS.border}`
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: TWITTER_COLORS.gradientPrimary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px'
          }}
        >
          {agent.name?.[0] || '👤'}
        </div>
        <div>
          <div style={{ fontWeight: 600, color: colors.text.primary }}>{agent.name}</div>
          <div style={{ fontSize: '12px', color: colors.text.secondary }}>
            {agent.zone || 'ללא אזור'} · {numberFormatter.format(agent.ordersInProgress)} משלוחים פתוחים
          </div>
        </div>
      </div>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '12px',
          background: 'transparent',
          border: `1px solid ${TWITTER_COLORS.buttonSecondaryBorder}`,
          color: statusTone,
          fontSize: '12px',
          fontWeight: 600
        }}
      >
        {statusLabel}
      </span>
    </div>
  );
}
