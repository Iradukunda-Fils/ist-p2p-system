/**
 * Custom hook for document upload with progress tracking and state management
 * 
 * Handles the complete upload flow:
 * - File upload with progress tracking
 * - Task status polling
 * - Document status polling
 * - Automatic redirect on success
 * - Error handling
 */

import { useState } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { documentsApi, DocumentUploadData } from '@/api/documentsApi';
import { DocumentType } from '@/types';
import { showErrorToast, showSuccessToast } from '@/utils/errorHandler';
import { logger } from '@/utils/logger';
import { useTaskStatus } from '@/hooks/useTaskStatus';

type UploadState = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

interface UseDocumentUploadReturn {
    // State
    uploadState: UploadState;
    uploadProgress: number;
    uploadError: string | undefined;
    taskId: string | undefined;
    documentId: string | undefined;
    
    // Form data
    formData: {
        file: File | null;
        doc_type: DocumentType;
        title: string;
    };
    setFormData: React.Dispatch<React.SetStateAction<{
        file: File | null;
        doc_type: DocumentType;
        title: string;
    }>>;
    
    // Actions
    handleFileSelect: (file: File | null) => void;
    handleSubmit: (e: React.FormEvent) => Promise<void>;
    
    // Computed
    progress: number;
    showProgressBar: boolean;
    
    // Status data
    taskData: any;
    documentData: any;
}

export const useDocumentUpload = (): UseDocumentUploadReturn => {
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

    // Fetch document status while processing
    const { data: documentData } = useQuery({
        queryKey: ['document', documentId],
        queryFn: () => documentsApi.getDocument(documentId!),
        enabled: !!documentId && uploadState === 'processing',
        refetchInterval: uploadState === 'processing' ? 3000 : false,
    });

    // Progress calculation
    const getProgressPercentage = (): number => {
        if (uploadState === 'uploading') {
            // Upload phase: 0-40%
            return Math.min(uploadProgress * 0.4, 40);
        } else if (uploadState === 'processing') {
            const status = taskData?.status;
            // Processing phase: 40-100%
            if (status === 'PENDING') return 45;
            if (status === 'STARTED') {
                const elapsed = Date.now() - (taskData?.started_at ? new Date(taskData.started_at).getTime() : Date.now());
                const estimatedDuration = 30000;
                const timeProgress = Math.min(elapsed / estimatedDuration, 0.9);
                return Math.round(50 + (timeProgress * 45));
            }
            if (status === 'SUCCESS') return 100;
            if (status === 'FAILURE') return getProgressPercentage();
            return 50;
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
            
            const docId = response.document?.id;
            if (docId) {
                setDocumentId(docId);
            }
            
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            
            if (response.task_id) {
                setTaskId(response.task_id);
                setUploadState('processing');
                logger.info(`Tracking processing task: ${response.task_id}`, { context: 'Upload' });
            } else {
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

    return {
        uploadState,
        uploadProgress,
        uploadError,
        taskId,
        documentId,
        formData,
        setFormData,
        handleFileSelect,
        handleSubmit,
        progress,
        showProgressBar,
        taskData,
        documentData,
    };
};
