export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-()]{10,}$/;
  return phoneRegex.test(phone);
};

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const isValidWalletAddress = (address: string, type: 'eth' | 'sol' | 'ton' = 'eth'): boolean => {
  if (type === 'eth') {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
  if (type === 'sol') {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  }
  if (type === 'ton') {
    return /^[a-zA-Z0-9_-]{48}$/.test(address);
  }
  return false;
};

export const isValidPassword = (password: string, minLength = 8): boolean => {
  if (password.length < minLength) return false;

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  return hasUpperCase && hasLowerCase && hasNumber;
};

export const isEmpty = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

export const isPositiveNumber = (value: unknown): boolean => {
  const num = Number(value);
  return !isNaN(num) && num > 0;
};

export const isInRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};

export const validateRequired = (value: unknown, fieldName: string): string | null => {
  return isEmpty(value) ? `${fieldName} is required` : null;
};

export const validateEmail = (email: string): string | null => {
  if (isEmpty(email)) return 'Email is required';
  if (!isValidEmail(email)) return 'Invalid email format';
  return null;
};

export const validatePhone = (phone: string): string | null => {
  if (isEmpty(phone)) return 'Phone number is required';
  if (!isValidPhone(phone)) return 'Invalid phone number format';
  return null;
};

export const validateMinLength = (value: string, minLength: number, fieldName: string): string | null => {
  if (value.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters`;
  }
  return null;
};

export const validateMaxLength = (value: string, maxLength: number, fieldName: string): string | null => {
  if (value.length > maxLength) {
    return `${fieldName} must not exceed ${maxLength} characters`;
  }
  return null;
};
