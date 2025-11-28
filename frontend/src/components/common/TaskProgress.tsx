import React from 'react';
import { TaskState } from '@/types';
import { useTaskStatus } from '@/hooks/useTaskStatus';

interface TaskProgressProps {
    taskId: string | null;
    title?: string;
    onComplete?: (result: any) => void;
    onError?: (error: string) => void;
    className?: string;
    showResult?: boolean;
}

export const TaskProgress: React.FC<TaskProgressProps> = ({
    taskId,
    title = 'Processing...',
    onComplete,
    onError,
    className = '',
    showResult = false
}) => {
    const { 
        data, 
        isLoading, 
        error: hookError, 
        isComplete 
    } = useTaskStatus({
        taskId,
        onComplete: (data) => {
            if (data.successful && onComplete) {
                onComplete(data.result);
            } else if (data.failed && onError) {
                onError(data.error || 'Task failed');
            }
        }
    });

    if (!taskId) return null;

    if (hookError) {
        return (
            <div className={`p-4 bg-red-50 text-red-700 rounded-md ${className}`}>
                <p className="font-medium">Error tracking task</p>
                <p className="text-sm">{(hookError as Error).message}</p>
            </div>
        );
    }

    const status = data?.status || 'PENDING';
    const isFailed = status === 'FAILURE' || status === 'REVOKED';
    const isSuccess = status === 'SUCCESS';
    
    // Determine progress bar color and width
    let progressColor = 'bg-blue-600';
    let width = '0%';
    let statusText = 'Initializing...';

    switch (status) {
        case 'PENDING':
            width = '10%';
            statusText = 'Queued...';
            progressColor = 'bg-gray-400';
            break;
        case 'STARTED':
            width = '50%';
            statusText = 'Processing...';
            progressColor = 'bg-blue-600 animate-pulse';
            break;
        case 'RETRY':
            width = '50%';
            statusText = 'Retrying...';
            progressColor = 'bg-yellow-500';
            break;
        case 'SUCCESS':
            width = '100%';
            statusText = 'Completed';
            progressColor = 'bg-green-600';
            break;
        case 'FAILURE':
        case 'REVOKED':
            width = '100%';
            statusText = 'Failed';
            progressColor = 'bg-red-600';
            break;
    }

    return (
        <div className={`w-full ${className}`}>
            <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">{title}</span>
                <span className="text-sm font-medium text-gray-500">{statusText}</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                    className={`h-2.5 rounded-full transition-all duration-500 ${progressColor}`} 
                    style={{ width }}
                ></div>
            </div>

            {isFailed && data?.error && (
                <div className="mt-2 text-sm text-red-600">
                    Error: {data.error}
                </div>
            )}

            {showResult && isSuccess && data?.result && (
                <div className="mt-2 text-sm text-green-700 bg-green-50 p-2 rounded">
                    {typeof data.result === 'string' ? data.result : JSON.stringify(data.result)}
                </div>
            )}
        </div>
    );
};

export default TaskProgress;
