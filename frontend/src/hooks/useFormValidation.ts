import { useState, useCallback, useMemo } from 'react';
import { FieldValidationResult, ValidationResult } from '../utils/validationUtils';

// Form field configuration
interface FieldConfig<T = any> {
  validators?: Array<(value: T) => FieldValidationResult>;
  required?: boolean;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

// Form configuration
type FormConfig<T extends Record<string, any>> = {
  [K in keyof T]: FieldConfig<T[K]>;
};

// Form state
interface FormState<T extends Record<string, any>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
}

// Form actions
interface FormActions<T extends Record<string, any>> {
  setValue: (field: keyof T, value: T[keyof T]) => void;
  setValues: (values: Partial<T>) => void;
  setError: (field: keyof T, error: string) => void;
  setErrors: (errors: Partial<Record<keyof T, string>>) => void;
  clearError: (field: keyof T) => void;
  clearErrors: () => void;
  setTouched: (field: keyof T, touched?: boolean) => void;
  setFieldTouched: (touched: Partial<Record<keyof T, boolean>>) => void;
  validateField: (field: keyof T) => boolean;
  validateForm: () => boolean;
  resetForm: (values?: Partial<T>) => void;
  handleSubmit: (onSubmit: (values: T) => Promise<void> | void) => (e?: React.FormEvent) => Promise<void>;
  getFieldProps: (field: keyof T) => {
    value: string | T[keyof T];
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    error?: string;
    isInvalid: boolean;
  };
}

export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  config: FormConfig<T>
): FormState<T> & FormActions<T> {
  const [values, setValuesState] = useState<T>(initialValues);
  const [errors, setErrorsState] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouchedState] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Computed state
  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  const isDirty = useMemo(() => {
    return Object.keys(values).some(key => values[key] !== initialValues[key]);
  }, [values, initialValues]);

  // Validate a single field
  const validateField = useCallback((field: keyof T): boolean => {
    const fieldConfig = config[field];
    const value = values[field];
    
    // Check required validation
    if (fieldConfig?.required && (value === null || value === undefined || value === '')) {
      setErrorsState(prev => ({
        ...prev,
        [field]: `${String(field)} is required`
      }));
      return false;
    }

    // Run custom validators
    if (fieldConfig?.validators) {
      for (const validator of fieldConfig.validators) {
        const result = validator(value);
        if (!result.isValid) {
          setErrorsState(prev => ({
            ...prev,
            [field]: result.error || 'Invalid value'
          }));
          return false;
        }
      }
    }

    // Clear error if validation passes
    setErrorsState(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
    
    return true;
  }, [values, config]);

  // Validate entire form
  const validateForm = useCallback((): boolean => {
    let isFormValid = true;
    const newErrors: Partial<Record<keyof T, string>> = {};

    Object.keys(config).forEach(fieldKey => {
      const field = fieldKey as keyof T;
      const fieldConfig = config[field];
      const value = values[field];

      // Check required validation
      if (fieldConfig?.required && (value === null || value === undefined || value === '')) {
        newErrors[field] = `${String(field)} is required`;
        isFormValid = false;
        return;
      }

      // Run custom validators
      if (fieldConfig?.validators) {
        for (const validator of fieldConfig.validators) {
          const result = validator(value);
          if (!result.isValid) {
            newErrors[field] = result.error || 'Invalid value';
            isFormValid = false;
            break;
          }
        }
      }
    });

    setErrorsState(newErrors);
    return isFormValid;
  }, [values, config]);

  // Actions
  const setValue = useCallback((field: keyof T, value: T[keyof T]): void => {
    setValuesState(prev => ({ ...prev, [field]: value }));
    
    // Validate on change if configured
    const fieldConfig = config[field];
    if (fieldConfig?.validateOnChange && touched[field]) {
      setTimeout(() => validateField(field), 0);
    }
  }, [config, touched, validateField]);

  const setValues = useCallback((newValues: Partial<T>): void => {
    setValuesState(prev => ({ ...prev, ...newValues }));
  }, []);

  const setError = useCallback((field: keyof T, error: string): void => {
    setErrorsState(prev => ({ ...prev, [field]: error }));
  }, []);

  const setErrors = useCallback((newErrors: Partial<Record<keyof T, string>>): void => {
    setErrorsState(newErrors);
  }, []);

  const clearError = useCallback((field: keyof T): void => {
    setErrorsState(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const clearErrors = useCallback((): void => {
    setErrorsState({});
  }, []);

  const setTouched = useCallback((field: keyof T, touchedValue = true): void => {
    setTouchedState(prev => ({ ...prev, [field]: touchedValue }));
  }, []);

  const setFieldTouched = useCallback((newTouched: Partial<Record<keyof T, boolean>>): void => {
    setTouchedState(prev => ({ ...prev, ...newTouched }));
  }, []);

  const resetForm = useCallback((newValues?: Partial<T>): void => {
    const resetValues = newValues ? { ...initialValues, ...newValues } : initialValues;
    setValuesState(resetValues);
    setErrorsState({});
    setTouchedState({});
    setIsSubmitting(false);
  }, [initialValues]);

  const handleSubmit = useCallback((onSubmit: (values: T) => Promise<void> | void) => {
    return async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }

      setIsSubmitting(true);
      
      try {
        // Mark all fields as touched
        const allTouched = Object.keys(config).reduce((acc, key) => {
          acc[key as keyof T] = true;
          return acc;
        }, {} as Record<keyof T, boolean>);
        setTouchedState(allTouched);

        // Validate form
        if (!validateForm()) {
          return;
        }

        // Submit form
        await onSubmit(values);
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    };
  }, [values, config, validateForm]);

  const getFieldProps = useCallback((field: keyof T) => {
    return {
      value: values[field] ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setValue(field, e.target.value as T[keyof T]);
      },
      onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setTouched(field, true);
        
        // Validate on blur if configured
        const fieldConfig = config[field];
        if (fieldConfig?.validateOnBlur) {
          setTimeout(() => validateField(field), 0);
        }
      },
      error: touched[field] ? errors[field] : undefined,
      isInvalid: !!(touched[field] && errors[field]),
    };
  }, [values, errors, touched, config, setValue, setTouched, validateField]);

  return {
    // State
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    isDirty,
    
    // Actions
    setValue,
    setValues,
    setError,
    setErrors,
    clearError,
    clearErrors,
    setTouched,
    setFieldTouched,
    validateField,
    validateForm,
    resetForm,
    handleSubmit,
    getFieldProps,
  };
}

// Utility function to create field configurations
export const createFieldConfig = <T>(config: {
  required?: boolean;
  validators?: Array<(value: T) => FieldValidationResult>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}): FieldConfig<T> => config;

// Common field configurations
export const fieldConfigs = {
  required: (validateOnBlur = true) => createFieldConfig({
    required: true,
    validateOnBlur,
  }),
  
  email: (required = false, validateOnBlur = true) => createFieldConfig({
    required,
    validateOnBlur,
    validators: [
      (value: string) => {
        if (!value && !required) return { isValid: true };
        if (!value) return { isValid: false, error: 'Email is required' };
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return { isValid: false, error: 'Please enter a valid email address' };
        }
        
        return { isValid: true };
      }
    ],
  }),
  
  minLength: (min: number, required = false, validateOnBlur = true) => createFieldConfig({
    required,
    validateOnBlur,
    validators: [
      (value: string) => {
        if (!value && !required) return { isValid: true };
        if (!value) return { isValid: false, error: 'This field is required' };
        
        if (value.length < min) {
          return { isValid: false, error: `Must be at least ${min} characters` };
        }
        
        return { isValid: true };
      }
    ],
  }),
  
  positiveNumber: (required = false, validateOnBlur = true) => createFieldConfig({
    required,
    validateOnBlur,
    validators: [
      (value: string | number) => {
        if (!value && !required) return { isValid: true };
        if (!value) return { isValid: false, error: 'This field is required' };
        
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(numValue) || numValue <= 0) {
          return { isValid: false, error: 'Must be a positive number' };
        }
        
        return { isValid: true };
      }
    ],
  }),
};