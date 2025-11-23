import apiClient from './client';
import {
    PurchaseRequest,
    CreateRequestData,
    PaginatedResponse,
    RequestQueryParams,
    ApprovalData,
    ApprovalResponse,
    ReceiptUploadResponse,
    ReceiptValidationStatus,
} from '@/types';

/**
 * Purchase Requests API calls
 */
export const purchasesApi = {
    /**
     * Get all purchase requests with filters
     */
    getRequests: async (params?: RequestQueryParams): Promise<PaginatedResponse<PurchaseRequest>> => {
        const response = await apiClient.get<PaginatedResponse<PurchaseRequest>>('/purchases/requests/', { params });
        return response.data;
    },

    /**
     * Get single purchase request by ID
     */
    getRequest: async (id: string): Promise<PurchaseRequest> => {
        const response = await apiClient.get<PurchaseRequest>(`/purchases/requests/${id}/`);
        return response.data;
    },

    /**
     * Create new purchase request
     */
    createRequest: async (data: CreateRequestData): Promise<{ message: string; request: PurchaseRequest }> => {
        // Ensure numeric values are properly converted
        const payload = {
            ...data,
            items: data.items.map(item => ({
                ...item,
                quantity: Number(item.quantity),
                unit_price: Number(item.unit_price),
            })),
        };

        const response = await apiClient.post<{ message: string; request: PurchaseRequest }>('/purchases/requests/', payload);
        return response.data;
    },

    /**
     * Update purchase request
     */
    updateRequest: async (id: string, data: Partial<CreateRequestData>): Promise<{ message: string; request: PurchaseRequest }> => {
        const payload = {
            ...data,
            items: data.items?.map(item => ({
                ...item,
                quantity: Number(item.quantity),
                unit_price: Number(item.unit_price),
            })),
        };
        const response = await apiClient.patch<{ message: string; request: PurchaseRequest }>(`/purchases/requests/${id}/`, payload);
        return response.data;
    },

    approveRequest: async (id: string, data: ApprovalData): Promise<ApprovalResponse> => {
        const response = await apiClient.post<ApprovalResponse>(`/purchases/requests/${id}/approve/`, data);
        return response.data;
    },

    /**
     * Reject purchase request
     */
    rejectRequest: async (id: string, data: ApprovalData): Promise<ApprovalResponse> => {
        const response = await apiClient.post<ApprovalResponse>(`/purchases/requests/${id}/reject/`, data);
        return response.data;
    },

    /**
     * Submit receipt for request
     */
    submitReceipt: async (id: string, formData: FormData): Promise<ReceiptUploadResponse> => {
        const response = await apiClient.post<ReceiptUploadResponse>(`/purchases/requests/${id}/submit-receipt/`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    /**
     * Get receipt validation status
     */
    getReceiptValidation: async (id: string): Promise<ReceiptValidationStatus> => {
        const response = await apiClient.get<ReceiptValidationStatus>(`/purchases/requests/${id}/receipt-validation-status/`);
        return response.data;
    },

    /**
     * Get approval summary for current user (backend endpoint: /purchases/requests/approval-summary/)
     */
    getApprovalSummary: async (): Promise<{
        total_requests: number;
        pending_requests: number;
        approved_requests: number;
        rejected_requests: number;
        pending_level_1_approvals?: number;
        pending_level_2_approvals?: number;
    }> => {
        const response = await apiClient.get('/purchases/requests/approval-summary/');
        return response.data;
    },
};

export default purchasesApi;
