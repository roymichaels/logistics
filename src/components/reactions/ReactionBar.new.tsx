import React from 'react';
import type { useReactionStore } from '../../state/useReactionStore';
import { migrationFlags } from '../../migration/flags';

type Props = {
  reactionStore: ReturnType<typeof useReactionStore>;
};

export default function ReactionBarNew({ reactionStore }: Props) {
  if (!migrationFlags.reactions) return null;
  const wishlistCount = reactionStore?.wishlist?.size || 0;
  const likesCount = reactionStore?.likes?.size || 0;
  const seenCount = reactionStore?.seen?.size || 0;

  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: 'max(12px, env(safe-area-inset-bottom))',
        background: 'var(--color-panel)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-pill)',
        padding: '8px 12px',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        boxShadow: 'var(--shadow-md)',
        zIndex: 1100
      }}
    >
      <span style={{ color: 'var(--color-text)' }}>❤️ {wishlistCount}</span>
      <span style={{ color: 'var(--color-text)' }}>👍 {likesCount}</span>
      <span style={{ color: 'var(--color-text)' }}>👀 {seenCount}</span>
    </div>
  );
}
