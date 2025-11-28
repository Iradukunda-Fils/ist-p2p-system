import React, { useState } from 'react';
import { useLiveDashboardData, useLiveWorkerStatus, usePollingControl } from '@/hooks/useRealtimeData';
import { formatDistanceToNow } from 'date-fns';

interface LiveIndicatorProps {
    lastUpdate: Date;
    isLive: boolean;
    pollingControl?: ReturnType<typeof usePollingControl>;
}

/**
 * Live indicator component showing real-time update status
 */
export const LiveIndicator: React.FC<LiveIndicatorProps> = ({ lastUpdate, isLive, pollingControl }) => {
    const [showControls, setShowControls] = useState(false);

    return (
        <div className="relative inline-flex items-center">
            <button
                onClick={() => setShowControls(!showControls)}
                className="flex items-center space-x-2 px-3 py-1 rounded-md transition-colors hover:bg-gray-100"
                title={isLive ? 'Live updates enabled' : 'Live updates paused'}
            >
                {isLive ? (
                    <>
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-xs font-medium text-green-600">Live</span>
                    </>
                ) : (
                    <>
                        <span className="h-2 w-2 rounded-full bg-gray-400"></span>
                        <span className="text-xs font-medium text-gray-500">Paused</span>
                    </>
                )}
                <span className="text-xs text-gray-400">
                    {formatDistanceToNow(lastUpdate, { addSuffix: true })}
                </span>
            </button>

            {/* Polling Controls Dropdown */}
            {showControls && pollingControl && (
                <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                    <div className="p-2">
                        <div className="text-xs font-medium text-gray-700 mb-2">Polling Controls</div>
                        
                        <button
                            onClick={() => {
                                pollingControl.toggle();
                                setShowControls(false);
                            }}
                            className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 rounded"
                        >
                            {isLive ? 'Pause' : 'Resume'} Updates
                        </button>

                        <div className="border-t my-2"></div>
                        <div className="text-xs text-gray-500 mb-1">Refresh Interval</div>
                        
                        <button
                            onClick={() => {
                                pollingControl.setFastPolling();
                                setShowControls(false);
                            }}
                            className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 rounded"
                        >
                            Fast (3s)
                        </button>
                        <button
                            onClick={() => {
                                pollingControl.setNormalPolling();
                                setShowControls(false);
                            }}
                            className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 rounded"
                        >
                            Normal (10s)
                        </button>
                        <button
                            onClick={() => {
                                pollingControl.setSlowPolling();
                                setShowControls(false);
                            }}
                            className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 rounded"
                        >
                            Slow (30s)
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * Worker status indicator component
 */
export const WorkerStatusIndicator: React.FC = () => {
    const { healthStatus, workerCount, isLoading } = useLiveWorkerStatus();

    if (isLoading) return null;

    const statusConfig = {
        healthy: {
            color: 'text-green-600 bg-green-50 border-green-200',
            dotColor: 'bg-green-500',
            label: 'All Systems Operational'
        },
        degraded: {
            color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
            dotColor: 'bg-yellow-500',
            label: 'Limited Capacity'
        }
    };

    const config = statusConfig[healthStatus as keyof typeof statusConfig] || statusConfig.degraded;

    return (
        <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-md border ${config.color}`}>
            <span className={`h-2 w-2 rounded-full ${config.dotColor}`}></span>
            <span className="text-xs font-medium">{config.label}</span>
            <span className="text-xs opacity-75">({workerCount} workers)</span>
        </div>
    );
};

export default LiveIndicator;
