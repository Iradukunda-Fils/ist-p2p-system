/**
 * API utility functions and common patterns
 * Centralized location for reusable API-related functionality
 */

import { QueryClient } from '@tanstack/react-query';

// Query key factories for consistent cache management
export const queryKeys = {
    // Auth queries
    auth: ['auth'] as const,
    user: () => [...queryKeys.auth, 'user'] as const,
    
    // Purchase request queries
    requests: ['requests'] as const,
    requestsList: (params?: Record<string, any>) => [...queryKeys.requests, 'list', params] as const,
    requestDetail: (id: string) => [...queryKeys.requests, 'detail', id] as const,
    dashboardRequests: () => [...queryKeys.requests, 'dashboard'] as const,
    
    // Document queries
    documents: ['documents'] as const,
    documentsList: (params?: Record<string, any>) => [...queryKeys.documents, 'list', params] as const,
    documentDetail: (id: string) => [...queryKeys.documents, 'detail', id] as const,
    
    // Purchase order queries
    orders: ['orders'] as const,
    ordersList: (params?: Record<string, any>) => [...queryKeys.orders, 'list', params] as const,
    orderDetail: (id: string) => [...queryKeys.orders, 'detail', id] as const,
    orderSummary: () => [...queryKeys.orders, 'summary'] as const,
} as const;

// Common query options
export const queryOptions = {
    // Standard stale time for most queries (5 minutes)
    standard: {
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    },
    
    // Short stale time for frequently changing data (1 minute)
    short: {
        staleTime: 1 * 60 * 1000,
        gcTime: 5 * 60 * 1000,
    },
    
    // Long stale time for rarely changing data (30 minutes)
    long: {
        staleTime: 30 * 60 * 1000,
        gcTime: 60 * 60 * 1000, // 1 hour garbage collection
    },
    
    // No caching for real-time data
    realtime: {
        staleTime: 0,
        gcTime: 0,
    },
} as const;

// Mutation options with common patterns
export const mutationOptions = {
    // Standard mutation with optimistic updates
    optimistic: <T>(queryClient: QueryClient, queryKey: readonly unknown[], updater: (old: T) => T) => ({
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey });
            const previousData = queryClient.getQueryData<T>(queryKey);
            if (previousData) {
                queryClient.setQueryData(queryKey, updater(previousData));
            }
            return { previousData };
        },
        onError: (error: any, variables: any, context: any) => {
            if (context?.previousData) {
                queryClient.setQueryData(queryKey, context.previousData);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    }),
    
    // Standard mutation with cache invalidation
    standard: (queryClient: QueryClient, queryKeys: readonly unknown[][]) => ({
        onSuccess: () => {
            queryKeys.forEach(key => {
                queryClient.invalidateQueries({ queryKey: key });
            });
        },
    }),
} as const;

// Common API response transformers
export const transformers = {
    // Transform paginated response to include computed properties
    paginatedResponse: <T>(response: any) => ({
        ...response,
        hasNextPage: !!response.next,
        hasPreviousPage: !!response.previous,
        totalPages: Math.ceil(response.count / (response.results?.length || 1)),
    }),
    
    // Transform single entity to include computed properties
    entityResponse: <T extends { created_at: string; updated_at: string }>(entity: T) => ({
        ...entity,
        isNew: new Date(entity.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000), // Created in last 24h
        isRecentlyUpdated: new Date(entity.updated_at) > new Date(Date.now() - 60 * 60 * 1000), // Updated in last hour
    }),
} as const;

// Download utilities
export const downloadUtils = {
    // Download file from blob
    downloadBlob: (blob: Blob, filename: string) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    },
    
    // Get file extension from filename
    getFileExtension: (filename: string): string => {
        return filename.split('.').pop()?.toLowerCase() || '';
    },
    
    // Check if file is image
    isImageFile: (filename: string): boolean => {
        const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'];
        return imageExtensions.includes(downloadUtils.getFileExtension(filename));
    },
    
    // Check if file is PDF
    isPdfFile: (filename: string): boolean => {
        return downloadUtils.getFileExtension(filename) === 'pdf';
    },
} as const;

// URL utilities
export const urlUtils = {
    // Build query string from params object
    buildQueryString: (params: Record<string, any>): string => {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.append(key, String(value));
            }
        });
        return searchParams.toString();
    },
    
    // Parse query string to params object
    parseQueryString: (queryString: string): Record<string, string> => {
        const params: Record<string, string> = {};
        const searchParams = new URLSearchParams(queryString);
        searchParams.forEach((value, key) => {
            params[key] = value;
        });
        return params;
    },
} as const;

// Cache utilities
export const cacheUtils = {
    // Invalidate all queries matching a pattern
    invalidateQueriesMatching: (queryClient: QueryClient, pattern: string) => {
        queryClient.invalidateQueries({
            predicate: (query) => {
                return query.queryKey.some(key => 
                    typeof key === 'string' && key.includes(pattern)
                );
            },
        });
    },
    
    // Remove all queries matching a pattern
    removeQueriesMatching: (queryClient: QueryClient, pattern: string) => {
        queryClient.removeQueries({
            predicate: (query) => {
                return query.queryKey.some(key => 
                    typeof key === 'string' && key.includes(pattern)
                );
            },
        });
    },
    
    // Prefetch related data
    prefetchRelated: async (queryClient: QueryClient, entityId: string, entityType: 'request' | 'document' | 'order') => {
        const prefetchPromises = [];
        
        switch (entityType) {
            case 'request':
                // Prefetch related documents
                prefetchPromises.push(
                    queryClient.prefetchQuery({
                        queryKey: queryKeys.documentsList({ request_id: entityId }),
                        staleTime: queryOptions.standard.staleTime,
                    })
                );
                break;
            case 'document':
                // Prefetch document processing status
                prefetchPromises.push(
                    queryClient.prefetchQuery({
                        queryKey: queryKeys.documentDetail(entityId),
                        staleTime: queryOptions.short.staleTime,
                    })
                );
                break;
            case 'order':
                // Prefetch related request
                prefetchPromises.push(
                    queryClient.prefetchQuery({
                        queryKey: queryKeys.orderDetail(entityId),
                        staleTime: queryOptions.standard.staleTime,
                    })
                );
                break;
        }
        
        await Promise.all(prefetchPromises);
    },
} as const;

// Retry configuration
export const retryConfig = {
    // Standard retry for most operations
    standard: {
        retry: 3,
        retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    
    // No retry for user actions (like form submissions)
    none: {
        retry: false,
    },
    
    // Aggressive retry for critical operations
    aggressive: {
        retry: 5,
        retryDelay: (attemptIndex: number) => Math.min(500 * 2 ** attemptIndex, 10000),
    },
} as const;