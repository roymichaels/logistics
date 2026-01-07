import React, { useEffect, useState } from 'react';
import { tokens } from '../../styles/tokens';

interface EarningsCounterProps {
  currentEarnings: number;
  isAnimating?: boolean;
  showIncrease?: boolean;
}

export function EarningsCounter({ currentEarnings, isAnimating = false, showIncrease = false }: EarningsCounterProps) {
  const [displayedEarnings, setDisplayedEarnings] = useState(currentEarnings);
  const [previousEarnings, setPreviousEarnings] = useState(currentEarnings);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (currentEarnings !== previousEarnings && currentEarnings > previousEarnings) {
      setShowPopup(true);

      const duration = 1000;
      const steps = 30;
      const increment = (currentEarnings - previousEarnings) / steps;
      let step = 0;

      const timer = setInterval(() => {
        step++;
        if (step <= steps) {
          setDisplayedEarnings(previousEarnings + increment * step);
        } else {
          clearInterval(timer);
          setDisplayedEarnings(currentEarnings);
          setPreviousEarnings(currentEarnings);
        }
      }, duration / steps);

      setTimeout(() => setShowPopup(false), 3000);

      return () => clearInterval(timer);
    } else {
      setDisplayedEarnings(currentEarnings);
      setPreviousEarnings(currentEarnings);
    }
  }, [currentEarnings]);

  const increase = currentEarnings - previousEarnings;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div
        style={{
          fontSize: '48px',
          fontWeight: '700',
          color: tokens.colors.status.success,
          textAlign: 'center',
          textShadow: isAnimating ? '0 0 20px rgba(16, 185, 129, 0.5)' : 'none',
          transition: 'all 0.3s ease',
          transform: isAnimating ? 'scale(1.1)' : 'scale(1)',
        }}
      >
        ₪{displayedEarnings.toFixed(2)}
      </div>

      {showPopup && increase > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '-40px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '18px',
            fontWeight: '700',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.5)',
            animation: 'slideUpFadeIn 0.5s ease-out, fadeOut 0.5s ease-in 2.5s',
            zIndex: 10,
            whiteSpace: 'nowrap',
          }}
        >
          +₪{increase.toFixed(2)}
        </div>
      )}

      <style>
        {`
          @keyframes slideUpFadeIn {
            from {
              opacity: 0;
              transform: translate(-50%, 10px);
            }
            to {
              opacity: 1;
              transform: translate(-50%, 0);
            }
          }

          @keyframes fadeOut {
            to {
              opacity: 0;
            }
          }
        `}
      </style>
    </div>
  );
}
