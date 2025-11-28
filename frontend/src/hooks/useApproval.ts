import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { purchasesApi } from '@/api/purchasesApi';
import { ApprovalResponse, ApprovalData } from '@/types';
import { toast } from 'react-toastify';

interface UseApprovalOptions {
    requestId: string;
    onSuccess?: () => void;
}

interface UseApprovalReturn {
    comment: string;
    setComment: (comment: string) => void;
    approve: (level: 1 | 2) => void;
    reject: (level: 1 | 2) => void;
    isApproving: boolean;
    isRejecting: boolean;
    reset: () => void;
    poTaskId?: string;
}

/**
 * Custom hook for managing purchase request approvals and rejections
 * Handles validation, optimistic updates, and error handling
 */
export const useApproval = ({ requestId, onSuccess }: UseApprovalOptions): UseApprovalReturn => {
    const queryClient = useQueryClient();
    const [comment, setComment] = useState<string>('');
    const [poTaskId, setPoTaskId] = useState<string | undefined>(undefined);

    const validateResponse = (response: ApprovalResponse): boolean => {
        if (!response.approval) {
            toast.error('Invalid response: missing approval data');
            return false;
        }
        if (!response.approval.decision || !response.approval.level) {
            toast.error('Invalid response: incomplete approval data');
            return false;
        }
        return true;
    };

    const approveMutation = useMutation({
        mutationFn: (data: ApprovalData) => purchasesApi.approveRequest(requestId, data),
        onSuccess: (response) => {
            if (validateResponse(response)) {
                toast.success(response.message || 'Request approved successfully');
                queryClient.invalidateQueries({ queryKey: ['request', requestId] });
                queryClient.invalidateQueries({ queryKey: ['requests'] });
                setComment('');
                
                // Set PO task ID if present
                if (response.po_task_id) {
                    setPoTaskId(response.po_task_id);
                }
                
                onSuccess?.();
            }
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.error?.message 
                || error.response?.data?.message 
                || 'Failed to approve request';
            toast.error(errorMessage);
        },
    });

    const rejectMutation = useMutation({
        mutationFn: (data: ApprovalData) => purchasesApi.rejectRequest(requestId, data),
        onSuccess: (response) => {
            if (validateResponse(response)) {
                toast.success(response.message || 'Request rejected');
                queryClient.invalidateQueries({ queryKey: ['request', requestId] });
                queryClient.invalidateQueries({ queryKey: ['requests'] });
                setComment('');
                onSuccess?.();
            }
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.error?.message 
                || error.response?.data?.message 
                || 'Failed to reject request';
            toast.error(errorMessage);
        },
    });

    const approve = (level: 1 | 2) => {
        approveMutation.mutate({
            level,
            comment,
            decision: 'APPROVED',
        });
    };

    const reject = (level: 1 | 2) => {
        if (!comment.trim()) {
            toast.error('Comment is required for rejection');
            return;
        }
        rejectMutation.mutate({
            level,
            comment,
            decision: 'REJECTED',
        });
    };

    const reset = () => {
        setComment('');
        setPoTaskId(undefined);
        approveMutation.reset();
        rejectMutation.reset();
    };

    return {
        comment,
        setComment,
        approve,
        reject,
        isApproving: approveMutation.isPending,
        isRejecting: rejectMutation.isPending,
        reset,
        poTaskId,
    };
};
