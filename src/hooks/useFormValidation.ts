import { useState, useCallback } from 'react';

export interface ValidationRule<T = any> {
  validate: (value: T) => boolean;
  message: string;
}

export interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: ValidationRule[];
}

export interface FormSchema {
  [fieldName: string]: FieldValidation;
}

export interface FormErrors {
  [fieldName: string]: string | null;
}

export function useFormValidation<T extends Record<string, any>>(schema: FormSchema) {
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = useCallback((fieldName: string, value: any): string | null => {
    const rules = schema[fieldName];
    if (!rules) return null;

    if (rules.required && !value) {
      return `${fieldName.replace(/_/g, ' ')} is required`;
    }

    if (rules.minLength && value.length < rules.minLength) {
      return `Minimum length is ${rules.minLength} characters`;
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      return `Maximum length is ${rules.maxLength} characters`;
    }

    if (rules.pattern && !rules.pattern.test(value)) {
      return `Invalid format`;
    }

    if (rules.custom) {
      for (const rule of rules.custom) {
        if (!rule.validate(value)) {
          return rule.message;
        }
      }
    }

    return null;
  }, [schema]);

  const validateForm = useCallback((data: T): boolean => {
    const newErrors: FormErrors = {};
    let hasErrors = false;

    Object.keys(schema).forEach(fieldName => {
      const error = validateField(fieldName, data[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        hasErrors = true;
      }
    });

    setErrors(newErrors);
    return !hasErrors;
  }, [schema, validateField]);

  const validateFieldAndSet = useCallback((fieldName: string, value: any) => {
    const error = validateField(fieldName, value);
    setErrors(prev => ({ ...prev, [fieldName]: error }));
    return error === null;
  }, [validateField]);

  const setFieldTouched = useCallback((fieldName: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const clearFieldError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  const getFieldError = useCallback((fieldName: string): string | null => {
    return touched[fieldName] ? errors[fieldName] || null : null;
  }, [errors, touched]);

  const hasError = useCallback((fieldName: string): boolean => {
    return touched[fieldName] && !!errors[fieldName];
  }, [errors, touched]);

  return {
    errors,
    touched,
    validateForm,
    validateField: validateFieldAndSet,
    setFieldTouched,
    clearErrors,
    clearFieldError,
    getFieldError,
    hasError,
  };
}
