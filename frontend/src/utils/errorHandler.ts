import { AxiosError } from 'axios';
import { toast } from 'react-toastify';

/**
 * Standard API error response structure from backend
 */
export interface APIErrorResponse {
    error?: {
        code?: string;
        message?: string;
        details?: Record<string, string[] | string>;
    };
    message?: string;
    detail?: string;
    non_field_errors?: string[];
    [key: string]: any; // DRF field validation errors
}

/**
 * Extract user-friendly error message from various backend error formats
 * 
 * Handles:
 * - Custom backend errors with error.message
 * - DRF validation errors with field-specific messages
 * - Generic HTTP errors
 * - Network errors
 */
export function extractErrorMessage(error: unknown, fallback: string = 'An error occurred'): string {
    // Handle non-Error objects
    if (!error) {
        return fallback;
    }

    // Handle Axios errors
    if (isAxiosError(error)) {
        const response = error.response?.data as APIErrorResponse;

        // Priority 1: Custom error.message format from backend
        if (response?.error?.message) {
            return response.error.message;
        }

        // Priority 2: Simple message field
        if (response?.message) {
            return response.message;
        }

        // Priority 3: DRF detail field
        if (response?.detail) {
            return typeof response.detail === 'string' 
                ? response.detail 
                : JSON.stringify(response.detail);
        }

        // Priority 4: non_field_errors (DRF)
        if (response?.non_field_errors && Array.isArray(response.non_field_errors)) {
            return response.non_field_errors.join(', ');
        }

        // Priority 5: Field-specific validation errors (DRF)
        if (response && typeof response === 'object') {
            const fieldErrors: string[] = [];
            
            Object.keys(response).forEach(field => {
                const value = response[field];
                
                // Skip known meta fields
                if (['error', 'message', 'detail', 'status', 'statusText'].includes(field)) {
                    return;
                }

                if (Array.isArray(value)) {
                    fieldErrors.push(`${field}: ${value.join(', ')}`);
                } else if (typeof value === 'string') {
                    fieldErrors.push(`${field}: ${value}`);
                } else if (value && typeof value === 'object' && 'message' in value) {
                    fieldErrors.push(`${field}: ${value.message}`);
                }
            });

            if (fieldErrors.length > 0) {
                return fieldErrors.join('; ');
            }
        }

        // Priority 6: HTTP status text
        if (error.response?.statusText) {
            return `${error.response.statusText} (${error.response.status})`;
        }

        // Priority 7: Network error
        if (error.message) {
            return error.message;
        }
    }

    // Handle regular Error objects
    if (error instanceof Error) {
        return error.message;
    }

    // Handle string errors
    if (typeof error === 'string') {
        return error;
    }

    // Last resort
    return fallback;
}

/**
 * Type guard for Axios errors
 */
function isAxiosError(error: unknown): error is AxiosError<APIErrorResponse> {
    return (error as AxiosError).isAxiosError === true;
}

/**
 * Show error toast with extracted message
 * 
 * @param error - The error object from catch block
 * @param fallback - Fallback message if extraction fails
 */
export function showErrorToast(error: unknown, fallback: string = 'An error occurred'): void {
    const message = extractErrorMessage(error, fallback);
    
    // Handle specific upload errors with longer display time
    const isUploadError = isAxiosError(error) && (
        error.response?.status === 413 || // Payload Too Large
        error.response?.status === 422 || // Unprocessable Entity (validation)
        error.code === 'ECONNABORTED' ||  // Timeout
        message.toLowerCase().includes('upload') ||
        message.toLowerCase().includes('file')
    );
    
    toast.error(message, {
        autoClose: isUploadError ? 8000 : 5000, // Longer for upload errors
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
    });
}

/**
 * Show success toast
 */
export function showSuccessToast(message: string): void {
    toast.success(message, {
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
    });
}

/**
 * Show info toast
 */
export function showInfoToast(message: string): void {
    toast.info(message, {
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
    });
}

/**
 * Show warning toast
 */
export function showWarningToast(message: string): void {
    toast.warning(message, {
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
    });
}

/**
 * Extract detailed error information for logging
 */
export function getErrorDetails(error: unknown): {
    message: string;
    status?: number;
    code?: string;
    details?: any;
} {
    if (isAxiosError(error)) {
        const response = error.response?.data as APIErrorResponse;
        return {
            message: extractErrorMessage(error),
            status: error.response?.status,
            code: response?.error?.code,
            details: response?.error?.details || response,
        };
    }

    return {
        message: extractErrorMessage(error),
    };
}
