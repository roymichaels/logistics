import React, { useState, useEffect } from 'react';
import { telegram } from '../../lib/telegram';

interface LobbyProps {
  onModeSelected: (mode: 'demo' | 'real', remember: boolean) => void;
  defaultMode?: 'demo' | 'real';
}

export function Lobby({ onModeSelected, defaultMode }: LobbyProps) {
  const [selectedMode, setSelectedMode] = useState<'demo' | 'real' | null>(defaultMode || null);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  const theme = telegram.themeParams;
  
  console.log('Lobby: isTelegramEnv =', telegram.isTelegramEnv, 'selectedMode =', selectedMode);

  useEffect(() => {
    if (selectedMode) {
      if (telegram.isTelegramEnv) {
        telegram.setMainButton({ 
          text: 'Continue', 
          visible: true, 
          onClick: handleContinue 
        });
        console.log('Lobby: MainButton set to visible');
      }
    } else {
      if (telegram.isTelegramEnv) {
        telegram.hideMainButton();
      }
    }

    return () => {
      if (telegram.isTelegramEnv) {
        telegram.hideMainButton();
      }
    };
  }, [selectedMode]);

  const handleContinue = async () => {
    if (!selectedMode) return;
    
    setLoading(true);
    telegram.hapticFeedback('selection');
    
    try {
      await onModeSelected(selectedMode, remember);
    } catch (error) {
      console.error('Failed to set mode:', error);
      telegram.showAlert('Failed to continue. Please try again.');
      setLoading(false);
    }
  };

  const handleModeSelect = (mode: 'demo' | 'real') => {
    telegram.hapticFeedback('selection');
    setSelectedMode(mode);
  };

  return (
    <div style={{ 
      padding: 'var(--tg-spacing-xl)',
      backgroundColor: theme.bg_color,
      color: theme.text_color,
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--tg-spacing-2xl)' }}>
        <h1 style={{ 
          margin: '0 0 var(--tg-spacing-sm) 0', 
          fontSize: '28px', 
          fontWeight: '700',
          color: theme.text_color
        }}>
          Welcome to Logistics
        </h1>
        <p style={{ 
          margin: 0, 
          fontSize: 'var(--tg-font-lg)', 
          color: theme.hint_color,
          lineHeight: '1.4'
        }}>
          Choose your experience mode to get started
        </p>
      </div>

      {/* Mode Cards */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 'var(--tg-spacing-lg)',
        marginBottom: 'var(--tg-spacing-2xl)',
        flex: 1
      }}>
        <ModeCard
          title="Demo Mode"
          subtitle="Safe sandbox with sample data"
          description="Perfect for exploring features without affecting real operations. Includes sample orders, tasks, and delivery routes."
          icon="🎮"
          selected={selectedMode === 'demo'}
          onClick={() => handleModeSelect('demo')}
          theme={theme}
        />
        
        <ModeCard
          title="Real Mode"
          subtitle="Live operational data"
          description="Connect to your actual logistics operations. Create real orders, assign tasks, and manage live deliveries."
          icon="🚚"
          selected={selectedMode === 'real'}
          onClick={() => handleModeSelect('real')}
          theme={theme}
        />
      </div>

      {/* Remember Choice */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 'var(--tg-spacing-md)',
        padding: 'var(--tg-spacing-lg)',
        backgroundColor: theme.secondary_bg_color || '#f1f1f1',
        borderRadius: 'var(--tg-radius-md)',
        marginBottom: 'var(--tg-spacing-xl)'
      }}>
        <input
          type="checkbox"
          id="remember"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          style={{
            width: '18px',
            height: '18px',
            accentColor: theme.button_color
          }}
        />
        <label 
          htmlFor="remember"
          style={{ 
            fontSize: 'var(--tg-font-md)', 
            color: theme.text_color,
            cursor: 'pointer',
            flex: 1
          }}
        >
          Remember my choice (you can change this later in Settings)
        </label>
      </div>

      {loading && (
        <div style={{ 
          textAlign: 'center', 
          padding: 'var(--tg-spacing-xl)',
          color: theme.hint_color
        }}>
          Setting up your workspace...
        </div>
      )}


      {/* Fallback button for non-Telegram environments */}
      {selectedMode && (
        <button
          onClick={handleContinue}
          disabled={loading}
          style={{
            width: '100%',
            padding: 'var(--tg-spacing-lg)',
            backgroundColor: theme.button_color,
            color: theme.button_text_color,
            border: 'none',
            borderRadius: 'var(--tg-radius-md)',
            fontSize: 'var(--tg-font-lg)',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            marginBottom: 'var(--tg-spacing-xl)'
          }}
        >
          {loading ? 'Setting up...' : 'Continue'}
        </button>
      )}
    </div>
  );
}

function ModeCard({ title, subtitle, description, icon, selected, onClick, theme }: {
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  selected: boolean;
  onClick: () => void;
  theme: any;
}) {
  return (
    <button
      onClick={() => {
        telegram.hapticFeedback('selection');
        onClick();
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: 'var(--tg-spacing-xl)',
        backgroundColor: selected 
          ? theme.button_color + '20' 
          : theme.secondary_bg_color || '#f1f1f1',
        border: selected 
          ? `2px solid ${theme.button_color}` 
          : `2px solid transparent`,
        borderRadius: 'var(--tg-radius-lg)',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        transition: 'all 0.2s ease'
      }}
    >
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 'var(--tg-spacing-md)',
        marginBottom: 'var(--tg-spacing-md)',
        width: '100%'
      }}>
        <div style={{ fontSize: '32px' }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <h3 style={{ 
            margin: '0 0 var(--tg-spacing-xs) 0', 
            fontSize: 'var(--tg-font-xl)', 
            fontWeight: '700',
            color: selected ? theme.button_color : theme.text_color
          }}>
            {title}
          </h3>
          <p style={{ 
            margin: 0, 
            fontSize: 'var(--tg-font-md)', 
            color: theme.hint_color,
            fontWeight: '500'
          }}>
            {subtitle}
          </p>
        </div>
        {selected && (
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: 'var(--tg-radius-md)',
            backgroundColor: theme.button_color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.button_text_color,
            fontSize: 'var(--tg-font-lg)',
            fontWeight: '700'
          }}>
            ✓
          </div>
        )}
      </div>
      
      <p style={{ 
        margin: 0, 
        fontSize: 'var(--tg-font-md)', 
        color: theme.hint_color,
        lineHeight: '1.4'
      }}>
        {description}
      </p>
    </button>
  );
}