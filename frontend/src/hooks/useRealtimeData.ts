import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/api/dashboardApi';
import { tasksApi } from '@/api/tasksApi';
import { useAuthStore } from '@/store/authStore';
import { useState, useEffect } from 'react';

/**
 * Hook for real-time dashboard data with automatic polling
 * Updates every 10 seconds by default
 */
export const useLiveDashboardData = (pollingInterval: number = 10000) => {
    const { user } = useAuthStore();
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    const query = useQuery({
        queryKey: ['dashboard-live', user?.id],
        queryFn: () => dashboardApi.getDashboardData(user!),
        enabled: !!user,
        refetchInterval: pollingInterval,
        refetchIntervalInBackground: true, // Keep polling even when tab not active
        staleTime: 5000, // Consider data stale after 5 seconds
    });

    // Track last successful update
    useEffect(() => {
        if (query.data && query.dataUpdatedAt) {
            setLastUpdate(new Date(query.dataUpdatedAt));
        }
    }, [query.dataUpdatedAt, query.data]);

    return {
        ...query,
        lastUpdate,
        isLive: !query.isPaused,
    };
};

/**
 * Hook for monitoring active Celery tasks in real-time
 * Updates every 3 seconds for task queue visibility
 */
export const useLiveTaskQueue = (pollingInterval: number = 3000) => {
    const [queueDepth, setQueueDepth] = useState(0);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    const query = useQuery({
        queryKey: ['task-queue-live'],
        queryFn: tasksApi.listActiveTasks,
        refetchInterval: pollingInterval,
        refetchIntervalInBackground: true,
        staleTime: 2000,
    });

    useEffect(() => {
        if (query.data) {
            setQueueDepth(query.data.active_tasks?.length || 0);
            setLastUpdate(new Date());
        }
    }, [query.data]);

    return {
        ...query,
        queueDepth,
        activeTasks: query.data?.active_tasks || [],
        lastUpdate,
        isLive: !query.isPaused,
    };
};

/**
 * Hook for real-time statistics with optimistic updates
 */
export const useRealtimeStats = (pollingInterval: number = 15000) => {
    const { user } = useAuthStore();
    const [trend, setTrend] = useState<'up' | 'down' | 'stable'>('stable');

    const query = useQuery({
        queryKey: ['stats-live', user?.id],
        queryFn: () => dashboardApi.getDashboardStats(user!),
        enabled: !!user,
        refetchInterval: pollingInterval,
        refetchIntervalInBackground: true,
    });

    // Calculate trend based on data changes
    useEffect(() => {
        if (query.data && query.previousData) {
            const current = query.data.pendingRequests;
            const previous = query.previousData.pendingRequests;
            
            if (current > previous) {
                setTrend('up');
            } else if (current < previous) {
                setTrend('down');
            } else {
                setTrend('stable');
            }
        }
    }, [query.data, query.previousData]);

    return {
        ...query,
        trend,
    };
};

/**
 * Hook for worker health monitoring
 */
export const useLiveWorkerStatus = (pollingInterval: number = 30000) => {
    const query = useQuery({
        queryKey: ['worker-status-live'],
        queryFn: tasksApi.getWorkerStatus,
        refetchInterval: pollingInterval,
        refetchIntervalInBackground: false, // Less critical, don't poll in background
    });

    const healthStatus = query.data?.healthy ? 'healthy' : 'degraded';
    const workerCount = query.data?.workers?.length || 0;

    return {
        ...query,
        healthStatus,
        workerCount,
        workers: query.data?.workers || [],
    };
};

/**
 * Hook for controlling polling behavior
 */
export const usePollingControl = () => {
    const [isEnabled, setIsEnabled] = useState(true);
    const [interval, setInterval] = useState(10000);

    const pause = () => setIsEnabled(false);
    const resume = () => setIsEnabled(true);
    const toggle = () => setIsEnabled(prev => !prev);
    
    const setFastPolling = () => setInterval(3000);  // 3 seconds
    const setNormalPolling = () => setInterval(10000); // 10 seconds
    const setSlowPolling = () => setInterval(30000);   // 30 seconds

    return {
        isEnabled,
        interval,
        pause,
        resume,
        toggle,
        setFastPolling,
        setNormalPolling,
        setSlowPolling,
    };
};
