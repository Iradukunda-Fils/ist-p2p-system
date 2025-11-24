import React from 'react';
import { Document } from '@/types';
import { formatFileSize, formatDateTime } from '@/utils/formatters';
import { FileIcon, getFileType, getFileTypeBgColor } from '@/utils/fileIcons';
import { Button } from '@/components/common/Button';
import clsx from 'clsx';

export interface FileCardProps {
    document: Document;
    isLoading?: boolean;
    uploadProgress?: number;
    onDownload?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    onPreview?: () => void;
    showActions?: boolean;
}

/**
 * Responsive file card component for displaying document information
 * Adapts to screen size and provides preview, actions, and metadata
 */
export const FileCard: React.FC<FileCardProps> = ({
    document,
    isLoading = false,
    uploadProgress,
    onDownload,
    onEdit,
    onDelete,
    onPreview,
    showActions = true,
}) => {
    const fileType = getFileType(document.file_extension);
    const bgColor = getFileTypeBgColor(fileType);
    const canPreview = ['pdf', 'image'].includes(fileType);

    return (
        <div
            className={clsx(
                'relative rounded-lg border-2 transition-all duration-200',
                'hover:shadow-md hover:border-blue-300',
                isLoading ? 'border-gray-200 bg-gray-50' : 'border-gray-200 bg-white'
            )}
        >
            {/* Upload Progress Overlay */}
            {isLoading && uploadProgress !== undefined && (
                <div className="absolute inset-0 bg-white bg-opacity-90 rounded-lg flex flex-col items-center justify-center z-10">
                    <div className="w-16 h-16 mb-2">
                        <svg className="animate-spin h-full w-full text-blue-600" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                    <div className="text-sm font-medium text-gray-700">Uploading... {uploadProgress}%</div>
                    <div className="w-48 bg-gray-200 rounded-full h-2 mt-2">
                        <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                        ></div>
                    </div>
                </div>
            )}

            {/* Card Content */}
            <div
                className={clsx(
                    'p-4 cursor-pointer',
                    canPreview && onPreview && 'hover:bg-gray-50'
                )}
                onClick={() => canPreview && onPreview?.()}
            >
                {/* File Icon/Thumbnail */}
                <div className={clsx('mb-3 flex items-center justify-center rounded-lg p-4', bgColor)}>
                    <FileIcon type={fileType} className="w-16 h-16" />
                </div>

                {/* File Name */}
                <h3 className="font-medium text-gray-900 text-sm mb-1 truncate" title={document.title || document.original_filename}>
                    {document.title || document.original_filename}
                </h3>

                {/* File Metadata */}
                <div className="space-y-1 mb-3">
                    <p className="text-xs text-gray-500">
                        {document.file_extension?.toUpperCase()} • {formatFileSize(document.file_size)}
                    </p>
                    <p className="text-xs text-gray-500">
                        {formatDateTime(document.created_at)}
                    </p>
                    <p className="text-xs text-gray-500 truncate" title={document.uploaded_by.username}>
                        By {document.uploaded_by.username}
                    </p>
                </div>

                {/* Processing Status Badge */}
                {document.processing_status !== 'COMPLETED' && (
                    <div className={clsx(
                        'text-xs px-2 py-1 rounded-full inline-block mb-2',
                        document.processing_status === 'PROCESSING' && 'bg-yellow-100 text-yellow-800',
                        document.processing_status === 'PENDING' && 'bg-gray-100 text-gray-800',
                        document.processing_status === 'FAILED' && 'bg-red-100 text-red-800'
                    )}>
                        {document.processing_status}
                    </div>
                )}
            </div>

            {/* Actions */}
            {showActions && (
                <div className="border-t border-gray-200 px-4 py-3 flex justify-between items-center">
                    <div className="flex space-x-2">
                        {onDownload && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDownload();
                                }}
                                className="text-blue-600 hover:text-blue-800 transition-colors"
                                title="Download"
                                aria-label="Download document"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </button>
                        )}
                        {onEdit && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit();
                                }}
                                className="text-gray-600 hover:text-gray-800 transition-colors"
                                title="Edit metadata"
                                aria-label="Edit document metadata"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>
                        )}
                    </div>
                    {onDelete && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete();
                            }}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Delete"
                            aria-label="Delete document"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
