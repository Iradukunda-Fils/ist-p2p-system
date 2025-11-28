import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { tasksApi } from '@/api/tasksApi';
import { TaskResult, TaskState } from '@/types';
import { useState, useEffect } from 'react';

// Polling interval in milliseconds
const DEFAULT_POLLING_INTERVAL = 2000;

interface UseTaskStatusOptions {
    taskId: string | null;
    enabled?: boolean;
    onSuccess?: (data: TaskResult) => void;
    onError?: (error: Error) => void;
    onComplete?: (data: TaskResult) => void;
    pollingInterval?: number;
}

/**
 * Hook to poll for Celery task status
 */
export const useTaskStatus = ({
    taskId,
    enabled = true,
    onSuccess,
    onError,
    onComplete,
    pollingInterval = DEFAULT_POLLING_INTERVAL
}: UseTaskStatusOptions) => {
    const [isComplete, setIsComplete] = useState(false);

    const query = useQuery({
        queryKey: ['task', taskId],
        queryFn: () => tasksApi.getTaskStatus(taskId!),
        enabled: !!taskId && enabled && !isComplete,
        refetchInterval: (query) => {
            const data = query.state.data;
            // Stop polling if task is ready (complete)
            if (data?.ready) {
                return false;
            }
            return pollingInterval;
        },
        retry: 3,
    });

    // Handle completion side effects
    useEffect(() => {
        if (query.data) {
            if (onSuccess) {
                onSuccess(query.data);
            }

            if (query.data.ready && !isComplete) {
                setIsComplete(true);
                if (onComplete) {
                    onComplete(query.data);
                }
            }
        }
    }, [query.data, isComplete, onSuccess, onComplete]);

    // Handle error side effects
    useEffect(() => {
        if (query.error && onError) {
            onError(query.error as Error);
        }
    }, [query.error, onError]);

    const reset = () => {
        setIsComplete(false);
        query.refetch();
    };

    return {
        ...query,
        isComplete,
        reset,
        status: query.data?.status as TaskState | undefined,
        result: query.data?.result,
        error: query.data?.error || query.error,
        progress: query.data?.info, // Assuming info contains progress for custom tasks
    };
};

/**
 * Hook to monitor active tasks system-wide
 */
export const useActiveTasks = () => {
    return useQuery({
        queryKey: ['active-tasks'],
        queryFn: tasksApi.listActiveTasks,
        refetchInterval: 5000, // Poll every 5 seconds
    });
};

/**
 * Hook to monitor worker health
 */
export const useWorkerStatus = () => {
    return useQuery({
        queryKey: ['worker-status'],
        queryFn: tasksApi.getWorkerStatus,
        refetchInterval: 30000, // Poll every 30 seconds
    });
};
