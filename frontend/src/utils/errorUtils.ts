import { AxiosError } from 'axios';

/**
 * Error response structure from backend
 */
export interface BackendErrorResponse {
    error?: {
        code?: string;
        message?: string;
        details?: string | Record\u003cstring, any\u003e;
    };
    detail?: string;
    [key: string]: any; // For field-specific validation errors
}

/**
 * Extract a user-friendly error message from various error formats
 */
export function extractErrorMessage(error: unknown): string {
    // Handle AxiosError
    if (error instanceof Error && 'isAxiosError' in error) {
        const axiosError = error as AxiosError\u003cBackendErrorResponse\u003e;
        
        // Check for backend error response
        if (axiosError.response?.data) {
            const data = axiosError.response.data;
            
            // Newformat: {error: {code, message, details}}
            if (data.error) {
                if (typeof data.error === 'string') {
                    return data.error;
                }
                if (data.error.message) {
                    return data.error.details 
                        ? `${data.error.message}: ${formatDetails(data.error.details)}`
                        : data.error.message;
                }
            }
            
            // DRF format: {detail: "message"}
            if (data.detail) {
                return data.detail;
            }
            
            // Validation errors: {field_name: ["error1", "error2"]}
            const validationErrors = extractValidationErrors(data);
            if (validationErrors) {
                return validationErrors;
            }
            
            // Fallback to stringified data
            return JSON.stringify(data);
        }
        
        // Network errors
        if (axiosError.code === 'ERR_NETWORK') {
            return 'Network error. Please check your connection and try again.';
        }
        
        if (axiosError.code === 'ECONNABORTED' || axiosError.message.includes('timeout')) {
            return 'Request timed out. The file might be too large or the connection is slow.';
        }
        
        // HTTP status based messages
        if (axiosError.response?.status) {
            const status = axiosError.response.status;
            switch (status) {
                case 400:
                    return 'Invalid request. Please check your input and try again.';
                case 401:
                    return 'Authentication required. Please log in and try again.';
                case 403:
                    return 'You don\'t have permission to perform this action.';
                case 404:
                    return 'The requested resource was not found.';
                case 413:
                    return 'File is too large. Please upload a smaller file.';
                case 415:
                    return 'Unsupported file type. Please upload a valid document.';
                case 500:
                    return 'Server error. Please try again later.';
                case 502:
                case 503:
                    return 'Service temporarily unavailable. Please try again in a moment.';
                default:
                    return `Server returned error (${status}). Please try again.`;
            }
        }
        
        // Generic axios error message
        return axiosError.message || 'An unexpected error occurred';
    }
    
    // Regular Error object
    if (error instanceof Error) {
        return error.message;
    }
    
    // String error
    if (typeof error === 'string') {
        return error;
    }
    
    // Unknown error
    return 'An unexpected error occurred. Please try again.';
}

/**
 * Format error details into a readable string
 */
function formatDetails(details: string | Record\u003cstring, any\u003e): string {
    if (typeof details === 'string') {
        return details;
    }
    
    if (typeof details === 'object' && details !== null) {
        const messages = Object.entries(details)
            .map(([key, value]) =\u003e {
                if (Array.isArray(value)) {
                    return `${key}: ${value.join(', ')}`;
                }
                return `${key}: ${String(value)}`;
            });
        return messages.join('; ');
    }
    
    return String(details);
}

/**
 * Extract validation errors from DRF response
 */
function extractValidationErrors(data: Record\u003cstring, any\u003e): string | null {
    const errors: string[] = [];
    
    for (const [field, value] of Object.entries(data)) {
        // Skip non-error fields
        if (['error', 'detail', 'message', 'status'].includes(field)) {
            continue;
        }
        
        if (Array.isArray(value)) {
            const fieldErrors = value.filter(v =\u003e typeof v === 'string');
            if (fieldErrors.length \u003e 0) {
                const fieldLabel = field.replace(/_/g, ' ').replace(/\b\w/g, l =\u003e l.toUpperCase());
                errors.push(`${fieldLabel}: ${fieldErrors.join(', ')}`);
            }
        } else if (typeof value === 'string') {
            const fieldLabel = field.replace(/_/g, ' ').replace(/\b\w/g, l =\u003e l.toUpperCase());
            errors.push(`${fieldLabel}: ${value}`);
        }
    }
    
    return errors.length \u003e 0 ? errors.join('; ') : null;
}

/**
 * Check if error is a file validation error
 */
export function isFileValidationError(error: unknown): boolean {
    const message = extractErrorMessage(error).toLowerCase();
    return (
        message.includes('file') ||
        message.includes('upload') ||
        message.includes('size') ||
        message.includes('type') ||
        message.includes('extension') ||
        message.includes('mime')
    );
}

/**
 * Get a user-friendly title for error notifications
 */
export function getErrorTitle(error: unknown): string {
    if (error instanceof Error && 'isAxiosError' in error) {
        const axiosError = error as AxiosError\u003cBackendErrorResponse\u003e;
        
        if (axiosError.response?.data?.error?.code) {
            const code = axiosError.response.data.error.code;
            return formatErrorCode(code);
        }
        
        if (axiosError.response?.status) {
            const status = axiosError.response.status;
            if (status \u003e= 500) return 'Server Error';
            if (status === 404) return 'Not Found';
            if (status === 403) return 'Permission Denied';
            if (status === 401) return 'Authentication Required';
            if (status === 400) return 'Validation Error';
        }
    }
    
    return 'Error';
}

/**
 * Convert error codes to user-friendly titles
 */
function formatErrorCode(code: string): string {
    return code
        .split('_')
        .map(word =\u003e word.charAt(0) + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Check if error requires user action (vs system error)
 */
export function requiresUserAction(error: unknown): boolean {
    if (error instanceof Error && 'isAxiosError' in error) {
        const axiosError = error as AxiosError;
        const status = axiosError.response?.status;
        
        // Client errors (4xx) usually require user action
        // Server errors (5xx) are usually temporary
        return status \u003e= 400 \u0026\u0026 status \u003c 500;
    }
    
    return true; // Default to requiring action
}
