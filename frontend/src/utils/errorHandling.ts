/**
 * Extract a readable error message from backend responses.
 * Handles nested error objects, plain messages, or string responses.
 */
export const extractBackendMessage = (error: any): string | undefined => {
    if (error?.response?.data) {
        const data = error.response.data;
        // Nested error object with message
        if (data?.error?.message) {
            return data.error.message;
        }
        // Direct message field
        if (data?.message) {
            return data.message;
        }
        // If the response itself is a string
        if (typeof data === 'string') {
            return data;
        }
    }
    return undefined;
};
/*
 * Centralized error handling utilities
 * Provides consistent error handling patterns across the application
 */

import { toast } from 'react-toastify';

export interface AppError {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: number;
    context?: string;
}

export interface APIErrorResponse {
    error?: AppError;
    [key: string]: any;
}

/**
 * Handle API errors with user-friendly messages
 */
export const handleApiError = (error: any, context?: string): void => {
    console.error(`[API Error${context ? ` - ${context}` : ''}]:`, error);

    // Attempt to extract a user-friendly message from various backend error formats
    const extractedMessage = extractBackendMessage(error);
    if (extractedMessage) {
        toast.error(extractedMessage);
        return;
    }

    if (error.response?.data) {
        const data = error.response.data;
        
        // Handle validation errors (field-specific errors)
        if (typeof data === 'object' && !data.message) {
            Object.entries(data).forEach(([field, messages]) => {
                if (Array.isArray(messages)) {
                    messages.forEach(msg => toast.error(`${field}: ${msg}`));
                } else if (typeof messages === 'string') {
                    toast.error(`${field}: ${messages}`);
                }
            });
            return;
        }

        // Handle structured error responses
        if (data.message) {
            toast.error(data.message);
            return;
        }

        // Handle generic error responses
        if (typeof data === 'string') {
            toast.error(data);
            return;
        }
    }

    // Handle network errors
    if (error.code === 'NETWORK_ERROR' || !error.response) {
        toast.error('Network error. Please check your connection and try again.');
        return;
    }

    // Handle HTTP status codes
    switch (error.response?.status) {
        case 400:
            toast.error('Invalid request. Please check your input and try again.');
            break;
        case 401:
            toast.error('Authentication required. Please log in again.');
            break;
        case 403:
            toast.error('You do not have permission to perform this action.');
            break;
        case 404:
            toast.error('The requested resource was not found.');
            break;
        case 500:
            toast.error('Server error. Please try again later.');
            break;
        default:
            toast.error('An unexpected error occurred. Please try again.');
    }
};

/**
 * Handle form validation errors
 */
export const handleValidationError = (field: string, message: string): void => {
    toast.error(`${field}: ${message}`);
};

/**
 * Handle success messages
 */
export const handleSuccess = (message: string): void => {
    toast.success(message);
};

/**
 * Handle info messages
 */
export const handleInfo = (message: string): void => {
    toast.info(message);
};

/**
 * Create a standardized error object
 */
export const createError = (
    code: string,
    message: string,
    details?: Record<string, any>,
    context?: string
): AppError => ({
    code,
    message,
    details,
    timestamp: Date.now(),
    context,
});

/**
 * Log errors for debugging
 */
export const logError = (error: AppError | Error, context?: string): void => {
    const errorInfo = {
        timestamp: new Date().toISOString(),
        context,
        error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
        } : error,
    };
    
    console.error('[Error Log]:', errorInfo);
    
    // In production, you might want to send this to an error tracking service
    // Example: Sentry.captureException(error);
};

/**
 * Retry mechanism for failed operations
 */
export const withRetry = async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
): Promise<T> => {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error as Error;
            
            if (attempt === maxRetries) {
                throw lastError;
            }
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
    }
    
    throw lastError!;
};

/**
 * Validation helper functions
 */
export const validateRequired = (value: any, fieldName: string): string | null => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
        return `${fieldName} is required`;
    }
    return null;
};

export const validateEmail = (email: string): string | null => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return 'Please enter a valid email address';
    }
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
        return `${fieldName} must be no more than ${maxLength} characters`;
    }
    return null;
};

export const validatePositiveNumber = (value: number, fieldName: string): string | null => {
    if (isNaN(value) || value <= 0) {
        return `${fieldName} must be a positive number`;
    }
    return null;
};