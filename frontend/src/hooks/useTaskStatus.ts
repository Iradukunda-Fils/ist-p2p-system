import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { tasksApi } from '@/api/tasksApi';
import { TaskResult, TaskState } from '@/types';
import { useState, useEffect, useRef } from 'react';

// Polling interval in milliseconds
const DEFAULT_POLLING_INTERVAL = 2000;
const DEFAULT_MAX_POLLING_DURATION = 5 * 60 * 1000; // 5 minutes

interface UseTaskStatusOptions {
    taskId: string | null;
    enabled?: boolean;
    onSuccess?: (data: TaskResult) => void;
    onError?: (error: Error) => void;
    onComplete?: (data: TaskResult) => void;
    onTimeout?: () => void;
    pollingInterval?: number;
    maxPollingDuration?: number;
}

/**
 * Hook to poll for Celery task status with timeout protection
 */
export const useTaskStatus = ({
    taskId,
    enabled = true,
    onSuccess,
    onError,
    onComplete,
    onTimeout,
    pollingInterval = DEFAULT_POLLING_INTERVAL,
    maxPollingDuration = DEFAULT_MAX_POLLING_DURATION
}: UseTaskStatusOptions) => {
    const [isComplete, setIsComplete] = useState(false);
    const [isTimedOut, setIsTimedOut] = useState(false);
    const startTimeRef = useRef<number | null>(null);

    // Initialize start time when task polling begins
    useEffect(() => {
        if (taskId && enabled && !startTimeRef.current) {
            startTimeRef.current = Date.now();
        }
    }, [taskId, enabled]);

    const query = useQuery({
        queryKey: ['task', taskId],
        queryFn: () => tasksApi.getTaskStatus(taskId!),
        enabled: !!taskId && enabled && !isComplete && !isTimedOut,
        refetchInterval: (query) => {
            const data = query.state.data;
            
            // Check for timeout
            if (startTimeRef.current && Date.now() - startTimeRef.current > maxPollingDuration) {
                setIsTimedOut(true);
                if (onTimeout) {
                    onTimeout();
                }
                return false;
            }
            
            // Stop polling if task is ready (complete)
            if (data?.ready) {
                return false;
            }
            
            // Also stop polling if task is in a terminal state
            const terminalStates: TaskState[] = ['SUCCESS', 'FAILURE', 'REVOKED'];
            if (data?.status && terminalStates.includes(data.status as TaskState)) {
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

            // Check if task is complete
            const terminalStates: TaskState[] = ['SUCCESS', 'FAILURE', 'REVOKED'];
            const isTaskComplete = query.data.ready || 
                                   (query.data.status && terminalStates.includes(query.data.status as TaskState));

            if (isTaskComplete && !isComplete) {
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
        setIsTimedOut(false);
        startTimeRef.current = null;
        query.refetch();
    };

    return {
        ...query,
        isComplete,
        isTimedOut,
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
