import React from 'react';
import { colors, spacing, typography, transitions, borderRadius } from '../../styles/design-system';

export interface ListItemProps extends React.HTMLAttributes<HTMLDivElement> {
  avatar?: React.ReactNode;
  title: string;
  subtitle?: string;
  timestamp?: string;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  hoverable?: boolean;
  interactive?: boolean;
  noBorder?: boolean;
}

export function ListItem({
  avatar,
  title,
  subtitle,
  timestamp,
  meta,
  action,
  hoverable = true,
  interactive = false,
  noBorder = false,
  children,
  style,
  className,
  ...props
}: ListItemProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isPressed, setIsPressed] = React.useState(false);

  const getBackgroundColor = () => {
    if (!hoverable && !interactive) return 'transparent';
    if (isPressed) return colors.background.tertiary;
    if (isHovered) return colors.ui.cardHover;
    return 'transparent';
  };

  const containerStyles: React.CSSProperties = {
    display: 'flex',
    gap: spacing.md,
    padding: spacing.lg,
    borderBottom: noBorder ? 'none' : `1px solid ${colors.border.primary}`,
    transition: `all ${transitions.normal}`,
    cursor: hoverable || interactive ? 'pointer' : 'default',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    background: getBackgroundColor(),
    transform: isPressed ? 'scale(0.99)' : 'scale(1)',
    ...style,
  };

  return (
    <div
      style={containerStyles}
      className={className}
      onMouseEnter={() => (hoverable || interactive) && setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => interactive && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onTouchStart={() => interactive && setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      {...props}
    >
      {avatar && (
        <div
          style={{
            flexShrink: 0,
            width: '40px',
            height: '40px',
          }}
        >
          {avatar}
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: subtitle ? spacing.xs : 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, minWidth: 0, flex: 1 }}>
            <h4
              style={{
                margin: 0,
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.bold,
                color: colors.text.primary,
                lineHeight: typography.lineHeight.tight,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {title}
            </h4>
            {meta && (
              <span
                style={{
                  fontSize: typography.fontSize.sm,
                  color: colors.text.secondary,
                  lineHeight: typography.lineHeight.tight,
                  flexShrink: 0,
                }}
              >
                {meta}
              </span>
            )}
          </div>

          {timestamp && (
            <span
              style={{
                fontSize: typography.fontSize.xs,
                color: colors.text.tertiary,
                lineHeight: typography.lineHeight.tight,
                flexShrink: 0,
                marginLeft: spacing.sm,
              }}
            >
              {timestamp}
            </span>
          )}
        </div>

        {subtitle && (
          <p
            style={{
              margin: 0,
              fontSize: typography.fontSize.base,
              color: colors.text.primary,
              lineHeight: typography.lineHeight.normal,
              wordBreak: 'break-word',
            }}
          >
            {subtitle}
          </p>
        )}

        {children && (
          <div
            style={{
              marginTop: spacing.md,
            }}
          >
            {children}
          </div>
        )}

        {action && (
          <div
            style={{
              marginTop: spacing.md,
              display: 'flex',
              gap: spacing.md,
              alignItems: 'center',
            }}
          >
            {action}
          </div>
        )}
      </div>
    </div>
  );
}

export interface FeedItemProps extends React.HTMLAttributes<HTMLDivElement> {
  avatar: React.ReactNode;
  username: string;
  handle?: string;
  timestamp: string;
  content: string;
  media?: React.ReactNode;
  stats?: {
    likes?: number;
    retweets?: number;
    replies?: number;
  };
  onLike?: () => void;
  onRetweet?: () => void;
  onReply?: () => void;
  onShare?: () => void;
}

export function FeedItem({
  avatar,
  username,
  handle,
  timestamp,
  content,
  media,
  stats,
  onLike,
  onRetweet,
  onReply,
  onShare,
  style,
  className,
  ...props
}: FeedItemProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const containerStyles: React.CSSProperties = {
    padding: spacing.lg,
    borderBottom: `1px solid ${colors.border.primary}`,
    transition: `background ${transitions.normal}`,
    background: isHovered ? colors.ui.cardHover : 'transparent',
    cursor: 'pointer',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    ...style,
  };

  return (
    <div
      style={containerStyles}
      className={className}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      <div style={{ display: 'flex', gap: spacing.md }}>
        <div style={{ flexShrink: 0 }}>{avatar}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs }}>
            <span
              style={{
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.bold,
                color: colors.text.primary,
                lineHeight: typography.lineHeight.tight,
              }}
            >
              {username}
            </span>
            {handle && (
              <span
                style={{
                  fontSize: typography.fontSize.base,
                  color: colors.text.secondary,
                  lineHeight: typography.lineHeight.tight,
                }}
              >
                @{handle}
              </span>
            )}
            <span style={{ color: colors.text.tertiary }}>·</span>
            <span
              style={{
                fontSize: typography.fontSize.base,
                color: colors.text.tertiary,
                lineHeight: typography.lineHeight.tight,
              }}
            >
              {timestamp}
            </span>
          </div>

          <p
            style={{
              margin: 0,
              fontSize: typography.fontSize.base,
              color: colors.text.primary,
              lineHeight: typography.lineHeight.normal,
              wordBreak: 'break-word',
              marginBottom: media ? spacing.md : spacing.sm,
            }}
          >
            {content}
          </p>

          {media && (
            <div
              style={{
                marginBottom: spacing.sm,
                borderRadius: borderRadius.lg,
                overflow: 'hidden',
              }}
            >
              {media}
            </div>
          )}

          {stats && (
            <div
              style={{
                display: 'flex',
                gap: spacing['3xl'],
                marginTop: spacing.md,
                color: colors.text.tertiary,
              }}
            >
              {onReply !== undefined && (
                <ActionButton icon="💬" count={stats.replies} onClick={onReply} color={colors.brand.primary} />
              )}
              {onRetweet !== undefined && (
                <ActionButton icon="🔁" count={stats.retweets} onClick={onRetweet} color={colors.accent.green} />
              )}
              {onLike !== undefined && (
                <ActionButton icon="❤️" count={stats.likes} onClick={onLike} color={colors.accent.pink} />
              )}
              {onShare !== undefined && (
                <ActionButton icon="📤" onClick={onShare} color={colors.brand.primary} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ActionButtonProps {
  icon: string;
  count?: number;
  onClick: () => void;
  color: string;
}

function ActionButton({ icon, count, onClick, color }: ActionButtonProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: spacing.xs,
        fontSize: typography.fontSize.base,
        color: isHovered ? color : colors.text.tertiary,
        transition: `all ${transitions.fast}`,
        borderRadius: borderRadius.full,
        transform: isHovered ? 'scale(1.1)' : 'scale(1)',
      }}
    >
      <span>{icon}</span>
      {count !== undefined && count > 0 && (
        <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.normal }}>
          {count > 999 ? `${(count / 1000).toFixed(1)}k` : count}
        </span>
      )}
    </button>
  );
}
