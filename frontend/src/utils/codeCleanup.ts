/**
 * Code cleanup utilities and constants
 * Centralized location for reusable utility functions and constants
 */

// Common TypeScript interfaces for consistent typing
export interface BaseComponentProps {
    className?: string;
    children?: React.ReactNode;
}

export interface LoadingState {
    isLoading: boolean;
    error: string | null;
}

export interface PaginationState {
    page: number;
    pageSize: number;
    total: number;
}

// Common validation patterns
export const VALIDATION_PATTERNS = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE: /^\+?[\d\s-()]+$/,
    CURRENCY: /^\d+(\.\d{1,2})?$/,
} as const;

// Common error messages
export const ERROR_MESSAGES = {
    REQUIRED: 'This field is required',
    INVALID_EMAIL: 'Please enter a valid email address',
    INVALID_PHONE: 'Please enter a valid phone number',
    INVALID_CURRENCY: 'Please enter a valid amount',
    MIN_LENGTH: (min: number) => `Must be at least ${min} characters`,
    MAX_LENGTH: (max: number) => `Must be no more than ${max} characters`,
} as const;

// Common CSS classes for consistent styling
export const COMMON_CLASSES = {
    BUTTON_BASE: 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
    INPUT_BASE: 'block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
    CARD_BASE: 'bg-white shadow rounded-lg p-6',
    SPINNER_BASE: 'animate-spin rounded-full border-2 border-gray-300 border-t-blue-600',
} as const;

// File size formatting utility
export const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

// Status variant mapping utility
export const getStatusVariant = (status: string): 'APPROVED' | 'REJECTED' | 'PENDING' => {
    switch (status.toLowerCase()) {
        case 'completed':
        case 'approved':
        case 'success':
            return 'APPROVED';
        case 'failed':
        case 'rejected':
        case 'error':
            return 'REJECTED';
        default:
            return 'PENDING';
    }
};

// Debounce utility for search inputs
export const debounce = <T extends (...args: any[]) => any>(
    func: T,
    delay: number
): ((...args: Parameters<T>) => void) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
};

// Copy to clipboard utility
export const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        return false;
    }
};