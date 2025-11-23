import { useQuery, useQueries } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { dashboardApi, DashboardStats } from '@/api/dashboardApi';
import { PurchaseRequest } from '@/types';

/**
 * Query keys for dashboard data
 */
export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: (userId: string) => [...dashboardKeys.all, 'stats', userId] as const,
  latestRequests: (limit: number) => [...dashboardKeys.all, 'latest-requests', limit] as const,
  userRequests: (userId: string, limit: number) => [...dashboardKeys.all, 'user-requests', userId, limit] as const,
  pendingApprovals: (limit: number) => [...dashboardKeys.all, 'pending-approvals', limit] as const,
  dashboardData: (userId: string) => [...dashboardKeys.all, 'data', userId] as const,
};

/**
 * Hook for comprehensive dashboard data
 */
export const useDashboard = () => {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: dashboardKeys.dashboardData(user?.id || ''),
    queryFn: () => dashboardApi.getDashboardData(user!),
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

/**
 * Hook for dashboard statistics only
 */
export const useDashboardStats = () => {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: dashboardKeys.stats(user?.id || ''),
    queryFn: () => dashboardApi.getDashboardStats(user!),
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};

/**
 * Hook for latest requests
 */
export const useLatestRequests = (limit: number = 10) => {
  return useQuery({
    queryKey: dashboardKeys.latestRequests(limit),
    queryFn: () => dashboardApi.getLatestRequests(limit),
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 3 * 60 * 1000, // 3 minutes
    retry: 2,
  });
};

/**
 * Hook for user-specific requests
 */
export const useUserRequests = (limit: number = 5) => {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: dashboardKeys.userRequests(user?.id || '', limit),
    queryFn: () => dashboardApi.getUserRequests(user!.id, limit),
    enabled: !!user,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 3 * 60 * 1000, // 3 minutes
    retry: 2,
  });
};

/**
 * Hook for pending approvals (for approver users)
 */
export const usePendingApprovals = (limit: number = 10) => {
  const { user } = useAuthStore();
  const isApprover = user?.role === 'approver_lvl1' || user?.role === 'approver_lvl2';

  return useQuery({
    queryKey: dashboardKeys.pendingApprovals(limit),
    queryFn: () => dashboardApi.getPendingApprovals(limit),
    enabled: !!user && isApprover,
    staleTime: 30 * 1000, // 30 seconds (more frequent for approvals)
    gcTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });
};

/**
 * Hook for optimized dashboard data with separate queries
 * This allows for better loading states and error handling
 */
export const useDashboardQueries = () => {
  const { user } = useAuthStore();
  const isApprover = user?.role === 'approver_lvl1' || user?.role === 'approver_lvl2';
  const isStaff = user?.role === 'staff';

  const queries = useQueries({
    queries: [
      // Always fetch latest requests
      {
        queryKey: dashboardKeys.latestRequests(10),
        queryFn: () => dashboardApi.getLatestRequests(10),
        staleTime: 1 * 60 * 1000,
        enabled: !!user,
      },
      // Fetch dashboard stats
      {
        queryKey: dashboardKeys.stats(user?.id || ''),
        queryFn: () => dashboardApi.getDashboardStats(user!),
        staleTime: 2 * 60 * 1000,
        enabled: !!user,
      },
      // Fetch user requests for staff
      {
        queryKey: dashboardKeys.userRequests(user?.id || '', 5),
        queryFn: () => dashboardApi.getUserRequests(user!.id, 5),
        staleTime: 1 * 60 * 1000,
        enabled: !!user && isStaff,
      },
      // Fetch pending approvals for approvers
      {
        queryKey: dashboardKeys.pendingApprovals(10),
        queryFn: () => dashboardApi.getPendingApprovals(10),
        staleTime: 30 * 1000,
        enabled: !!user && isApprover,
      },
    ],
  });

  const [latestRequestsQuery, statsQuery, userRequestsQuery, pendingApprovalsQuery] = queries;

  return {
    latestRequests: {
      data: latestRequestsQuery.data as PurchaseRequest[] | undefined,
      isLoading: latestRequestsQuery.isLoading,
      error: latestRequestsQuery.error,
      refetch: latestRequestsQuery.refetch,
    },
    stats: {
      data: statsQuery.data as DashboardStats | undefined,
      isLoading: statsQuery.isLoading,
      error: statsQuery.error,
      refetch: statsQuery.refetch,
    },
    userRequests: {
      data: userRequestsQuery.data as PurchaseRequest[] | undefined,
      isLoading: userRequestsQuery.isLoading,
      error: userRequestsQuery.error,
      refetch: userRequestsQuery.refetch,
    },
    pendingApprovals: {
      data: pendingApprovalsQuery.data as PurchaseRequest[] | undefined,
      isLoading: pendingApprovalsQuery.isLoading,
      error: pendingApprovalsQuery.error,
      refetch: pendingApprovalsQuery.refetch,
    },
    // Overall loading state
    isLoading: queries.some(q => q.isLoading),
    // Check if any critical queries have errors
    hasError: latestRequestsQuery.error || statsQuery.error,
    // Refetch all queries
    refetchAll: () => {
      queries.forEach(q => q.refetch());
    },
  };
};

export default useDashboard;