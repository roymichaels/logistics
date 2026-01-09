import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => string;
  hideToast: (id: string) => void;
  success: (message: string, title?: string) => string;
  error: (message: string, title?: string) => string;
  warning: (message: string, title?: string) => string;
  info: (message: string, title?: string) => string;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000,
    };

    setToasts(prev => [...prev, newToast]);

    if (newToast.duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, newToast.duration);
    }

    return id;
  }, [hideToast]);

  const success = useCallback((message: string, title?: string) => {
    return showToast({ type: 'success', message, title });
  }, [showToast]);

  const error = useCallback((message: string, title?: string) => {
    return showToast({ type: 'error', message, title });
  }, [showToast]);

  const warning = useCallback((message: string, title?: string) => {
    return showToast({ type: 'warning', message, title });
  }, [showToast]);

  const info = useCallback((message: string, title?: string) => {
    return showToast({ type: 'info', message, title });
  }, [showToast]);

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        hideToast,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

export function ToastContainer() {
  const { toasts, hideToast } = useToast();

  if (toasts.length === 0) return null;

  const iconMap = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
  };

  const colorMap = {
    success: {
      bg: '#10B981',
      icon: '#FFFFFF',
    },
    error: {
      bg: '#EF4444',
      icon: '#FFFFFF',
    },
    warning: {
      bg: '#F59E0B',
      icon: '#FFFFFF',
    },
    info: {
      bg: '#3B82F6',
      icon: '#FFFFFF',
    },
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        maxWidth: '400px',
        width: '100%',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type];
        const colors = colorMap[toast.type];

        return (
          <div
            key={toast.id}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '0.5rem',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              padding: '1rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              pointerEvents: 'auto',
              animation: 'slideIn 0.3s ease-out',
              border: `1px solid ${colors.bg}`,
            }}
          >
            <div
              style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '0.375rem',
                backgroundColor: colors.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon size={20} color={colors.icon} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {toast.title && (
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    color: '#111827',
                    marginBottom: '0.25rem',
                  }}
                >
                  {toast.title}
                </div>
              )}
              <div
                style={{
                  fontSize: '0.875rem',
                  color: '#6B7280',
                  lineHeight: 1.5,
                }}
              >
                {toast.message}
              </div>
              {toast.action && (
                <button
                  onClick={toast.action.onClick}
                  style={{
                    marginTop: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: colors.bg,
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                  }}
                >
                  {toast.action.label}
                </button>
              )}
            </div>

            <button
              onClick={() => hideToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.25rem',
                color: '#9CA3AF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '0.25rem',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#4B5563';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#9CA3AF';
              }}
            >
              <X size={16} />
            </button>
          </div>
        );
      })}

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

        @media (max-width: 640px) {
          .toast-container {
            left: 1rem;
            right: 1rem;
            max-width: none;
          }
        }
      `}</style>
    </div>
  );
}
