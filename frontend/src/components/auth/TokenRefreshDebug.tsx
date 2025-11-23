import React from 'react';
import { useTokenRefresh } from '@/hooks/useTokenRefresh';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { VStack, HStack } from '@/components/common/Spacing';
import { Typography } from '@/components/common/Typography';

interface TokenRefreshDebugProps {
  className?: string;
}

/**
 * Debug component for monitoring and testing token refresh functionality
 * Only use in development or for debugging purposes
 */
export const TokenRefreshDebug: React.FC<TokenRefreshDebugProps> = ({ className = '' }) => {
  const {
    isRefreshing,
    timeUntilExpiry,
    timeUntilNextRefresh,
    refreshAttempts,
    isProactiveRefreshActive,
    manualRefresh,
    resetRefresh,
    configureRefresh,
    isExpiringSoon,
    refreshHealthy,
  } = useTokenRefresh();

  const formatTime = (ms: number | null): string => {
    if (ms === null) return 'N/A';
    
    const minutes = Math.floor(ms / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    
    if (minutes > 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m ${seconds}s`;
    }
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    
    return `${seconds}s`;
  };

  const handleManualRefresh = async () => {
    const success = await manualRefresh();
    console.log('[TokenRefreshDebug] Manual refresh result:', success);
  };

  const handleConfigureRefresh = (preset: 'aggressive' | 'conservative' | 'default') => {
    const configs = {
      aggressive: {
        bufferTime: 5 * 60 * 1000, // 5 minutes
        minInterval: 30 * 1000, // 30 seconds
        maxAttempts: 5,
      },
      conservative: {
        bufferTime: 1 * 60 * 1000, // 1 minute
        minInterval: 2 * 60 * 1000, // 2 minutes
        maxAttempts: 2,
      },
      default: {
        bufferTime: 2 * 60 * 1000, // 2 minutes
        minInterval: 30 * 1000, // 30 seconds
        maxAttempts: 3,
      },
    };

    configureRefresh(configs[preset]);
    console.log('[TokenRefreshDebug] Applied configuration:', preset, configs[preset]);
  };

  return (
    <Card title="Token Refresh Debug Panel" className={className}>
      <VStack size="component">
        {/* Status Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <Typography variant="caption" color="muted">Status</Typography>
            <Typography variant="body-small" className={`font-medium ${
              isRefreshing ? 'text-blue-600' : 
              isExpiringSoon ? 'text-red-600' : 
              'text-green-600'
            }`}>
              {isRefreshing ? 'Refreshing' : 
               isExpiringSoon ? 'Expiring Soon' : 
               'Active'}
            </Typography>
          </div>

          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <Typography variant="caption" color="muted">Health</Typography>
            <Typography variant="body-small" className={`font-medium ${
              refreshHealthy ? 'text-green-600' : 'text-yellow-600'
            }`}>
              {refreshHealthy ? 'Healthy' : 'Issues'}
            </Typography>
          </div>

          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <Typography variant="caption" color="muted">Auto-Refresh</Typography>
            <Typography variant="body-small" className={`font-medium ${
              isProactiveRefreshActive ? 'text-green-600' : 'text-red-600'
            }`}>
              {isProactiveRefreshActive ? 'Active' : 'Inactive'}
            </Typography>
          </div>

          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <Typography variant="caption" color="muted">Attempts</Typography>
            <Typography variant="body-small" className={`font-medium ${
              refreshAttempts === 0 ? 'text-green-600' : 
              refreshAttempts < 3 ? 'text-yellow-600' : 
              'text-red-600'
            }`}>
              {refreshAttempts}
            </Typography>
          </div>
        </div>

        {/* Timing Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <Typography variant="body-small" className="font-medium mb-2">Token Expiry</Typography>
            <Typography variant="body-small" color="muted">
              {formatTime(timeUntilExpiry)}
            </Typography>
          </div>

          <div className="p-4 border border-gray-200 rounded-lg">
            <Typography variant="body-small" className="font-medium mb-2">Next Refresh</Typography>
            <Typography variant="body-small" color="muted">
              {formatTime(timeUntilNextRefresh)}
            </Typography>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t pt-4">
          <Typography variant="body-small" className="font-medium mb-3">Actions</Typography>
          <HStack size="element">
            <Button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              size="sm"
              variant="secondary"
            >
              {isRefreshing ? 'Refreshing...' : 'Manual Refresh'}
            </Button>

            <Button
              onClick={resetRefresh}
              size="sm"
              variant="outline"
            >
              Reset Mechanism
            </Button>
          </HStack>
        </div>

        {/* Configuration Presets */}
        <div className="border-t pt-4">
          <Typography variant="body-small" className="font-medium mb-3">Configuration Presets</Typography>
          <HStack size="element">
            <Button
              onClick={() => handleConfigureRefresh('aggressive')}
              size="sm"
              variant="outline"
            >
              Aggressive
            </Button>

            <Button
              onClick={() => handleConfigureRefresh('default')}
              size="sm"
              variant="outline"
            >
              Default
            </Button>

            <Button
              onClick={() => handleConfigureRefresh('conservative')}
              size="sm"
              variant="outline"
            >
              Conservative
            </Button>
          </HStack>

          <div className="mt-2 text-xs text-gray-500">
            <p><strong>Aggressive:</strong> 5min buffer, 30s interval, 5 attempts</p>
            <p><strong>Default:</strong> 2min buffer, 30s interval, 3 attempts</p>
            <p><strong>Conservative:</strong> 1min buffer, 2min interval, 2 attempts</p>
          </div>
        </div>
      </VStack>
    </Card>
  );
};