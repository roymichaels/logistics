import React from 'react';
import { TWITTER_COLORS } from '../styles/twitterTheme';

interface GlowingPortalLogoProps {
  size?: number;
  pulseSpeed?: number;
}

export function GlowingPortalLogo({ size = 48, pulseSpeed = 2 }: GlowingPortalLogoProps) {
  const circleId = `portal-circle-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <style>{`
        @keyframes portal-glow {
          0%, 100% {
            filter: drop-shadow(0 0 8px ${TWITTER_COLORS.primary})
                    drop-shadow(0 0 16px ${TWITTER_COLORS.primary});
            transform: scale(1);
          }
          50% {
            filter: drop-shadow(0 0 16px ${TWITTER_COLORS.primary})
                    drop-shadow(0 0 24px ${TWITTER_COLORS.primary})
                    drop-shadow(0 0 32px ${TWITTER_COLORS.accentGlow});
            transform: scale(1.05);
          }
        }

        @keyframes portal-rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .${circleId} {
          animation: portal-glow ${pulseSpeed}s ease-in-out infinite;
        }

        .${circleId}::before {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          background: radial-gradient(
            circle at 30% 30%,
            ${TWITTER_COLORS.primary}40 0%,
            ${TWITTER_COLORS.primary}20 40%,
            transparent 70%
          );
          animation: portal-rotate ${pulseSpeed * 3}s linear infinite;
          pointer-events: none;
        }
      `}</style>

      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={circleId}
        style={{
          position: 'relative',
          zIndex: 1
        }}
      >
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke={TWITTER_COLORS.primary}
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          opacity="0.8"
        />

        <circle
          cx="50"
          cy="50"
          r="38"
          stroke={TWITTER_COLORS.primary}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          opacity="0.4"
          strokeDasharray="4 8"
        />

        <circle
          cx="50"
          cy="50"
          r="30"
          stroke={TWITTER_COLORS.primary}
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          opacity="0.2"
          strokeDasharray="2 6"
        />

        <defs>
          <radialGradient id={`glow-${circleId}`} cx="50%" cy="50%">
            <stop offset="0%" stopColor={TWITTER_COLORS.primary} stopOpacity="0.3" />
            <stop offset="50%" stopColor={TWITTER_COLORS.primary} stopOpacity="0.1" />
            <stop offset="100%" stopColor={TWITTER_COLORS.primary} stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle
          cx="50"
          cy="50"
          r="45"
          fill={`url(#glow-${circleId})`}
        />
      </svg>
    </div>
  );
}
