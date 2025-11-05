import { Order } from '../data/types';

export const ORDER_STATUS_COLORS = {
  new: {
    bg: '#FFF3E0',
    border: '#FFB74D',
    text: '#E65100',
    icon: '🆕',
    gradient: 'linear-gradient(135deg, #FFE082 0%, #FFB74D 100%)'
  },
  confirmed: {
    bg: '#E3F2FD',
    border: '#42A5F5',
    text: '#1565C0',
    icon: '✅',
    gradient: 'linear-gradient(135deg, #64B5F6 0%, #42A5F5 100%)'
  },
  preparing: {
    bg: '#F3E5F5',
    border: '#AB47BC',
    text: '#6A1B9A',
    icon: '📦',
    gradient: 'linear-gradient(135deg, #BA68C8 0%, #AB47BC 100%)'
  },
  ready: {
    bg: '#E0F2F1',
    border: '#26A69A',
    text: '#00695C',
    icon: '🎁',
    gradient: 'linear-gradient(135deg, #4DB6AC 0%, #26A69A 100%)'
  },
  out_for_delivery: {
    bg: '#E8F5E9',
    border: '#66BB6A',
    text: '#2E7D32',
    icon: '🚚',
    gradient: 'linear-gradient(135deg, #81C784 0%, #66BB6A 100%)'
  },
  delivered: {
    bg: '#C8E6C9',
    border: '#4CAF50',
    text: '#1B5E20',
    icon: '✨',
    gradient: 'linear-gradient(135deg, #66BB6A 0%, #4CAF50 100%)'
  },
  cancelled: {
    bg: '#FFEBEE',
    border: '#EF5350',
    text: '#C62828',
    icon: '❌',
    gradient: 'linear-gradient(135deg, #E57373 0%, #EF5350 100%)'
  }
};

export const PRIORITY_COLORS = {
  urgent: {
    bg: '#FFEBEE',
    border: '#F44336',
    text: '#B71C1C',
    icon: '🔥',
    pulse: true
  },
  high: {
    bg: '#FFF3E0',
    border: '#FF9800',
    text: '#E65100',
    icon: '⚡'
  },
  medium: {
    bg: '#E3F2FD',
    border: '#2196F3',
    text: '#0D47A1',
    icon: '📋'
  },
  low: {
    bg: '#F5F5F5',
    border: '#9E9E9E',
    text: '#424242',
    icon: '📄'
  }
};

export function getOrderStatusConfig(status: Order['status']) {
  return ORDER_STATUS_COLORS[status] || ORDER_STATUS_COLORS.new;
}

export function getPriorityConfig(priority: string) {
  return PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] || PRIORITY_COLORS.medium;
}

export const ORDER_CARD_STYLES = {
  base: {
    padding: '16px',
    borderRadius: '16px',
    border: '2px solid transparent',
    background: '#FFFFFF',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'pointer'
  },
  hover: {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
    borderColor: '#1D9BF0'
  },
  selected: {
    borderColor: '#1D9BF0',
    background: 'rgba(29, 155, 240, 0.05)',
    boxShadow: '0 4px 16px rgba(29, 155, 240, 0.2)'
  },
  urgent: {
    borderColor: '#F44336',
    background: 'rgba(244, 67, 54, 0.05)',
    boxShadow: '0 4px 16px rgba(244, 67, 54, 0.2)',
    animation: 'pulse 2s infinite'
  }
};

export const ORDER_LIST_ANIMATIONS = {
  fadeIn: `
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
  slideIn: `
    @keyframes slideIn {
      from {
        transform: translateX(-20px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `,
  pulse: `
    @keyframes pulse {
      0%, 100% {
        box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.4);
      }
      50% {
        box-shadow: 0 0 0 8px rgba(244, 67, 54, 0);
      }
    }
  `,
  bounce: `
    @keyframes bounce {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-5px);
      }
    }
  `
};

export const ORDER_TIMELINE_STYLES = {
  container: {
    position: 'relative' as const,
    paddingRight: '48px'
  },
  line: {
    position: 'absolute' as const,
    right: '16px',
    top: '32px',
    width: '3px',
    height: 'calc(100% - 48px)',
    background: 'linear-gradient(to bottom, #1D9BF0 0%, #e0e0e0 100%)'
  },
  step: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '32px',
    position: 'relative' as const
  },
  icon: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    border: '3px solid',
    background: '#FFFFFF',
    position: 'absolute' as const,
    right: 0,
    zIndex: 1
  },
  content: {
    flex: 1,
    paddingRight: '64px'
  }
};

export const MOBILE_BREAKPOINTS = {
  xs: '320px',
  sm: '480px',
  md: '768px',
  lg: '1024px',
  xl: '1280px'
};

export const ORDER_FORM_STYLES = {
  section: {
    background: '#FFFFFF',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '20px',
    border: '1px solid #E0E0E0',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '600' as const,
    color: '#424242'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '15px',
    borderRadius: '12px',
    border: '2px solid #E0E0E0',
    background: '#FFFFFF',
    transition: 'all 0.2s ease',
    outline: 'none'
  },
  inputFocus: {
    borderColor: '#1D9BF0',
    boxShadow: '0 0 0 4px rgba(29, 155, 240, 0.1)'
  },
  error: {
    borderColor: '#F44336',
    boxShadow: '0 0 0 4px rgba(244, 67, 54, 0.1)'
  },
  errorText: {
    color: '#F44336',
    fontSize: '13px',
    marginTop: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  }
};
