import React, { useState, useEffect } from 'react';
import { logger } from '../lib/logger';

interface SuperadminSetupProps {
  user: any;
  onSuccess: () => void;
  theme: any;
}

export function SuperadminSetup({ user, onSuccess, theme }: SuperadminSetupProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordSet, setPasswordSet] = useState<boolean | null>(null);
  const [mode, setMode] = useState<'check' | 'set' | 'verify'>('check');

  useEffect(() => {
    checkPasswordStatus();
  }, []);

  const checkPasswordStatus = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/superadmin-auth`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'status' }),
        }
      );

      const result = await response.json();

      if (result.ok) {
        setPasswordSet(result.passwordSet);
        setMode(result.passwordSet ? 'verify' : 'set');
      }
    } catch (err) {
      logger.error('Failed to check password status:', err);
      setMode('set');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'set') {
      if (password.length < 6) {
        setError('הסיסמה חייבת להכיל לפחות 6 תווים');
        return;
      }

      if (password !== confirmPassword) {
        setError('הסיסמאות אינן תואמות');
        return;
      }
    }

    if (!password) {
      setError('אנא הזן סיסמה');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/superadmin-auth`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: mode === 'set' ? 'set' : 'verify',
            password,
            telegram_id: user?.telegram_id,
            username: user?.username,
          }),
        }
      );

      const result = await response.json();

      if (result.ok) {
        onSuccess();
      } else {
        setError(result.error || 'שגיאה לא ידועה');
      }
    } catch (err) {
      logger.error('Superadmin auth failed:', err);
      setError('שגיאה בחיבור לשרת');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    onSuccess();
  };

  if (passwordSet === null) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: theme.bg_color,
          color: theme.text_color,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏳</div>
          <div>בודק הגדרות מערכת...</div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: theme.bg_color,
        color: theme.text_color,
        padding: '20px',
        direction: 'rtl',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: theme.secondary_bg_color,
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔐</div>
          <h1 style={{ fontSize: '24px', fontWeight: '600', margin: '0 0 8px 0' }}>
            {mode === 'set' ? 'הגדר סיסמת מנהל' : 'הזן סיסמת מנהל'}
          </h1>
          <p style={{ fontSize: '14px', color: theme.hint_color, margin: 0 }}>
            {mode === 'set'
              ? 'אתה המשתמש הראשון! הגדר סיסמה כדי להפוך למנהל ראשי'
              : 'הזן את סיסמת המנהל הראשי כדי לקבל הרשאות מנהל'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '8px',
              }}
            >
              {mode === 'set' ? 'סיסמה חדשה' : 'סיסמת מנהל'}
            </label>
            <input
              type="password"
              autoComplete={mode === 'set' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'set' ? 'לפחות 6 תווים' : 'הזן סיסמה'}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                border: `1px solid ${theme.hint_color}40`,
                borderRadius: '8px',
                backgroundColor: theme.bg_color,
                color: theme.text_color,
                fontFamily: 'inherit',
              }}
            />
          </div>

          {mode === 'set' && (
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                }}
              >
                אימות סיסמה
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="הזן שוב את הסיסמה"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '16px',
                  border: `1px solid ${theme.hint_color}40`,
                  borderRadius: '8px',
                  backgroundColor: theme.bg_color,
                  color: theme.text_color,
                  fontFamily: 'inherit',
                }}
              />
            </div>
          )}

          {error && (
            <div
              style={{
                padding: '12px',
                backgroundColor: '#ffebee',
                color: '#c62828',
                borderRadius: '8px',
                fontSize: '14px',
                marginBottom: '16px',
                textAlign: 'center',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '16px',
              fontWeight: '600',
              backgroundColor: theme.button_color,
              color: theme.button_text_color,
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              fontFamily: 'inherit',
            }}
          >
            {loading ? 'מעבד...' : mode === 'set' ? 'הגדר והפוך למנהל' : 'אמת והפוך למנהל'}
          </button>

          <button
            type="button"
            onClick={handleSkip}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '14px',
              fontWeight: '500',
              backgroundColor: 'transparent',
              color: theme.hint_color,
              border: 'none',
              cursor: 'pointer',
              marginTop: '12px',
              fontFamily: 'inherit',
            }}
          >
            המשך כמשתמש רגיל
          </button>
        </form>

        {mode === 'set' && (
          <div
            style={{
              marginTop: '24px',
              padding: '16px',
              backgroundColor: theme.bg_color,
              borderRadius: '8px',
              fontSize: '13px',
              lineHeight: '1.5',
            }}
          >
            <strong style={{ display: 'block', marginBottom: '8px' }}>💡 שים לב:</strong>
            <ul style={{ margin: 0, paddingRight: '20px' }}>
              <li>כל מי שיודע את הסיסמה יכול להפוך למנהל</li>
              <li>שמור את הסיסמה במקום בטוח</li>
              <li>לא ניתן לאפס את הסיסמה אחרי ההגדרה</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
