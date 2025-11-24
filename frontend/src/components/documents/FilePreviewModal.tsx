import React, { useState, useEffect } from 'react';
import { Document } from '@/types';
import { getFileType } from '@/utils/fileIcons';
import { Button } from '@/components/common/Button';

export interface FilePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    document: Document | null;
    previewUrl: string | null;
    onDownload?: () => void;
}

/**
 * Full-screen preview modal for images and PDFs
 * Displays at 90% width and 90% height, centered on screen
 */
export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
    isOpen,
    onClose,
    document,
    previewUrl,
    onDownload,
}) => {
    const [imageError, setImageError] = useState(false);

    // Handle escape key
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.document.addEventListener('keydown', handleEscape);
        return () => window.document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            window.document.body.style.overflow = 'hidden';
        } else {
            window.document.body.style.overflow = 'unset';
        }

        return () => {
            window.document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen || !document || !previewUrl) return null;

    const fileType = getFileType(document.file_extension);
    const isImage = fileType === 'image';
    const isPDF = fileType === 'pdf';

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="preview-modal-title"
        >
            {/* Background overlay */}
            <div
                className="fixed inset-0 bg-gray-900 bg-opacity-75 backdrop-blur-sm transition-opacity"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal panel - 90% width and height */}
            <div
                className="relative bg-white rounded-lg shadow-xl overflow-hidden"
                style={{ width: '90%', height: '90%', maxWidth: '90vw', maxHeight: '90vh' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="h-full flex flex-col">
                    {/* Header with title and actions */}
                    <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-white">
                        <div className="flex-1 min-w-0">
                            <h3 
                                id="preview-modal-title"
                                className="text-lg font-semibold text-gray-900 truncate"
                                title={document.title || document.original_filename}
                            >
                                {document.title || document.original_filename}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                                {document.file_extension?.toUpperCase()} • {Math.round(document.file_size / 1024)} KB
                            </p>
                        </div>
                        
                        <div className="flex items-center space-x-3 ml-4">
                            {onDownload && (
                                <Button variant="secondary" onClick={onDownload}>
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Download
                                </Button>
                            )}
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-2"
                                aria-label="Close preview"
                            >
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Preview Content */}
                    <div className="flex-1 overflow-auto bg-gray-100 p-6">
                        <div className="h-full flex items-center justify-center">
                            {isImage && !imageError ? (
                                <img
                                    src={previewUrl}
                                    alt={document.title || document.original_filename}
                                    className="max-w-full max-h-full object-contain rounded shadow-lg"
                                    onError={() => setImageError(true)}
                                />
                            ) : isPDF ? (
                                <iframe
                                    src={previewUrl}
                                    className="w-full h-full border-0 rounded shadow-lg bg-white"
                                    title={document.title || document.original_filename}
                                />
                            ) : (
                                <div className="text-center text-gray-500">
                                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <p className="text-lg mb-2">Preview not available for this file type</p>
                                    <p className="text-sm text-gray-400 mb-4">Download the file to view its contents</p>
                                    {onDownload && (
                                        <Button onClick={onDownload}>
                                            Download File
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer with keyboard hint */}
                    <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                        <p className="text-xs text-gray-500 text-center">
                            Press <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-gray-700 font-mono">ESC</kbd> to close
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
