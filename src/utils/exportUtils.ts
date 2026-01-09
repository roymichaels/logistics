import { logger } from '../lib/logger';

/**
 * Convert data to CSV format and trigger download
 * @param data Array of objects to export
 * @param filename Desired filename (without .csv extension)
 * @param columnMapping Optional mapping of object keys to CSV column headers
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columnMapping?: Record<keyof T, string>
): void {
  try {
    if (!data || data.length === 0) {
      logger.warn('[exportToCSV] No data to export');
      alert('אין נתונים לייצוא');
      return;
    }

    // Get headers from first object
    const keys = Object.keys(data[0]) as (keyof T)[];
    const headers = keys.map(key => columnMapping?.[key] || String(key));

    // Convert data to CSV rows
    const csvRows = [
      headers.join(','), // Header row
      ...data.map(row =>
        keys
          .map(key => {
            const value = row[key];
            // Handle null/undefined
            if (value === null || value === undefined) return '';
            // Handle strings with commas or quotes - wrap in quotes and escape internal quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            // Handle objects/arrays - convert to JSON string
            if (typeof value === 'object') {
              return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
            }
            return String(value);
          })
          .join(',')
      )
    ];

    // Create blob and download
    const csvContent = csvRows.join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel Hebrew support
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    logger.info('[exportToCSV] Export successful:', filename);
  } catch (error) {
    logger.error('[exportToCSV] Export failed:', error);
    alert('שגיאה בייצוא הנתונים');
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency = 'ILS'): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Format number with thousands separator
 */
export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('he-IL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

/**
 * Format date in Hebrew locale
 */
export function formatDate(date: string | Date, style: 'short' | 'medium' | 'long' | 'full' = 'short'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('he-IL', { dateStyle: style }).format(dateObj);
}

/**
 * Format date and time in Hebrew locale
 */
export function formatDateTime(date: string | Date, dateStyle: 'short' | 'medium' | 'long' = 'short', timeStyle: 'short' | 'medium' | 'long' = 'short'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('he-IL', { dateStyle, timeStyle }).format(dateObj);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Convert snake_case to Title Case
 */
export function toTitleCase(str: string): string {
  return str
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}
