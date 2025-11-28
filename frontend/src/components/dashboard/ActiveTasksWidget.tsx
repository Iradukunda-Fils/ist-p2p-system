import React, { useState } from 'react';
import { useLiveTaskQueue } from '@/hooks/useRealtimeData';
import { Card } from '@/components/common/Card';
import { Spinner } from '@/components/common/Spinner';
import { formatDistanceToNow } from 'date-fns';

export const ActiveTasksWidget: React.FC = () => {
    const { activeTasks, queueDepth, isLoading, lastUpdate, isLive } = useLiveTaskQueue();
    const [isExpanded, setIsExpanded] = useState(false);

    if (isLoading && !activeTasks.length) {
        return (
            <Card title="Active Tasks">
                <div className="flex justify-center py-8">
                    <Spinner />
                </div>
            </Card>
        );
    }

    return (
        <Card 
            title={
                <div className="flex items-center justify-between">
                    <span>Active Tasks Queue</span>
                    {isLive && (
                        <span className="flex items-center text-xs text-green-600">
                            <span className="animate-pulse mr-1">●</span>
                            Live
                        </span>
                    )}
                </div>
            }
        >
            <div className="space-y-4">
                {/* Queue Summary */}
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div>
                        <div className="text-3xl font-bold text-blue-600">{queueDepth}</div>
                        <div className="text-sm text-gray-600">Tasks in Queue</div>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                        Updated {formatDistanceToNow(lastUpdate, { addSuffix: true })}
                    </div>
                </div>

                {/* Active Tasks List */}
                {queueDepth > 0 && (
                    <>
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="w-full text-left text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                            {isExpanded ? '▼' : '▶'} {isExpanded ? 'Hide' : 'Show'} Details
                        </button>

                        {isExpanded && (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {activeTasks.map((task, index) => (
                                    <div 
                                        key={task.task_id} 
                                        className="p-3 bg-gray-50 rounded border border-gray-200 hover:border-blue-300 transition-colors"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {task.name?.split('.').pop() || 'Unknown Task'}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    ID: {task.task_id.substring(0, 8)}...
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    Worker: {task.worker}
                                                </div>
                                            </div>
                                            <div className="text-xs text-blue-600 font-medium">
                                                #{index + 1}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {queueDepth === 0 && (
                    <div className="text-center py-6 text-gray-500">
                        <p className="text-sm">No active tasks</p>
                        <p className="text-xs mt-1">All workers idle</p>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default ActiveTasksWidget;
