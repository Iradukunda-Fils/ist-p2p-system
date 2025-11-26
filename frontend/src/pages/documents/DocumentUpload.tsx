import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { documentsApi, DocumentUploadData, DocumentUploadResponse } from '@/api/documentsApi';
import { DocumentType } from '@/types';
import { MainLayout } from '@/components/layout/MainLayout';
import { FileUpload } from '@/components/common/FileUpload';
import { showErrorToast, showSuccessToast } from '@/utils/errorHandler';
import { logger } from '@/utils/logger';
import { FILE_UPLOAD } from '@/utils/constants';

/**
 * Document upload component with drag-and-drop support
 */
type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export const DocumentUpload: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [uploadState, setUploadState] = useState<UploadState>('idle');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadError, setUploadError] = useState<string | undefined>(undefined);
    const [formData, setFormData] = useState<{
        file: File | null;
        doc_type: DocumentType;
        title: string;
    }>({
        file: null,
        doc_type: 'OTHER',
        title: '',
    });

    const handleFileSelect = (file: File) => {
        setFormData(prev => ({
            ...prev,
            file,
            title: prev.title || file.name.replace(/\.[^/.]+$/, ''), // Auto-fill title from filename
        }));
        setUploadError(undefined); // Clear any previous errors
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.file) {
            showErrorToast('Please select a file to upload');
            return;
        }

        setUploadState('uploading');
        setUploadProgress(0);
        setUploadError(undefined);

        try {
            const uploadData: DocumentUploadData = {
                file: formData.file,
                doc_type: formData.doc_type,
                title: formData.title || undefined,
            };

            logger.info('Starting upload...', { context: 'Upload', data: uploadData });

            // Create a timeout promise to prevent hanging
            const timeoutPromise = new Promise<DocumentUploadResponse>((_, reject) => {
                setTimeout(() => {
                    reject(new Error('Upload timeout - request took longer than 6 minutes'));
                }, 6 * 60 * 1000); // 6 minutes timeout
            });

            // Create a custom upload function with progress tracking
            const uploadPromise = documentsApi.uploadDocument(uploadData, {
                onProgress: (progress: number) => {
                    logger.debug(`Upload progress: ${progress}%`, { context: 'Upload' });
                    setUploadProgress(progress);
                }
            });

            // Race between upload and timeout
            const response = await Promise.race([uploadPromise, timeoutPromise]);
            
            logger.info('Upload completed', { context: 'Upload', data: { response } });
            logger.debug(`Document ID: ${response.document?.id}`, { context: 'Upload' });
            
            // Set success state and show success message
            setUploadState('success');
            showSuccessToast(response.message || 'Document uploaded successfully');
            
            // Invalidate documents query to trigger refresh
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            
            // Check if we have a document ID before navigating
            if (response.document?.id) {
                // Wait a moment to show the success state, then navigate
                setTimeout(() => {
                    logger.info(`Navigating to: /documents/${response.document.id}`, { context: 'Upload' });
                    navigate(`/documents/${response.document.id}`);
                }, 1500);
            } else {
                logger.error('No document ID in response, navigating to documents list', undefined, { context: 'Upload' });
                setTimeout(() => {
                    navigate('/documents');
                }, 1500);
            }
            
        } catch (error) {
            logger.error('Upload error', error, { context: 'Upload' });
            setUploadState('error');
            setUploadError(error instanceof Error ? error.message : 'Failed to upload document');
            showErrorToast(error, 'Failed to upload document');
        }
    };

    return (
        <MainLayout>
            <div className="max-w-2xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Upload Document</h1>
                    <p className="mt-1 text-sm text-gray-600">
                        Upload documents for proforma invoices, receipts, or other purposes
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* File Upload Area */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Document File *
                        </label>
                        
                        <FileUpload
                            onFileSelect={handleFileSelect}
                            isLoading={uploadState === 'uploading'}
                            accept="application/pdf,image/*"
                            maxSize={FILE_UPLOAD.MAX_SIZE}
                            label="Upload Document"
                            error={uploadError}
                            allowedTypes={['application/pdf', 'image/png', 'image/jpeg', 'image/tiff']}
                            showProgress={uploadState === 'uploading'}
                            uploadProgress={uploadProgress}
                        />
                    </div>

                    {/* Document Type */}
                    <div>
                        <label htmlFor="doc_type" className="block text-sm font-medium text-gray-700 mb-2">
                            Document Type *
                        </label>
                        <select
                            id="doc_type"
                            value={formData.doc_type}
                            onChange={(e) => setFormData(prev => ({ ...prev, doc_type: e.target.value as DocumentType }))}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            required
                        >
                            <option value="PROFORMA">Proforma Invoice</option>
                            <option value="RECEIPT">Receipt</option>
                            <option value="PO">Purchase Order</option>
                            <option value="OTHER">Other</option>
                        </select>

                    </div>

                    {/* Title */}
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                            Document Title (Optional)
                        </label>
                        <input
                            type="text"
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="e.g., Office Supplies Proforma"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            If not provided, filename will be used
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end space-x-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={() => navigate('/documents')}
                            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            disabled={uploadState === 'uploading'}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={uploadState === 'uploading' || uploadState === 'success' || !formData.file}
                            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed flex items-center ${
                                uploadState === 'success' 
                                    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' 
                                    : uploadState === 'error'
                                    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                                    : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                            } ${
                                (uploadState === 'uploading' || uploadState === 'success' || !formData.file) 
                                    ? 'opacity-75' 
                                    : ''
                            }`}
                        >
                            {uploadState === 'uploading' ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Uploading...
                                </>
                            ) : uploadState === 'success' ? (
                                <>
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Success! Redirecting...
                                </>
                            ) : uploadState === 'error' ? (
                                <>
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Try Again
                                </>
                            ) : (
                                'Upload Document'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </MainLayout>
    );
};

export default DocumentUpload;
