import React, { useEffect, useRef, useState } from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useShell } from '../context/ShellContext';
import { canView } from '../lib/auth/canView';
import '../styles/storefront-theme.css';
import { migrationFlags } from '../migration/flags';

export function StoreLayout({ children }: { children?: React.ReactNode }) {
  const { user, logoutWallet } = useAuth();
  const { setShowSidebar } = useShell();
  const role = (user as any)?.role || 'client';
  const kycStatus = (user as any)?.kycStatus || 'unverified';
  const navigate = useNavigate();
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.classList.add('storefront-mode');
    return () => document.body.classList.remove('storefront-mode');
  }, []);

  useEffect(() => {
    // Ensure legacy sidebar never opens inside storefront layout
    setShowSidebar(false);
  }, [setShowSidebar]);

  if (migrationFlags.unifiedShell || migrationFlags.unifiedApp) {
    return null;
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    }
    if (avatarOpen) {
      document.addEventListener('mousedown', onClickOutside);
      return () => document.removeEventListener('mousedown', onClickOutside);
    }
  }, [avatarOpen]);

  // Only clients should view storefront; others are rerouted.
  if (!canView('catalog', role)) {
    return <Navigate to="/business/dashboard" replace />;
  }

  return (
    <div
      className="storefront-shell"
      style={{
        width: '100%',
        minHeight: '100vh',
        overflowX: 'hidden',
        overflowY: 'visible',
        background: '#0b1220',
        color: '#e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '100%',
      }}
    >
      <header
        className="storefront-topbar"
        style={{
          width: '100%',
          padding: '6px 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          boxSizing: 'border-box',
          position: 'sticky',
          top: 0,
          zIndex: 30,
          background: 'linear-gradient(90deg, rgba(7,12,20,0.94), rgba(7,12,20,0.82))',
          borderBottom: '1px solid var(--sf-border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 18, whiteSpace: 'nowrap' }}>חנות חכמה</div>
          <button type="button" className="sf-btn" aria-label="change language">
            🌐
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="sf-btn"
            onClick={() => navigate('/store/cart')}
            aria-label="cart"
            style={{ whiteSpace: 'nowrap', minHeight: 36 }}
          >
            🛒 עגלה
          </button>

          <div
            style={{
              position: 'relative',
              zIndex: 40,
              overflow: 'visible',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            ref={avatarRef}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAvatarOpen((v) => !v);
                setShowSidebar(false);
              }}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.28)',
                background: 'linear-gradient(135deg, #1d9bf0, #00b7ff)',
                color: '#0b1020',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
              }}
              aria-label="account menu"
            >
              {(user as any)?.name?.[0]?.toUpperCase?.() ||
                (user as any)?.username?.[0]?.toUpperCase?.() ||
                'U'}
            </button>
            {kycStatus === 'verified' && (
              <span
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  background: '#22c55e',
                  color: '#0b1020',
                  borderRadius: 999,
                  padding: '2px 6px',
                  fontSize: 11,
                  fontWeight: 800,
                  boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
                }}
              >
                ✓
              </span>
            )}
            {avatarOpen && (
              <div
                className="sf-avatar-pop"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 0,
                  right: 'auto',
                  width: 'clamp(180px, 22vw, 260px)',
                  maxWidth: 'min(260px, calc(100vw - 16px))',
                  maxHeight: 'min(70vh, 520px)',
                  overflowWrap: 'break-word',
                  overflowY: 'auto',
                  zIndex: 9999,
                  boxShadow: '0 14px 30px rgba(0,0,0,0.45)',
                  backdropFilter: 'blur(14px)',
                  background: '#0e1625',
                  border: '1px solid var(--sf-border)',
                  borderRadius: 14,
                  padding: '4px 0',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setAvatarOpen(false);
                    navigate('/store/profile');
                  }}
                  className="sf-menu-item"
                >
                  👤 הפרופיל שלי
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAvatarOpen(false);
                    navigate('/store/orders');
                  }}
                  className="sf-menu-item"
                >
                  🧾 ההזמנות שלי
                </button>
                {kycStatus === 'verified' ? (
                  <button
                    type="button"
                    disabled
                    className="sf-menu-item"
                    style={{ color: '#22c55e', opacity: 0.9, cursor: 'default' }}
                  >
                    ✓ Verified
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarOpen(false);
                      navigate('/store/kyc/start');
                    }}
                    className="sf-menu-item"
                    style={{ color: '#1d9bf0' }}
                  >
                    🔒 Get Verified
                  </button>
                )}
                <div style={{ height: 1, background: 'var(--sf-border)' }} />
                <button
                  type="button"
                  onClick={() => {
                    setAvatarOpen(false);
                    logoutWallet?.();
                  }}
                  className="sf-menu-item"
                >
                  🚪 התנתקות
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main
        className="storefront-main"
        style={{
          padding: '0',
          boxSizing: 'border-box',
          width: '100%',
          maxWidth: '100%',
          flex: 1,
          overflowX: 'hidden',
          overflowY: 'visible',
        }}
      >
        <div style={{ width: '100%', display: 'block' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
