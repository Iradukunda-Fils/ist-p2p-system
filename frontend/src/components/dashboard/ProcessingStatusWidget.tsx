import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { documentsApi, ProcessingStatusSummary } from '@/api/documentsApi';
import { usePollingControl } from '@/hooks/useRealtimeData';

/**
 * Document Processing Status Widget
 * Shows real-time document processing pipeline status
 */
export const ProcessingStatusWidget: React.FC = () => {
    const pollingControl = usePollingControl();

    const { data, isLoading, error } = useQuery<ProcessingStatusSummary>({
        queryKey: ['processing-status'],
        queryFn: () => documentsApi.getProcessingStatus(),
        refetchInterval: pollingControl.isEnabled ? pollingControl.interval : false,
        refetchIntervalInBackground: true, // Continue polling in background
        staleTime: 5000, // Consider data stale after 5 seconds
    });

    if (isLoading) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-700">Processing status unavailable</p>
            </div>
        );
    }

    const totalDocs = data.total_documents || 0;
    const failedDocs = data.failed_processing || 0;
    const processingDocs = data.currently_processing || 0;
    const hasIssues = failedDocs > 0 || processingDocs > 5; // Alert if more than 5 processing

    return (
        <div className={`rounded-lg shadow-md p-6 border ${
            hasIssues ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-200' 
                     : 'bg-gradient-to-br from-green-50 to-green-100 border-green-200'
        }`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Document Processing</h3>
                <div className={`rounded-full p-2 ${hasIssues ? 'bg-red-600' : 'bg-green-600'}`}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {hasIssues ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        )}
                    </svg>
                </div>
            </div>

            <div className="space-y-3">
                {/* Total Documents */}
                <div>
                    <p className="text-sm text-gray-600 mb-1">Total Documents</p>
                    <p className="text-3xl font-bold text-gray-900">{totalDocs}</p>
                </div>

                {/* Status Breakdown */}
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-300">
                    <div className="text-center">
                        <p className="text-xs text-gray-600 uppercase mb-1">Processing</p>
                        <p className={`text-xl font-semibold ${processingDocs > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                            {processingDocs}
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-gray-600 uppercase mb-1">Completed</p>
                        <p className="text-xl font-semibold text-green-600">
                            {data.completed_processing || 0}
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-gray-600 uppercase mb-1">Failed</p>
                        <p className={`text-xl font-semibold ${failedDocs > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            {failedDocs}
                        </p>
                    </div>
                </div>

                {/* Alert for failed processing */}
                {failedDocs > 0 && (
                    <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-md">
                        <p className="text-sm text-red-800 font-medium">
                            ⚠️ {failedDocs} document{failedDocs > 1 ? 's' : ''} failed processing
                        </p>
                    </div>
                )}

                {/* Action Button */}
                <div className="pt-3">
                    <Link
                        to="/documents?processing_status=FAILED"
                        className="block w-full text-center bg-gray-800 hover:bg-gray-900 text-white font-medium py-2 px-4 rounded-md transition-colors text-sm"
                    >
                        View All Documents →
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ProcessingStatusWidget;
