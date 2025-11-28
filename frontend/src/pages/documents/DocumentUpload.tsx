import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { documentsApi, DocumentUploadData } from '@/api/documentsApi';
import { DocumentType } from '@/types';
import { MainLayout } from '@/components/layout/MainLayout';
import { showErrorToast, showSuccessToast } from '@/utils/errorHandler';
import { logger } from '@/utils/logger';
import { FILE_UPLOAD } from '@/utils/constants';
import { useTaskStatus } from '@/hooks/useTaskStatus';

type UploadState = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

export const DocumentUpload: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    
    // State
    const [uploadState, setUploadState] = useState<UploadState>('idle');
    const [taskId, setTaskId] = useState<string | undefined>(undefined);
    const [documentId, setDocumentId] = useState<string | undefined>(undefined);
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

    // Task status tracking with real-time polling
    const { 
        data: taskData, 
        isLoading: taskIsLoading,
        isComplete: taskIsComplete 
    } = useTaskStatus({
        taskId: taskId || null,
        enabled: !!taskId && uploadState === 'processing',
        onComplete: (data) => {
            if (data.successful && documentId) {
                showSuccessToast('Document processed successfully!');
                setUploadState('success');
                
                // Redirect after brief delay
                setTimeout(() => {
                    logger.info(`Processing complete, redirecting to /documents/${documentId}`, { context: 'Upload' });
                    navigate(`/documents/${documentId}`);
                }, 800);
            }
        },
        onError: (error) => {
            setUploadState('error');
            setUploadError(error.message || 'Processing failed');
            showErrorToast(error.message || 'Document processing failed');
        }
    });



    const getProgressPercentage = (): number => {
        if (uploadState === 'uploading') {
            return uploadProgress;
        } else if (uploadState === 'processing') {
            const status = taskData?.status;
            if (status === 'PENDING') return 100; // Upload complete, waiting to process
            if (status === 'STARTED') return 50; // Processing
            if (status === 'SUCCESS') return 100;
            return 50; // Default processing state
        } else if (uploadState === 'success') {
            return 100;
        }
        return 0;
    };

    const handleFileSelect = (file: File | null) => {
        if (!file) return;
        
        setFormData(prev => ({
            ...prev,
            file,
            title: prev.title || file.name.replace(/\.[^/.]+$/, ''),
        }));
        setUploadError(undefined);
        setTaskId(undefined);
        setDocumentId(undefined);
        setUploadState('idle');
        setUploadProgress(0);
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

            const response = await documentsApi.uploadDocument(uploadData, {
                onProgress: (progress: number) => {
                    setUploadProgress(progress);
                }
            });
            
            logger.info('Upload completed', { context: 'Upload', data: response });
            
            // Store document ID
            const docId = response.document?.id;
            if (docId) {
                setDocumentId(docId);
            }
            
            // Invalidate queries
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            
            // If task tracking is needed
            if (response.task_id) {
                setTaskId(response.task_id);
                setUploadState('processing');
                logger.info(`Tracking processing task: ${response.task_id}`, { context: 'Upload' });
            } else {
                // No processing needed, redirect immediately
                setUploadState('success');
                showSuccessToast('Document uploaded successfully!');
                setTimeout(() => {
                    if (docId) {
                        navigate(`/documents/${docId}`);
                    } else {
                        navigate('/documents');
                    }
                }, 800);
            }
            
        } catch (error) {
            logger.error('Upload error', error, { context: 'Upload' });
            setUploadState('error');
            setUploadError(error instanceof Error ? error.message : 'Failed to upload document');
            showErrorToast(error, 'Failed to upload document');
        }
    };

    const progress = getProgressPercentage();
    const showProgressBar = uploadState === 'uploading' || uploadState === 'processing';

    return (
        <MainLayout>
            <div className="max-w-2xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Upload Document</h1>
                    <p className="mt-1 text-sm text-gray-600">
                        Upload documents for processing (PDF or image formats)
                    </p>
                </div>

                {/* Progress Display */}
                {showProgressBar && (
                    <div className="mb-6 bg-white rounded-lg shadow-md p-6">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-gray-700">
                                {uploadState === 'uploading' ? 'Uploading...' : 'Processing document...'}
                            </span>
                            <span className="text-sm font-semibold text-blue-600">{progress}%</span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-300 ease-out ${
                                    uploadState === 'uploading' ? 'bg-blue-600' : 'bg-green-600'
                                } ${uploadState === 'processing' ? 'animate-pulse' : ''}`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>

                        {uploadState === 'processing' && (
                            <p className="mt-3 text-xs text-gray-500 text-center">
                                Extracting metadata and processing content...
                            </p>
                        )}
                    </div>
                )}

                {/* Error Display */}
                {uploadError && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-sm text-red-800 font-medium">Error: {uploadError}</p>
                    </div>
                )}

                {/* Upload Form */}
                <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
                    {/* File Upload Area */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Document File *
                        </label>
                        
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                            <input
                                type="file"
                                accept="application/pdf,image/*"
                                onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                                disabled={uploadState === 'uploading' || uploadState === 'processing'}
                                className="hidden"
                                id="file-upload"
                            />
                            <label htmlFor="file-upload" className="cursor-pointer">
                                {formData.file ? (
                                    <div className="space-y-2">
                                        <svg className="mx-auto h-12 w-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <p className="text-sm font-medium text-gray-900">{formData.file.name}</p>
                                        <p className="text-xs text-gray-500">{(formData.file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        <p className="text-sm text-gray-600">Click to select file or drag and drop</p>
                                        <p className="text-xs text-gray-500">PDF, PNG, JPG up to {FILE_UPLOAD.MAX_SIZE / 1024 / 1024}MB</p>
                                    </div>
                                )}
                            </label>
                        </div>
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
                            disabled={uploadState === 'uploading' || uploadState === 'processing'}
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
                            disabled={uploadState === 'uploading' || uploadState === 'processing'}
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
                            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                            disabled={uploadState === 'uploading' || uploadState === 'processing'}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!formData.file || uploadState === 'uploading' || uploadState === 'processing'}
                            className={`px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                                uploadState === 'success' ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                        >
                            {uploadState === 'uploading' ? 'Uploading...' : 
                             uploadState === 'processing' ? 'Processing...' : 
                             uploadState === 'success' ? 'Success!' : 
                             'Upload Document'}
                        </button>
                    </div>
                </form>
            </div>
        </MainLayout>
    );
};

export default DocumentUpload;
