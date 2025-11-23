/**
 * Common custom hooks for the application
 * Centralized location for reusable hook logic
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { debounce } from '@/utils/codeCleanup';
import { handleApiError } from '@/utils/errorHandling';

/**
 * Hook for managing loading states
 */
export const useLoadingState = (initialState: boolean = false) => {
    const [isLoading, setIsLoading] = useState(initialState);
    const [error, setError] = useState<string | null>(null);

    const startLoading = useCallback(() => {
        setIsLoading(true);
        setError(null);
    }, []);

    const stopLoading = useCallback(() => {
        setIsLoading(false);
    }, []);

    const setLoadingError = useCallback((errorMessage: string) => {
        setIsLoading(false);
        setError(errorMessage);
    }, []);

    const reset = useCallback(() => {
        setIsLoading(false);
        setError(null);
    }, []);

    return {
        isLoading,
        error,
        startLoading,
        stopLoading,
        setLoadingError,
        reset,
    };
};

/**
 * Hook for managing modal states
 */
export const useModal = (initialState: boolean = false) => {
    const [isOpen, setIsOpen] = useState(initialState);

    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);
    const toggle = useCallback(() => setIsOpen(prev => !prev), []);

    return {
        isOpen,
        open,
        close,
        toggle,
    };
};

/**
 * Hook for managing form states
 */
export const useFormState = <T extends Record<string, any>>(initialValues: T) => {
    const [values, setValues] = useState<T>(initialValues);
    const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
    const [touched, setTouchedState] = useState<Partial<Record<keyof T, boolean>>>({});

    const setValue = useCallback((field: keyof T, value: any) => {
        setValues(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    }, [errors]);

    const setError = useCallback((field: keyof T, error: string) => {
        setErrors(prev => ({ ...prev, [field]: error }));
    }, []);

    const clearError = useCallback((field: keyof T) => {
        setErrors(prev => ({ ...prev, [field]: undefined }));
    }, []);

    const setTouched = useCallback((field: keyof T) => {
        setTouchedState(prev => ({ ...prev, [field]: true }));
    }, []);

    const reset = useCallback(() => {
        setValues(initialValues);
        setErrors({});
        setTouchedState({});
    }, [initialValues]);

    const hasErrors = Object.values(errors).some(error => !!error);

    return {
        values,
        errors,
        touched,
        setValue,
        setError,
        clearError,
        setTouched,
        reset,
        hasErrors,
    };
};

/**
 * Hook for debounced search
 */
export const useDebounceSearch = (
    searchFn: (query: string) => void,
    delay: number = 300
) => {
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useCallback(debounce(searchFn, delay), [searchFn, delay]);

    useEffect(() => {
        if (searchQuery.trim()) {
            debouncedSearch(searchQuery);
        }
    }, [searchQuery, debouncedSearch]);

    return {
        searchQuery,
        setSearchQuery,
    };
};

/**
 * Hook for managing pagination
 */
export const usePagination = (initialPage: number = 1, initialPageSize: number = 20) => {
    const [page, setPage] = useState(initialPage);
    const [pageSize, setPageSize] = useState(initialPageSize);

    const nextPage = useCallback(() => setPage(prev => prev + 1), []);
    const prevPage = useCallback(() => setPage(prev => Math.max(1, prev - 1)), []);
    const goToPage = useCallback((newPage: number) => setPage(Math.max(1, newPage)), []);
    const reset = useCallback(() => setPage(initialPage), [initialPage]);

    return {
        page,
        pageSize,
        setPage,
        setPageSize,
        nextPage,
        prevPage,
        goToPage,
        reset,
    };
};

/**
 * Hook for managing local storage
 */
export const useLocalStorage = <T>(key: string, initialValue: T) => {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(`Error reading localStorage key "${key}":`, error);
            return initialValue;
        }
    });

    const setValue = useCallback((value: T | ((val: T) => T)) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error(`Error setting localStorage key "${key}":`, error);
        }
    }, [key, storedValue]);

    const removeValue = useCallback(() => {
        try {
            window.localStorage.removeItem(key);
            setStoredValue(initialValue);
        } catch (error) {
            console.error(`Error removing localStorage key "${key}":`, error);
        }
    }, [key, initialValue]);

    return [storedValue, setValue, removeValue] as const;
};

/**
 * Hook for managing document title
 */
export const useDocumentTitle = (title: string) => {
    useEffect(() => {
        const previousTitle = document.title;
        document.title = title;
        
        return () => {
            document.title = previousTitle;
        };
    }, [title]);
};

/**
 * Hook for detecting click outside element
 */
export const useClickOutside = <T extends HTMLElement>(
    callback: () => void
) => {
    const ref = useRef<T>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                callback();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [callback]);

    return ref;
};

/**
 * Hook for managing async operations with error handling
 */
export const useAsyncOperation = <T, P extends any[]>(
    asyncFn: (...args: P) => Promise<T>
) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<T | null>(null);

    const execute = useCallback(async (...args: P) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const result = await asyncFn(...args);
            setData(result);
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An error occurred';
            setError(errorMessage);
            handleApiError(err, 'Async Operation');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [asyncFn]);

    const reset = useCallback(() => {
        setIsLoading(false);
        setError(null);
        setData(null);
    }, []);

    return {
        execute,
        isLoading,
        error,
        data,
        reset,
    };
};

/**
 * Hook for managing optimistic updates
 */
export const useOptimisticMutation = <TData, TVariables>(
    mutationFn: (variables: TVariables) => Promise<TData>,
    queryKey: readonly unknown[],
    optimisticUpdater: (oldData: TData, variables: TVariables) => TData
) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn,
        onMutate: async (variables) => {
            await queryClient.cancelQueries({ queryKey });
            const previousData = queryClient.getQueryData<TData>(queryKey);
            
            if (previousData) {
                queryClient.setQueryData(queryKey, optimisticUpdater(previousData, variables));
            }
            
            return { previousData };
        },
        onError: (error, variables, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(queryKey, context.previousData);
            }
            handleApiError(error, 'Optimistic Update');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });
};

/**
 * Hook for managing keyboard shortcuts
 */
export const useKeyboardShortcut = (
    key: string,
    callback: () => void,
    options: {
        ctrl?: boolean;
        alt?: boolean;
        shift?: boolean;
        meta?: boolean;
    } = {}
) => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const { ctrl = false, alt = false, shift = false, meta = false } = options;
            
            if (
                event.key.toLowerCase() === key.toLowerCase() &&
                event.ctrlKey === ctrl &&
                event.altKey === alt &&
                event.shiftKey === shift &&
                event.metaKey === meta
            ) {
                event.preventDefault();
                callback();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [key, callback, options]);
};

/**
 * Hook for managing window size
 */
export const useWindowSize = () => {
    const [windowSize, setWindowSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight,
    });

    useEffect(() => {
        const handleResize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return windowSize;
};