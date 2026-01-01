import { useState, useCallback, ChangeEvent } from 'react';

interface UseFormHandlerOptions<T> {
  initialValues: T;
  onSubmit: (values: T) => Promise<void> | void;
  validate?: (values: T) => Record<string, string>;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface UseFormHandlerResult<T> {
  values: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isDirty: boolean;
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleBlur: (field: string) => void;
  setFieldValue: (field: keyof T, value: unknown) => void;
  setFieldError: (field: string, error: string) => void;
  setValues: (values: T) => void;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  reset: () => void;
  validateField: (field: string) => void;
  validateForm: () => boolean;
}

export function useFormHandler<T extends Record<string, any>>({
  initialValues,
  onSubmit,
  validate,
  onSuccess,
  onError,
}: UseFormHandlerOptions<T>): UseFormHandlerResult<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      const checked = (e.target as HTMLInputElement).checked;

      setValues((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
      setIsDirty(true);

      if (touched[name] && errors[name]) {
        const newErrors = { ...errors };
        delete newErrors[name];
        setErrors(newErrors);
      }
    },
    [touched, errors]
  );

  const handleBlur = useCallback(
    (field: string) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      validateField(field);
    },
    [values, validate]
  );

  const setFieldValue = useCallback((field: keyof T, value: unknown) => {
    setValues((prev) => ({
      ...prev,
      [field]: value,
    }));
    setIsDirty(true);
  }, []);

  const setFieldError = useCallback((field: string, error: string) => {
    setErrors((prev) => ({ ...prev, [field]: error }));
  }, []);

  const validateField = useCallback(
    (field: string) => {
      if (!validate) return;

      const validationErrors = validate(values);
      if (validationErrors[field]) {
        setErrors((prev) => ({ ...prev, [field]: validationErrors[field] }));
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [values, validate]
  );

  const validateForm = useCallback((): boolean => {
    if (!validate) return true;

    const validationErrors = validate(values);
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  }, [values, validate]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      if (!validateForm()) {
        return;
      }

      setIsSubmitting(true);

      try {
        await onSubmit(values);
        onSuccess?.();
        setIsDirty(false);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        onError?.(error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validateForm, onSubmit, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
    setIsDirty(false);
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isDirty,
    handleChange,
    handleBlur,
    setFieldValue,
    setFieldError,
    setValues,
    handleSubmit,
    reset,
    validateField,
    validateForm,
  };
}
