import { useState, useEffect, useCallback } from 'react';
import { enhancedApiClient } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

interface TokenRefreshHookReturn {
  // Status information
  isRefreshing: boolean;
  timeUntilExpiry: number | null;
  timeUntilNextRefresh: number | null;
  refreshAttempts: number;
  isProactiveRefreshActive: boolean;
  
  // Actions
  manualRefresh: () => Promise<boolean>;
  resetRefresh: () => void;
  configureRefresh: (options: {
    bufferTime?: number;
    minInterval?: number;
    maxAttempts?: number;
  }) => void;
  
  // Computed states
  isExpiringSoon: boolean;
  refreshHealthy: boolean;
}

/**
 * Hook for managing and monitoring token refresh functionality
 */
export const useTokenRefresh = (options?: {
  updateInterval?: number;
  expiringSoonThreshold?: number;
}): TokenRefreshHookReturn => {
  const { 
    updateInterval = 10000, // 10 seconds
    expiringSoonThreshold = 3 * 60 * 1000 // 3 minutes
  } = options || {};

  const { isAuthenticated, getTimeUntilTokenExpiry } = useAuthStore();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<number | null>(null);
  const [timeUntilNextRefresh, setTimeUntilNextRefresh] = useState<number | null>(null);
  const [refreshAttempts, setRefreshAttempts] = useState(0);
  const [isProactiveRefreshActive, setIsProactiveRefreshActive] = useState(false);

  // Update token status
  const updateStatus = useCallback(() => {
    if (!isAuthenticated) {
      setTimeUntilExpiry(null);
      setTimeUntilNextRefresh(null);
      setRefreshAttempts(0);
      setIsProactiveRefreshActive(false);
      setIsRefreshing(false);
      return;
    }

    // Get token expiry from auth store
    const expiry = getTimeUntilTokenExpiry();
    setTimeUntilExpiry(expiry);

    // Get refresh status from API client
    const refreshStatus = enhancedApiClient.getTokenRefreshStatus();
    setTimeUntilNextRefresh(refreshStatus.timeUntilNextRefresh);
    setRefreshAttempts(refreshStatus.refreshAttempts);
    setIsProactiveRefreshActive(refreshStatus.isProactiveRefreshActive);

    // Get queue status
    const queueStatus = enhancedApiClient.getQueueStatus();
    setIsRefreshing(queueStatus.isRefreshing);
  }, [isAuthenticated, getTimeUntilTokenExpiry]);

  // Set up periodic updates
  useEffect(() => {
    updateStatus();

    const interval = setInterval(updateStatus, updateInterval);
    return () => clearInterval(interval);
  }, [updateStatus, updateInterval]);

  // Manual refresh function
  const manualRefresh = useCallback(async (): Promise<boolean> => {
    try {
      const success = await enhancedApiClient.manualTokenRefresh();
      updateStatus(); // Update status after manual refresh
      return success;
    } catch (error) {
      console.error('[useTokenRefresh] Manual refresh failed:', error);
      return false;
    }
  }, [updateStatus]);

  // Reset refresh mechanism
  const resetRefresh = useCallback(() => {
    enhancedApiClient.resetProactiveRefresh();
    updateStatus();
  }, [updateStatus]);

  // Configure refresh settings
  const configureRefresh = useCallback((config: {
    bufferTime?: number;
    minInterval?: number;
    maxAttempts?: number;
  }) => {
    enhancedApiClient.configureProactiveRefresh(config);
    updateStatus();
  }, [updateStatus]);

  // Computed states
  const isExpiringSoon = timeUntilExpiry !== null && timeUntilExpiry < expiringSoonThreshold;
  const refreshHealthy = isProactiveRefreshActive && refreshAttempts === 0;

  return {
    // Status information
    isRefreshing,
    timeUntilExpiry,
    timeUntilNextRefresh,
    refreshAttempts,
    isProactiveRefreshActive,
    
    // Actions
    manualRefresh,
    resetRefresh,
    configureRefresh,
    
    // Computed states
    isExpiringSoon,
    refreshHealthy,
  };
};

/**
 * Hook for simple token expiry monitoring
 */
export const useTokenExpiry = (options?: {
  updateInterval?: number;
  expiringSoonThreshold?: number;
}) => {
  const { timeUntilExpiry, isExpiringSoon } = useTokenRefresh(options);
  
  return {
    timeUntilExpiry,
    isExpiringSoon,
    formatTime: (ms: number): string => {
      const minutes = Math.floor(ms / (1000 * 60));
      const seconds = Math.floor((ms % (1000 * 60)) / 1000);
      
      if (minutes > 60) {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
      }
      
      if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      }
      
      return `${seconds}s`;
    }
  };
};