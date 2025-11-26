import React from 'react';
import clsx from 'clsx';

interface UploadProgressCardProps {
    fileName: string;
    fileSize: number;
    progress: number;
    status: 'uploading' | 'success' | 'error';
    error?: string;
    onCancel?: () => void;
}

/**
 * Upload Progress Card Component
 * 
 * Displays the progress of a file upload with visual feedback
 * and status indicators.
 */
export const UploadProgressCard: React.FC<UploadProgressCardProps> = ({
    fileName,
    fileSize,
    progress,
    status,
    error,
    onCancel,
}) => {
    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className={clsx(
            'border rounded-lg p-4 transition-all',
            status === 'error' ? 'border-red-300 bg-red-50' :
            status === 'success' ? 'border-green-300 bg-green-50' :
            'border-gray-300 bg-white'
        )}>
            {/* Header with file info */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 pr-4">
                    <p className="text-sm font-medium text-gray-900 truncate">
                        {fileName}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                        {formatFileSize(fileSize)}
                    </p>
                </div>

                {/* Status Icon */}
                <div className="flex-shrink-0">
                    {status === 'uploading' && (
                        <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    )}
                    {status === 'success' && (
                        <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}
                    {status === 'error' && (
                        <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-2">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>
                        {status === 'uploading' && `Uploading... ${progress}%`}
                        {status === 'success' && 'Upload complete'}
                        {status === 'error' && 'Upload failed'}
                    </span>
                    {status === 'uploading' && onCancel && (
                        <button
                            onClick={onCancel}
                            className="text-red-600 hover:text-red-800 font-medium"
                        >
                            Cancel
                        </button>
                    )}
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                        className={clsx(
                            'h-2 rounded-full transition-all duration-300',
                            status === 'error' ? 'bg-red-500' :
                            status === 'success' ? 'bg-green-500' :
                            'bg-blue-600'
                        )}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Error Message */}
            {status === 'error' && error && (
                <div className="mt-2 text-xs text-red-600 bg-red-100 p-2 rounded">
                    {error}
                </div>
            )}

            {/* Success Message */}
            {status === 'success' && (
                <div className="mt-2 text-xs text-green-600 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    File uploaded successfully
                </div>
            )}
        </div>
    );
};

export default UploadProgressCard;
