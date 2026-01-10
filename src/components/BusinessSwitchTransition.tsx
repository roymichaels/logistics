import React, { useEffect, useState } from 'react';

interface BusinessSwitchTransitionProps {
  isTransitioning: boolean;
  fromBusinessName?: string;
  toBusinessName?: string;
}

export function BusinessSwitchTransition({
  isTransitioning,
  fromBusinessName,
  toBusinessName,
}: BusinessSwitchTransitionProps) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<'fadeout' | 'loading' | 'fadein'>('fadeout');

  useEffect(() => {
    if (!isTransitioning) {
      setProgress(0);
      setStage('fadeout');
      return;
    }

    setStage('fadeout');
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 20);

    const stageTimeout1 = setTimeout(() => setStage('loading'), 300);
    const stageTimeout2 = setTimeout(() => setStage('fadein'), 800);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(stageTimeout1);
      clearTimeout(stageTimeout2);
    };
  }, [isTransitioning]);

  if (!isTransitioning) return null;

  return (
    <>
      <style>{`
        @keyframes businessSwitchFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes businessSwitchPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.8;
          }
        }

        @keyframes businessSwitchSlideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes businessSwitchSpin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>

      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px',
          animation: 'businessSwitchFadeIn 0.2s ease-out',
        }}
      >
        {/* Business Icon */}
        <div
          style={{
            fontSize: '64px',
            animation: stage === 'loading' ? 'businessSwitchPulse 1.5s ease-in-out infinite' : 'businessSwitchSlideUp 0.3s ease-out',
          }}
        >
          🏢
        </div>

        {/* Text Content */}
        <div
          style={{
            textAlign: 'center',
            animation: 'businessSwitchSlideUp 0.4s ease-out 0.1s both',
          }}
        >
          <div
            style={{
              fontSize: '20px',
              fontWeight: '600',
              color: 'rgba(255, 255, 255, 0.95)',
              marginBottom: '8px',
            }}
          >
            {stage === 'fadeout' && 'Switching Business...'}
            {stage === 'loading' && 'Loading Data...'}
            {stage === 'fadein' && 'Ready!'}
          </div>

          {(fromBusinessName || toBusinessName) && (
            <div
              style={{
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.6)',
              }}
            >
              {fromBusinessName && toBusinessName && (
                <>
                  {fromBusinessName} → {toBusinessName}
                </>
              )}
              {!fromBusinessName && toBusinessName && toBusinessName}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div
          style={{
            width: '300px',
            height: '4px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '2px',
            overflow: 'hidden',
            animation: 'businessSwitchSlideUp 0.5s ease-out 0.2s both',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: '#60a5fa',
              transition: 'width 0.1s linear',
              borderRadius: '2px',
            }}
          />
        </div>

        {/* Loading Spinner */}
        {stage === 'loading' && (
          <div
            style={{
              width: '32px',
              height: '32px',
              border: '3px solid rgba(255, 255, 255, 0.1)',
              borderTopColor: '#60a5fa',
              borderRadius: '50%',
              animation: 'businessSwitchSpin 0.8s linear infinite',
            }}
          />
        )}
      </div>
    </>
  );
}

// Hook to manage business switch transitions
export function useBusinessSwitchTransition() {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [fromBusiness, setFromBusiness] = useState<string>();
  const [toBusiness, setToBusiness] = useState<string>();

  const startTransition = (from?: string, to?: string) => {
    setFromBusiness(from);
    setToBusiness(to);
    setIsTransitioning(true);

    setTimeout(() => {
      setIsTransitioning(false);
    }, 1200);
  };

  return {
    isTransitioning,
    fromBusiness,
    toBusiness,
    startTransition,
  };
}
