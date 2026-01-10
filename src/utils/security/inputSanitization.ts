import { logger } from '../../lib/logger';

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

const DANGEROUS_PATTERNS = [
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<object[\s\S]*?>[\s\S]*?<\/object>/gi,
  /<embed[\s\S]*?>/gi,
  /data:text\/html/gi,
  /vbscript:/gi,
];

const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi,
  /(;|\||&&|\|\||--|\/\*|\*\/)/g,
  /(\bOR\b.*=.*|1\s*=\s*1|'\s*OR\s*'1'\s*=\s*'1)/gi,
];

export interface SanitizationOptions {
  allowHTML?: boolean;
  maxLength?: number;
  removeNewlines?: boolean;
  trim?: boolean;
  allowNumbers?: boolean;
  allowSpecialChars?: boolean;
}

export class InputSanitizer {
  static escapeHTML(input: string): string {
    if (!input || typeof input !== 'string') return '';

    return input.replace(/[&<>"'/]/g, (char) => HTML_ENTITIES[char] || char);
  }

  static stripHTML(input: string): string {
    if (!input || typeof input !== 'string') return '';

    return input.replace(/<[^>]*>/g, '');
  }

  static removeScripts(input: string): string {
    if (!input || typeof input !== 'string') return '';

    let sanitized = input;
    DANGEROUS_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    return sanitized;
  }

  static detectSQLInjection(input: string): boolean {
    if (!input || typeof input !== 'string') return false;

    return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input));
  }

  static sanitizeString(input: unknown, options: SanitizationOptions = {}): string {
    if (typeof input !== 'string') {
      return String(input || '');
    }

    let sanitized = input;

    if (options.trim !== false) {
      sanitized = sanitized.trim();
    }

    if (!options.allowHTML) {
      sanitized = this.removeScripts(sanitized);
      sanitized = this.escapeHTML(sanitized);
    }

    if (options.removeNewlines) {
      sanitized = sanitized.replace(/[\r\n]+/g, ' ');
    }

    if (options.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.slice(0, options.maxLength);
      logger.warn('Input truncated due to length limit', {
        originalLength: input.length,
        maxLength: options.maxLength
      });
    }

    if (!options.allowSpecialChars) {
      sanitized = sanitized.replace(/[^\w\s\-.,!?@]/g, '');
    }

    if (!options.allowNumbers) {
      sanitized = sanitized.replace(/\d/g, '');
    }

    if (this.detectSQLInjection(sanitized)) {
      logger.error('Potential SQL injection attempt detected', { input: sanitized });
      throw new Error('Invalid input detected');
    }

    return sanitized;
  }

  static sanitizeEmail(email: unknown): string {
    if (typeof email !== 'string') return '';

    const sanitized = email.trim().toLowerCase();

    const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(sanitized)) {
      throw new Error('Invalid email format');
    }

    return sanitized;
  }

  static sanitizePhoneNumber(phone: unknown): string {
    if (typeof phone !== 'string') return '';

    const cleaned = phone.replace(/[^\d+\-() ]/g, '');

    if (cleaned.length < 7 || cleaned.length > 20) {
      throw new Error('Invalid phone number format');
    }

    return cleaned;
  }

  static sanitizeURL(url: unknown): string {
    if (typeof url !== 'string') return '';

    const sanitized = url.trim();

    try {
      const parsed = new URL(sanitized);

      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Only HTTP and HTTPS protocols are allowed');
      }

      return parsed.toString();
    } catch (error) {
      logger.warn('Invalid URL provided', { url: sanitized });
      throw new Error('Invalid URL format');
    }
  }

  static sanitizeNumber(input: unknown, options: { min?: number; max?: number; integer?: boolean } = {}): number {
    const num = Number(input);

    if (isNaN(num) || !isFinite(num)) {
      throw new Error('Invalid number format');
    }

    if (options.integer && !Number.isInteger(num)) {
      throw new Error('Number must be an integer');
    }

    if (options.min !== undefined && num < options.min) {
      throw new Error(`Number must be at least ${options.min}`);
    }

    if (options.max !== undefined && num > options.max) {
      throw new Error(`Number must be at most ${options.max}`);
    }

    return num;
  }

  static sanitizeBoolean(input: unknown): boolean {
    if (typeof input === 'boolean') return input;
    if (typeof input === 'string') {
      const lower = input.toLowerCase();
      if (lower === 'true' || lower === '1' || lower === 'yes') return true;
      if (lower === 'false' || lower === '0' || lower === 'no') return false;
    }
    if (typeof input === 'number') {
      return input !== 0;
    }
    return Boolean(input);
  }

  static sanitizeObjectKeys<T extends Record<string, any>>(obj: T): T {
    if (!obj || typeof obj !== 'object') return obj;

    const sanitized: any = {};

    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = this.sanitizeString(key, {
        maxLength: 100,
        allowSpecialChars: false,
        removeNewlines: true
      });

      if (typeof value === 'string') {
        sanitized[sanitizedKey] = this.sanitizeString(value, { maxLength: 10000 });
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[sanitizedKey] = this.sanitizeObjectKeys(value);
      } else {
        sanitized[sanitizedKey] = value;
      }
    }

    return sanitized;
  }

  static sanitizeArrayInput<T>(arr: unknown, itemSanitizer: (item: unknown) => T): T[] {
    if (!Array.isArray(arr)) {
      throw new Error('Input must be an array');
    }

    return arr.map(item => itemSanitizer(item));
  }

  static sanitizePath(path: unknown): string {
    if (typeof path !== 'string') return '';

    let sanitized = path.trim();

    sanitized = sanitized.replace(/\.\./g, '');
    sanitized = sanitized.replace(/[<>"|*?]/g, '');

    if (sanitized.includes('~') || sanitized.startsWith('/etc/') || sanitized.startsWith('/sys/')) {
      throw new Error('Access to system paths is not allowed');
    }

    return sanitized;
  }

  static sanitizeSearchQuery(query: unknown, options: { maxLength?: number } = {}): string {
    if (typeof query !== 'string') return '';

    let sanitized = query.trim();

    const maxLength = options.maxLength || 200;
    if (sanitized.length > maxLength) {
      sanitized = sanitized.slice(0, maxLength);
    }

    sanitized = this.removeScripts(sanitized);

    if (this.detectSQLInjection(sanitized)) {
      logger.error('SQL injection attempt in search query', { query: sanitized });
      throw new Error('Invalid search query');
    }

    return sanitized;
  }

  static sanitizeUserInput(input: {
    name?: unknown;
    email?: unknown;
    phone?: unknown;
    address?: unknown;
    notes?: unknown;
  }): {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
  } {
    const sanitized: any = {};

    if (input.name) {
      sanitized.name = this.sanitizeString(input.name, {
        maxLength: 100,
        removeNewlines: true,
        trim: true
      });
    } else {
      throw new Error('Name is required');
    }

    if (input.email) {
      sanitized.email = this.sanitizeEmail(input.email);
    }

    if (input.phone) {
      sanitized.phone = this.sanitizePhoneNumber(input.phone);
    }

    if (input.address) {
      sanitized.address = this.sanitizeString(input.address, {
        maxLength: 500,
        trim: true,
        allowSpecialChars: true
      });
    }

    if (input.notes) {
      sanitized.notes = this.sanitizeString(input.notes, {
        maxLength: 2000,
        trim: true,
        allowSpecialChars: true
      });
    }

    return sanitized;
  }

  static sanitizeProductInput(input: {
    name: unknown;
    sku?: unknown;
    price: unknown;
    description?: unknown;
    category?: unknown;
  }): {
    name: string;
    sku?: string;
    price: number;
    description?: string;
    category?: string;
  } {
    return {
      name: this.sanitizeString(input.name, { maxLength: 200, trim: true }),
      sku: input.sku ? this.sanitizeString(input.sku, { maxLength: 100, removeNewlines: true }) : undefined,
      price: this.sanitizeNumber(input.price, { min: 0, max: 1000000000 }),
      description: input.description ? this.sanitizeString(input.description, { maxLength: 5000, allowSpecialChars: true }) : undefined,
      category: input.category ? this.sanitizeString(input.category, { maxLength: 100 }) : undefined,
    };
  }

  static sanitizeBusinessInput(input: {
    name: unknown;
    description?: unknown;
    address?: unknown;
    phone?: unknown;
    email?: unknown;
  }): {
    name: string;
    description?: string;
    address?: string;
    phone?: string;
    email?: string;
  } {
    return {
      name: this.sanitizeString(input.name, { maxLength: 200, trim: true }),
      description: input.description ? this.sanitizeString(input.description, { maxLength: 2000, allowSpecialChars: true }) : undefined,
      address: input.address ? this.sanitizeString(input.address, { maxLength: 500, allowSpecialChars: true }) : undefined,
      phone: input.phone ? this.sanitizePhoneNumber(input.phone) : undefined,
      email: input.email ? this.sanitizeEmail(input.email) : undefined,
    };
  }
}

export function withSanitization<T extends (...args: any[]) => any>(
  fn: T,
  argSanitizers: Array<(arg: any) => any>
): T {
  return ((...args: any[]) => {
    const sanitizedArgs = args.map((arg, index) => {
      const sanitizer = argSanitizers[index];
      return sanitizer ? sanitizer(arg) : arg;
    });

    return fn(...sanitizedArgs);
  }) as T;
}

export const sanitize = InputSanitizer;
