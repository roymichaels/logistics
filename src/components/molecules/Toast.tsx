import React, { useEffect, useState } from 'react';
import { colors, spacing, borderRadius, shadows, zIndex } from '../../styles/design-system';

export interface ToastOptions {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastItem extends ToastOptions {
  id: string;
  isExiting: boolean;
}

class ToastManager {
  private listeners: Set<(toasts: ToastItem[]) => void> = new Set();
  private toasts: ToastItem[] = [];

  subscribe(listener: (toasts: ToastItem[]) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener([...this.toasts]));
  }

  show(options: ToastOptions) {
    const id = Math.random().toString(36).substring(7);
    const duration = options.duration ?? 3000;

    const toast: ToastItem = {
      ...options,
      id,
      isExiting: false,
    };

    this.toasts.push(toast);
    this.notify();

    setTimeout(() => {
      this.dismiss(id);
    }, duration);

    return id;
  }

  dismiss(id: string) {
    const toast = this.toasts.find((t) => t.id === id);
    if (toast) {
      toast.isExiting = true;
      this.notify();

      setTimeout(() => {
        this.toasts = this.toasts.filter((t) => t.id !== id);
        this.notify();
      }, 300);
    }
  }

  success(message: string, options?: Partial<ToastOptions>) {
    return this.show({ ...options, message, type: 'success' });
  }

  error(message: string, options?: Partial<ToastOptions>) {
    return this.show({ ...options, message, type: 'error' });
  }

  warning(message: string, options?: Partial<ToastOptions>) {
    return this.show({ ...options, message, type: 'warning' });
  }

  info(message: string, options?: Partial<ToastOptions>) {
    return this.show({ ...options, message, type: 'info' });
  }
}

export const toast = new ToastManager();

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return toast.subscribe(setToasts);
  }, []);

  const containerStyles: React.CSSProperties = {
    position: 'fixed',
    top: spacing['2xl'],
    right: spacing['2xl'],
    zIndex: zIndex.toast,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
    pointerEvents: 'none',
  };

  return (
    <div style={containerStyles}>
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => toast.dismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast: t, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const typeStyles: Record<string, React.CSSProperties> = {
    success: {
      background: colors.status.success,
      color: colors.white,
    },
    error: {
      background: colors.status.error,
      color: colors.white,
    },
    warning: {
      background: colors.status.warning,
      color: colors.text.inverse,
    },
    info: {
      background: colors.brand.primary,
      color: colors.text.inverse,
    },
  };

  const toastStyles: React.CSSProperties = {
    minWidth: '300px',
    maxWidth: '500px',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.xl,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    pointerEvents: 'auto',
    animation: t.isExiting ? 'slideOut 0.3s ease' : 'slideIn 0.3s ease',
    ...typeStyles[t.type || 'info'],
  };

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `}</style>
      <div style={toastStyles}>
        <span style={{ flex: 1 }}>{t.message}</span>
        <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'center' }}>
          {t.action && (
            <button
              onClick={t.action.onClick}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontWeight: 600,
                textDecoration: 'underline',
              }}
            >
              {t.action.label}
            </button>
          )}
          <button
            onClick={onDismiss}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: '20px',
              lineHeight: 1,
              padding: 0,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      </div>
    </>
  );
}
