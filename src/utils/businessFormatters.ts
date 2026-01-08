export function formatCurrency(amount: number, currency: string = 'ILS'): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('he-IL').format(num);
}

export function formatPercentage(value: number, decimals: number = 0): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds} שניות`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} דקות`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} שעות`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ימים`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} חודשים`;

  const years = Math.floor(months / 12);
  return `${years} שנים`;
}

export function formatDate(date: Date | string, format: 'short' | 'long' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (format === 'long') {
    return new Intl.DateTimeFormat('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  }

  return new Intl.DateTimeFormat('he-IL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
}

export function formatBusinessType(type: string): string {
  const types: Record<string, string> = {
    retail: 'קמעונאות',
    wholesale: 'סיטונאות',
    restaurant: 'מסעדה',
    cafe: 'בית קפה',
    grocery: 'מכולת',
    pharmacy: 'בית מרקחת',
    electronics: 'אלקטרוניקה',
    clothing: 'ביגוד',
    other: 'אחר'
  };

  return types[type] || type;
}

export function formatOrderStatus(status: string): { label: string; color: string } {
  const statuses: Record<string, { label: string; color: string }> = {
    pending: { label: 'ממתין', color: '#f59e0b' },
    confirmed: { label: 'מאושר', color: '#3b82f6' },
    preparing: { label: 'בהכנה', color: '#8b5cf6' },
    ready: { label: 'מוכן', color: '#10b981' },
    in_delivery: { label: 'במשלוח', color: '#06b6d4' },
    delivered: { label: 'נמסר', color: '#22c55e' },
    cancelled: { label: 'בוטל', color: '#ef4444' }
  };

  return statuses[status] || { label: status, color: '#6b7280' };
}

export function formatDriverStatus(status: string): { label: string; color: string } {
  const statuses: Record<string, { label: string; color: string }> = {
    available: { label: 'זמין', color: '#22c55e' },
    active: { label: 'פעיל', color: '#3b82f6' },
    on_break: { label: 'בהפסקה', color: '#f59e0b' },
    offline: { label: 'לא מחובר', color: '#6b7280' }
  };

  return statuses[status] || { label: status, color: '#6b7280' };
}
