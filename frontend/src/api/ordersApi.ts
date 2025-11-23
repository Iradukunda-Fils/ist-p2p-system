import apiClient from './client';
import {
    PurchaseOrder,
    PaginatedResponse,
    OrderQueryParams,
    POSummary,
} from '@/types';

/**
 * Purchase Orders API calls
 */

export const ordersApi = {
    /**
     * Get all purchase orders with filters (Finance/Admin only)
     */
    getOrders: async (params?: OrderQueryParams): Promise<PaginatedResponse<PurchaseOrder>> => {
        const response = await apiClient.get<PaginatedResponse<PurchaseOrder>>('/purchases/purchase-orders/', { params });
        return response.data;
    },

    /**
     * Get single purchase order by ID
     */
    getOrder: async (id: string): Promise<PurchaseOrder> => {
        const response = await apiClient.get<PurchaseOrder>(`/purchases/purchase-orders/${id}/`);
        return response.data;
    },

    /**
     * Generate PDF for purchase order
     */
    generatePDF: async (id: string): Promise<{ message: string; po_number: string }> => {
        const response = await apiClient.get<{ message: string; po_number: string }>(`/purchases/purchase-orders/${id}/generate-pdf/`);
        return response.data;
    },

    /**
     * Get PO summary statistics
     */
    getSummary: async (): Promise<POSummary> => {
        const response = await apiClient.get<POSummary>('/purchases/purchase-orders/summary/');
        return response.data;
    },
};

export default ordersApi;
