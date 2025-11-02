import React, { useEffect, useState } from 'react';
import '../styles/transitions.css';

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
    this.listeners.forEach(listener => listener([...this.toasts]));
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

    // Auto dismiss
    setTimeout(() => {
      this.dismiss(id);
    }, duration);

    return id;
  }

  dismiss(id: string) {
    const toast = this.toasts.find(t => t.id === id);
    if (toast) {
      toast.isExiting = true;
      this.notify();

      // Remove after animation
      setTimeout(() => {
        this.toasts = this.toasts.filter(t => t.id !== id);
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

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '100px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxWidth: '90vw',
        width: '400px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={() => toast.dismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  const getColors = () => {
    switch (toast.type) {
      case 'success':
        return {
          bg: '#10b981',
          text: '#ffffff',
          border: '#059669',
        };
      case 'error':
        return {
          bg: '#ef4444',
          text: '#ffffff',
          border: '#dc2626',
        };
      case 'warning':
        return {
          bg: '#f59e0b',
          text: '#ffffff',
          border: '#d97706',
        };
      case 'info':
      default:
        return {
          bg: '#3b82f6',
          text: '#ffffff',
          border: '#2563eb',
        };
    }
  };

  const colors = getColors();

  return (
    <div
      className={toast.isExiting ? 'page-exit' : 'scale-in'}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        padding: '12px 16px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        pointerEvents: 'auto',
        border: `1px solid ${colors.border}`,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          fontWeight: 'bold',
          flexShrink: 0,
        }}
      >
        {getIcon()}
      </div>
      <div style={{ flex: 1, fontSize: '14px', fontWeight: '500' }}>
        {toast.message}
      </div>
      {toast.action && (
        <button
          onClick={() => {
            toast.action!.onClick();
            onDismiss();
          }}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            color: colors.text,
            border: 'none',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button
        onClick={onDismiss}
        style={{
          backgroundColor: 'transparent',
          border: 'none',
          color: colors.text,
          fontSize: '18px',
          cursor: 'pointer',
          padding: '0 4px',
          lineHeight: 1,
          opacity: 0.7,
        }}
      >
        ×
      </button>
    </div>
  );
}
