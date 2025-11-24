import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi } from '@/api/documentsApi';
import { Document, DocumentType } from '@/types';
import { FILE_UPLOAD } from '@/utils/constants';
import { validateFileSize, validateFileType } from '@/utils/validationUtils';

export interface FileUploadOptions {
    maxSize?: number;
    allowedExtensions?: string[];
    onProgress?: (progress: number) => void;
    onSuccess?: (document: Document) => void;
    onError?: (error: string) => void;
}

export interface FileUploadState {
    file: File | null;
    progress: number;
    error: string | null;
    isUploading: boolean;
}

/**
 * Custom hook for handling file uploads with validation and progress tracking
 * 
 * @param options - Upload configuration options
 * @returns Upload state and control functions
 */
export function useFileUpload(options: FileUploadOptions = {}) {
    const queryClient = useQueryClient();
    const [state, setState] = useState<FileUploadState>({
        file: null,
        progress: 0,
        error: null,
        isUploading: false,
    });

    const {
        maxSize = FILE_UPLOAD.MAX_SIZE,
        allowedExtensions = FILE_UPLOAD.ALLOWED_EXTENSIONS,
        onProgress,
        onSuccess,
        onError,
    } = options;

    // Upload mutation
    const uploadMutation = useMutation({
        mutationFn: async ({ file, docType, title }: { 
            file: File; 
            docType: DocumentType;
            title?: string;
        }) => {
            return documentsApi.uploadDocument(
                { file, doc_type: docType, title },
                {
                    onProgress: (progress) => {
                        setState(prev => ({ ...prev, progress }));
                        onProgress?.(progress);
                    }
                }
            );
        },
        onSuccess: (response) => {
            setState(prev => ({
                ...prev,
                progress: 100,
                isUploading: false,
            }));
            
            // Invalidate documents query to refetch
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            queryClient.invalidateQueries({ queryKey: ['document', response.document.id] });
            
            onSuccess?.(response.document);
        },
        onError: (error: any) => {
            const errorMessage = error?.response?.data?.error?.message || 'Upload failed';
            setState(prev => ({
                ...prev,
                error: errorMessage,
                isUploading: false,
                progress: 0,
            }));
            onError?.(errorMessage);
        },
    });

    /**
     * Validate a file before upload
     */
    const validateFile = useCallback((file: File): string | null => {
        // Validate file size
        const sizeValidation = validateFileSize(file, maxSize / (1024 * 1024));
        if (!sizeValidation.isValid) {
            return sizeValidation.error || 'File size validation failed';
        }

        // Validate file extension
        const fileName = file.name.toLowerCase();
        const hasValidExtension = allowedExtensions.some(ext =>
            fileName.endsWith(ext.toLowerCase())
        );

        if (!hasValidExtension) {
            return `File type not supported. Allowed: ${allowedExtensions.join(', ')}`;
        }

        return null;
    }, [maxSize, allowedExtensions]);

    /**
     * Upload a file with validation
     */
    const uploadFile = useCallback(async (
        file: File,
        docType: DocumentType,
        title?: string
    ) => {
        // Reset state
        setState({
            file,
            progress: 0,
            error: null,
            isUploading: true,
        });

        // Validate file
        const validationError = validateFile(file);
        if (validationError) {
            setState(prev => ({
                ...prev,
                error: validationError,
                isUploading: false,
            }));
            onError?.(validationError);
            return;
        }

        // Perform upload
        await uploadMutation.mutateAsync({ file, docType, title });
    }, [validateFile, uploadMutation, onError]);

    /**
     * Clear upload state and reset
     */
    const reset = useCallback(() => {
        setState({
            file: null,
            progress: 0,
            error: null,
            isUploading: false,
        });
    }, []);

    /**
     * Retry failed upload
     */
    const retry = useCallback(async () => {
        if (state.file) {
            setState(prev => ({ ...prev, error: null, isUploading: true }));
            await uploadMutation.mutateAsync({
                file: state.file,
                docType: 'OTHER', // Default type for retry
            });
        }
    }, [state.file, uploadMutation]);

    return {
        ...state,
        uploadFile,
        reset,
        retry,
        validateFile,
    };
}
