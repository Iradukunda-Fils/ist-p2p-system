import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { purchasesApi } from '@/api/purchasesApi';
import { ReceiptValidationStatus } from '@/types';
import { toast } from 'react-toastify';

interface UseReceiptOptions {
    requestId: string;
    isApproved: boolean;
}

interface UseReceiptReturn {
    validationStatus: ReceiptValidationStatus | undefined;
    isLoadingValidation: boolean;
    uploadReceipt: (file: File) => void;
    isUploading: boolean;
    selectedFiles: File[];
    selectFiles: (files: File[]) => void;
    removeFile: (index: number) => void;
    clearFiles: () => void;
}

/**
 * Custom hook for managing receipt uploads and validation
 * Supports file preview, validation, and upload progress
 */
export const useReceipt = ({ requestId, isApproved }: UseReceiptOptions): UseReceiptReturn => {
    const queryClient = useQueryClient();
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

    const { data: validationStatus, isLoading: isLoadingValidation } = useQuery({
        queryKey: ['receipt-validation', requestId],
        queryFn: () => purchasesApi.getReceiptValidation(requestId),
        enabled: !!requestId && isApproved,
    });

    const uploadMutation = useMutation({
        mutationFn: (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('doc_type', 'RECEIPT');
            return purchasesApi.submitReceipt(requestId, formData);
        },
        onSuccess: (response) => {
            toast.success(response.message || 'Receipt uploaded successfully');
            queryClient.invalidateQueries({ queryKey: ['receipt-validation', requestId] });
            setSelectedFiles([]);
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.error?.message 
                || error.response?.data?.message 
                || 'Failed to upload receipt';
            toast.error(errorMessage);
        },
    });

    const uploadReceipt = (file: File) => {
        uploadMutation.mutate(file);
    };

    const selectFiles = (files: File[]) => {
        setSelectedFiles(files);
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const clearFiles = () => {
        setSelectedFiles([]);
    };

    return {
        validationStatus,
        isLoadingValidation,
        uploadReceipt,
        isUploading: uploadMutation.isPending,
        selectedFiles,
        selectFiles,
        removeFile,
        clearFiles,
    };
};
