/**
 * Validation utilities and form helpers
 * Centralized location for all validation logic and form utilities
 */

import { ERROR_MESSAGES, VALIDATION_PATTERNS } from './codeCleanup';

// Form validation result type
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

// Field validation result type
export interface FieldValidationResult {
    isValid: boolean;
    error?: string;
}

/**
 * Validate required fields
 */
export const validateRequired = (value: any, fieldName: string = 'Field'): FieldValidationResult => {
    if (value === null || value === undefined || value === '' || (typeof value === 'string' && value.trim() === '')) {
        return {
            isValid: false,
            error: `${fieldName} is required`,
        };
    }
    return { isValid: true };
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): FieldValidationResult => {
    if (!email) {
        return { isValid: true }; // Allow empty if not required
    }
    
    if (!VALIDATION_PATTERNS.EMAIL.test(email)) {
        return {
            isValid: false,
            error: ERROR_MESSAGES.INVALID_EMAIL,
        };
    }
    
    return { isValid: true };
};

/**
 * Validate minimum length
 */
export const validateMinLength = (value: string, minLength: number, fieldName: string = 'Field'): FieldValidationResult => {
    if (!value) {
        return { isValid: true }; // Allow empty if not required
    }
    
    if (value.length < minLength) {
        return {
            isValid: false,
            error: ERROR_MESSAGES.MIN_LENGTH(minLength),
        };
    }
    
    return { isValid: true };
};

/**
 * Validate maximum length
 */
export const validateMaxLength = (value: string, maxLength: number, fieldName: string = 'Field'): FieldValidationResult => {
    if (!value) {
        return { isValid: true }; // Allow empty if not required
    }
    
    if (value.length > maxLength) {
        return {
            isValid: false,
            error: ERROR_MESSAGES.MAX_LENGTH(maxLength),
        };
    }
    
    return { isValid: true };
};

/**
 * Validate positive number
 */
export const validatePositiveNumber = (value: number | string, fieldName: string = 'Field'): FieldValidationResult => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(numValue) || numValue <= 0) {
        return {
            isValid: false,
            error: `${fieldName} must be a positive number`,
        };
    }
    
    return { isValid: true };
};

/**
 * Validate currency format
 */
export const validateCurrency = (value: string, fieldName: string = 'Amount'): FieldValidationResult => {
    if (!value) {
        return { isValid: true }; // Allow empty if not required
    }
    
    if (!VALIDATION_PATTERNS.CURRENCY.test(value)) {
        return {
            isValid: false,
            error: ERROR_MESSAGES.INVALID_CURRENCY,
        };
    }
    
    return { isValid: true };
};

/**
 * Validate phone number format
 */
export const validatePhone = (phone: string): FieldValidationResult => {
    if (!phone) {
        return { isValid: true }; // Allow empty if not required
    }
    
    if (!VALIDATION_PATTERNS.PHONE.test(phone)) {
        return {
            isValid: false,
            error: ERROR_MESSAGES.INVALID_PHONE,
        };
    }
    
    return { isValid: true };
};

/**
 * Validate file size
 */
export const validateFileSize = (file: File, maxSizeInMB: number): FieldValidationResult => {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    
    if (file.size > maxSizeInBytes) {
        return {
            isValid: false,
            error: `File size must be less than ${maxSizeInMB}MB`,
        };
    }
    
    return { isValid: true };
};

/**
 * Validate file type
 */
export const validateFileType = (file: File, allowedTypes: string[]): FieldValidationResult => {
    if (!allowedTypes.includes(file.type)) {
        return {
            isValid: false,
            error: `File type must be one of: ${allowedTypes.join(', ')}`,
        };
    }
    
    return { isValid: true };
};

/**
 * Validate array has minimum items
 */
export const validateMinItems = <T>(items: T[], minItems: number, itemName: string = 'items'): FieldValidationResult => {
    if (items.length < minItems) {
        return {
            isValid: false,
            error: `Must have at least ${minItems} ${itemName}`,
        };
    }
    
    return { isValid: true };
};

/**
 * Validate array has maximum items
 */
export const validateMaxItems = <T>(items: T[], maxItems: number, itemName: string = 'items'): FieldValidationResult => {
    if (items.length > maxItems) {
        return {
            isValid: false,
            error: `Cannot have more than ${maxItems} ${itemName}`,
        };
    }
    
    return { isValid: true };
};

/**
 * Validate date is in the future
 */
export const validateFutureDate = (date: string | Date, fieldName: string = 'Date'): FieldValidationResult => {
    const dateValue = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    
    if (dateValue <= now) {
        return {
            isValid: false,
            error: `${fieldName} must be in the future`,
        };
    }
    
    return { isValid: true };
};

/**
 * Validate date is in the past
 */
export const validatePastDate = (date: string | Date, fieldName: string = 'Date'): FieldValidationResult => {
    const dateValue = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    
    if (dateValue >= now) {
        return {
            isValid: false,
            error: `${fieldName} must be in the past`,
        };
    }
    
    return { isValid: true };
};

/**
 * Validate password strength
 */
export const validatePasswordStrength = (password: string): FieldValidationResult => {
    const errors: string[] = [];
    
    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }
    
    if (errors.length > 0) {
        return {
            isValid: false,
            error: errors.join('. '),
        };
    }
    
    return { isValid: true };
};

/**
 * Validate passwords match
 */
export const validatePasswordsMatch = (password: string, confirmPassword: string): FieldValidationResult => {
    if (password !== confirmPassword) {
        return {
            isValid: false,
            error: 'Passwords do not match',
        };
    }
    
    return { isValid: true };
};

/**
 * Composite validator for multiple rules
 */
export const validateField = (value: any, rules: Array<(value: any) => FieldValidationResult>): FieldValidationResult => {
    for (const rule of rules) {
        const result = rule(value);
        if (!result.isValid) {
            return result;
        }
    }
    
    return { isValid: true };
};

/**
 * Validate entire form object
 */
export const validateForm = <T extends Record<string, any>>(
    formData: T,
    validationRules: Record<keyof T, Array<(value: any) => FieldValidationResult>>
): ValidationResult => {
    const errors: string[] = [];
    
    Object.entries(validationRules).forEach(([field, rules]) => {
        const fieldValue = formData[field];
        const fieldResult = validateField(fieldValue, rules);
        
        if (!fieldResult.isValid && fieldResult.error) {
            errors.push(`${field}: ${fieldResult.error}`);
        }
    });
    
    return {
        isValid: errors.length === 0,
        errors,
    };
};

/**
 * React Hook Form validation helpers
 */
export const createValidationRules = (validators: Array<(value: any) => FieldValidationResult>) => ({
    validate: (value: any) => {
        for (const validator of validators) {
            const result = validator(value);
            if (!result.isValid) {
                return result.error;
            }
        }
        return true;
    },
});

/**
 * Common validation rule sets
 */
export const commonValidationRules = {
    required: (fieldName: string) => (value: any) => validateRequired(value, fieldName),
    email: () => validateEmail,
    minLength: (min: number, fieldName: string) => (value: string) => validateMinLength(value, min, fieldName),
    maxLength: (max: number, fieldName: string) => (value: string) => validateMaxLength(value, max, fieldName),
    positiveNumber: (fieldName: string) => (value: number | string) => validatePositiveNumber(value, fieldName),
    currency: (fieldName: string) => (value: string) => validateCurrency(value, fieldName),
    phone: () => validatePhone,
    minItems: <T>(min: number, itemName: string) => (items: T[]) => validateMinItems(items, min, itemName),
    maxItems: <T>(max: number, itemName: string) => (items: T[]) => validateMaxItems(items, max, itemName),
} as const;