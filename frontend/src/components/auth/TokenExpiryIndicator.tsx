import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { enhancedApiClient } from '@/api/client';

interface TokenExpiryIndicatorProps {
    className?: string;
    showDetails?: boolean;
    showRefreshStatus?: boolean;
}

export const TokenExpiryIndicator: React.FC<TokenExpiryIndicatorProps> = ({
    className = '',
    showDetails = false,
    showRefreshStatus = false
}) => {
    const { isAuthenticated, getTimeUntilTokenExpiry } = useAuthStore();
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
    const [isExpiringSoon, setIsExpiringSoon] = useState(false);
    const [refreshStatus, setRefreshStatus] = useState<any>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) {
            setTimeRemaining(null);
            setIsExpiringSoon(false);
            setRefreshStatus(null);
            return;
        }

        const updateTimer = () => {
            const remaining = getTimeUntilTokenExpiry();
            setTimeRemaining(remaining);

            // Consider token expiring soon if less than 3 minutes remaining
            // (since proactive refresh happens at 2 minutes)
            setIsExpiringSoon(remaining !== null && remaining < 3 * 60 * 1000);

            // Get refresh status from API client
            if (showRefreshStatus) {
                const status = enhancedApiClient.getTokenRefreshStatus();
                setRefreshStatus(status);
            }

            // Check if currently refreshing
            const queueStatus = enhancedApiClient.getQueueStatus();
            setIsRefreshing(queueStatus.isRefreshing);
        };

        // Update immediately
        updateTimer();

        // Update every 10 seconds for more responsive UI
        const interval = setInterval(updateTimer, 10000);

        return () => clearInterval(interval);
    }, [isAuthenticated, getTimeUntilTokenExpiry, showRefreshStatus]);

    if (!isAuthenticated || timeRemaining === null) {
        return null;
    }

    const formatTime = (ms: number): string => {
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
    };

    const getStatusColor = (): string => {
        if (isRefreshing) {
            return 'text-blue-600 bg-blue-50 border-blue-200';
        }
        if (isExpiringSoon) {
            return 'text-red-600 bg-red-50 border-red-200';
        }
        return 'text-green-600 bg-green-50 border-green-200';
    };

    const getStatusIcon = (): string => {
        if (isRefreshing) {
            return '🔄';
        }
        if (isExpiringSoon) {
            return '⚠️';
        }
        return '🔒';
    };

    const getStatusText = (): string => {
        if (isRefreshing) {
            return 'Refreshing Token';
        }
        if (isExpiringSoon) {
            return 'Token Expiring Soon';
        }
        return 'Token Active';
    };

    if (!showDetails) {
        // Compact indicator
        return (
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs border ${getStatusColor()} ${className}`}>
                <span className="mr-1">{getStatusIcon()}</span>
                <span>{formatTime(timeRemaining)}</span>
            </div>
        );
    }

    // Detailed indicator
    return (
        <div className={`p-3 rounded-lg border ${getStatusColor()} ${className}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <span className={`text-lg mr-2 ${isRefreshing ? 'animate-spin' : ''}`}>
                        {getStatusIcon()}
                    </span>
                    <div>
                        <p className="font-medium text-sm">
                            {getStatusText()}
                        </p>
                        <p className="text-xs opacity-75">
                            Expires in {formatTime(timeRemaining)}
                        </p>
                        {showRefreshStatus && refreshStatus && (
                            <div className="text-xs opacity-60 mt-1">
                                {refreshStatus.isProactiveRefreshActive && refreshStatus.timeUntilNextRefresh && (
                                    <p>Next refresh: {formatTime(refreshStatus.timeUntilNextRefresh)}</p>
                                )}
                                {refreshStatus.refreshAttempts > 0 && (
                                    <p>Retry attempts: {refreshStatus.refreshAttempts}</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="text-xs text-right">
                    {isRefreshing && (
                        <p className="text-blue-600">Refreshing...</p>
                    )}
                    {isExpiringSoon && !isRefreshing && (
                        <p>Auto-refresh active</p>
                    )}
                    {showRefreshStatus && refreshStatus?.isProactiveRefreshActive && !isExpiringSoon && (
                        <p className="text-green-600">✓ Auto-refresh enabled</p>
                    )}
                </div>
            </div>
        </div>
    );
};