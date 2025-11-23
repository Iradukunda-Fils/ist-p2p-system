import React from 'react';
import clsx from 'clsx';
import { Button } from '@/components/common/Button';
import { FileUpload } from '@/components/common/FileUpload';
import { Modal } from '@/components/common/Modal';
import { ValidationResult } from '@/types';
import { formatDateTime } from '@/utils/formatters';
import { useModal } from '@/hooks';

interface ReceiptSectionProps {
    validationResults?: ValidationResult[];
    canUpload: boolean;
    onUpload: (file: File) => void;
    isUploading: boolean;
}

/**
 * Displays receipt validation results and upload functionality
 */
export const ReceiptSection: React.FC<ReceiptSectionProps> = ({
    validationResults,
    canUpload,
    onUpload,
    isUploading,
}) => {
    const uploadModal = useModal();

    return (
        <>
            <div className="space-y-4">
                {validationResults && validationResults.length > 0 ? (
                    <div className="space-y-3">
                        {validationResults.map((result) => (
                            <div 
                                key={result.id} 
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                role="article"
                                aria-label={`Receipt: ${result.original_filename}`}
                            >
                                <div className="flex items-center space-x-3">
                                    <svg 
                                        className="h-8 w-8 text-gray-400" 
                                        fill="currentColor" 
                                        viewBox="0 0 20 20"
                                        aria-hidden="true"
                                    >
                                        <path 
                                            fillRule="evenodd" 
                                            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" 
                                            clipRule="evenodd" 
                                        />
                                    </svg>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">
                                            {result.original_filename}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Uploaded {formatDateTime(result.created_at)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span 
                                        className={clsx(
                                            "px-2 py-1 text-xs font-medium rounded-full",
                                            result.processing_status === 'COMPLETED' 
                                                ? "bg-green-100 text-green-800" 
                                                : result.processing_status === 'FAILED' 
                                                ? "bg-red-100 text-red-800" 
                                                : "bg-yellow-100 text-yellow-800"
                                        )}
                                        role="status"
                                        aria-label={`Processing status: ${result.processing_status}`}
                                    >
                                        {result.processing_status}
                                    </span>
                                    {result.file_url && (
                                        <a 
                                            href={result.file_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-indigo-600 hover:text-indigo-900 text-sm"
                                            aria-label={`View ${result.original_filename}`}
                                        >
                                            View
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-500 italic">
                        No receipts uploaded yet.
                    </p>
                )}

                {canUpload && (
                    <div className="mt-4">
                        <Button 
                            onClick={uploadModal.open}
                            aria-label="Open receipt upload dialog"
                        >
                            Upload Receipt
                        </Button>
                    </div>
                )}
            </div>

            {/* Upload Receipt Modal */}
            <Modal
                isOpen={uploadModal.isOpen}
                onClose={uploadModal.close}
                title="Upload Receipt"
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                        Upload a receipt image or PDF to validate against the purchase order.
                    </p>
                    <FileUpload
                        onFileSelect={(file) => {
                            onUpload(file);
                            uploadModal.close();
                        }}
                        isLoading={isUploading}
                        accept="image/*,application/pdf"
                        label="Upload Receipt"
                    />
                    <div className="flex justify-end">
                        <Button
                            variant="secondary"
                            onClick={uploadModal.close}
                            disabled={isUploading}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
};
