import apiClient from './client';
import {
    Document,
    PaginatedResponse,
    ProcessingStatus,
    DocumentType,
} from '@/types';

/**
 * Query parameters for document filtering
 */
export interface DocumentQueryParams {
    doc_type?: DocumentType;
    processing_status?: ProcessingStatus;
    uploaded_by?: string;
    search?: string;
    ordering?: string;
    page?: number;
    page_size?: number;
}

/**
 * Document upload data
 */
export interface DocumentUploadData {
    file: File;
    doc_type: DocumentType;
    title?: string;
}

/**
 * Document upload options
 */
export interface DocumentUploadOptions {
    onProgress?: (progress: number) => void;
}

/**
 * Document metadata update data
 */
export interface DocumentMetadata {
    title?: string;
    doc_type?: DocumentType;
}

/**
 * Document upload response
 */
export interface DocumentUploadResponse {
    message: string;
    document: Document;
}

/**
 * Processing status summary response
 */
export interface ProcessingStatusSummary {
    total_documents: number;
    status_breakdown: Record<ProcessingStatus, number>;
    pending_processing: number;
    currently_processing: number;
    completed_processing: number;
    failed_processing: number;
}

/**
 * Documents API calls
 */
export const documentsApi = {
    /**
     * Get all documents with filters
     */
    getDocuments: async (params?: DocumentQueryParams): Promise<PaginatedResponse<Document>> => {
        const response = await apiClient.get<PaginatedResponse<Document>>('/documents/', { params });
        return response.data;
    },

    /**
     * Get single document by ID
     */
    getDocument: async (id: string): Promise<Document> => {
        const response = await apiClient.get<Document>(`/documents/${id}/`);
        return response.data;
    },

    /**
     * Upload new document
     */
    uploadDocument: async (data: DocumentUploadData, options?: DocumentUploadOptions): Promise<DocumentUploadResponse> => {
        const formData = new FormData();
        formData.append('file', data.file);
        formData.append('doc_type', data.doc_type);

        if (data.title) {
            formData.append('title', data.title);
        }

        const response = await apiClient.post<DocumentUploadResponse>(
            '/documents/',
            formData,
            {
                timeout: 300000, // 5 minutes for large file uploads
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        console.log(`Upload progress: ${percentCompleted}%`);
                        
                        // Call the progress callback if provided
                        if (options?.onProgress) {
                            options.onProgress(percentCompleted);
                        }
                    }
                },
            }
        );
        return response.data;
    },

    /**
     * Update document metadata (title, doc_type only)
     */
    updateDocument: async (id: string, data: DocumentMetadata): Promise<{ message: string; document: Document }> => {
        const response = await apiClient.patch<{ message: string; document: Document }>(
            `/documents/${id}/`,
            data
        );
        return response.data;
    },

    /**
     * Delete document (admin only)
     */
    deleteDocument: async (id: string): Promise<{ message: string }> => {
        const response = await apiClient.delete<{ message: string }>(`/documents/${id}/`);
        return response.data;
    },

    /**
     * Get document download URL and metadata
     */
    getDownloadInfo: async (id: string): Promise<{ file_url: string; filename: string; content_type: string }> => {
        const response = await apiClient.get<{ file_url: string; filename: string; content_type: string }>(
            `/documents/${id}/download/`
        );
        return response.data;
    },

    /**
     * Download document directly (returns blob)
     */
    downloadDirectDocument: async (id: string): Promise<Blob> => {
        const response = await apiClient.get(`/documents/${id}/download-direct/`, {
            responseType: 'blob',
        });
        return response.data;
    },

    /**
     * Get document processing metadata
     */
    getMetadata: async (id: string): Promise<{
        id: string;
        processing_status: ProcessingStatus;
        extracted_text: string | null;
        metadata: Record<string, any> | null;
        processing_error: string | null;
        processed_at: string | null;
        is_processed: boolean;
        is_processing: boolean;
        has_processing_error: boolean;
    }> => {
        const response = await apiClient.get(`/documents/${id}/metadata/`);
        return response.data;
    },

    /**
     * Trigger document reprocessing (admin only)
     */
    reprocessDocument: async (id: string): Promise<{ message: string; processing_status: ProcessingStatus }> => {
        const response = await apiClient.post<{ message: string; processing_status: ProcessingStatus }>(
            `/documents/${id}/reprocess/`
        );
        return response.data;
    },

    /**
     * Get processing status summary for all documents
     */
    getProcessingStatus: async (): Promise<ProcessingStatusSummary> => {
        const response = await apiClient.get<ProcessingStatusSummary>('/documents/processing-status/');
        return response.data;
    },
};

export default documentsApi;
