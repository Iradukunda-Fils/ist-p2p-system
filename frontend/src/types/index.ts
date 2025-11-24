/**
 * Comprehensive type definitions for the P2P Procurement System
 * Centralized location for all TypeScript interfaces and types
 */

// ============================================================================
// CORE TYPES
// ============================================================================

// User roles
export type UserRole = 'staff' | 'approver_lvl1' | 'approver_lvl2' | 'finance' | 'admin';

// Common base interfaces
export interface BaseEntity {
    id: string;
    created_at: string;
    updated_at: string;
}

export interface BaseComponentProps {
    className?: string;
    children?: React.ReactNode;
}

export interface LoadingState {
    isLoading: boolean;
    error: string | null;
}

export interface PaginationState {
    page: number;
    pageSize: number;
    total: number;
}

// User interface
export interface User {
    id: string;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
    role: UserRole;
    role_display?: string;
    is_active: boolean;
    is_admin?: boolean;
    is_staff?: boolean;
    date_joined: string;
    last_login?: string | null;
}

// Auth types
export interface LoginCredentials {
    username: string;
    password: string;
}

export interface AuthResponse {
    access: string;
    refresh: string;
    user: User;
}

// Purchase Request types
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface RequestItem {
    id?: string;
    name: string;
    quantity: number;
    unit_price: string;
    line_total?: string;
    description?: string;
    unit_of_measure?: string;
}

export interface PurchaseRequest {
    id: string;
    title: string;
    description: string;
    amount: string;
    status: RequestStatus;
    version: number;
    created_by: {
        id: string;
        username: string;
        email: string;
        role: UserRole;
    };
    last_approved_by?: {
        id: string;
        username: string;
    };
    items: RequestItem[];
    approvals: Approval[];
    pending_approval_levels: number[];
    required_approval_levels: number[];
    is_fully_approved: boolean;
    proforma?: Document;
    created_at: string;
    updated_at: string;
    approved_at?: string;
}

export interface CreateRequestData {
    title: string;
    description: string;
    items: Omit<RequestItem, 'id' | 'line_total'>[];
    proforma_id?: string;
}

// Approval types
export interface Approval {
    id: string;
    level: 1 | 2;
    decision: 'APPROVED' | 'REJECTED';
    comment: string;
    approver: {
        id: string;
        username: string;
    };
    created_at: string;
}

export interface ApprovalData {
    level: 1 | 2;
    comment: string;
    decision: 'APPROVED' | 'REJECTED';
}

// Approval response from approve/reject endpoints
export interface ApprovalResponse {
    message: string;
    approval: Approval;
    request_status: RequestStatus;
    pending_levels?: number[];
    is_fully_approved: boolean;
}

// Receipt validation result
export interface ValidationResult {
    id: string;
    original_filename: string;
    file_url: string;
    processing_status: ProcessingStatus;
    created_at: string;
    validation_errors?: string[];
}

// Receipt upload response
export interface ReceiptUploadResponse {
    message: string;
    document: Document;
    validation_result?: ValidationResult;
}

// Receipt validation status response
export interface ReceiptValidationStatus {
    status: string;
    validation_results: ValidationResult[];
}

// Purchase Order types
export type POStatus = 'DRAFT' | 'SENT' | 'ACKNOWLEDGED' | 'FULFILLED';

export interface PurchaseOrder {
    id: string;
    po_number: string;
    vendor: string;
    vendor_contact?: string;
    total: string;
    status: POStatus;
    metadata: {
        items: RequestItem[];
        request_title: string;
        terms?: {
            payment_terms?: string;
            delivery_terms?: string;
        };
    };
    request: {
        id: string;
        title: string;
        created_by: {
            username: string;
        };
    };
    items: RequestItem[];
    created_at: string;
}

export interface POSummary {
    total_pos: number;
    draft_pos: number;
    sent_pos: number;
    acknowledged_pos: number;
    fulfilled_pos: number;
    total_value: number;
}


// Document types
export type DocumentType = 'PROFORMA' | 'RECEIPT' | 'PO' | 'OTHER';
export type ProcessingStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface Document {
    id: string;
    original_filename: string;
    title?: string;
    file_size: number;
    file_hash?: string;  // SHA-256 hash for integrity verification
    doc_type: DocumentType;
    file_url: string;
    file_extension: string;
    uploaded_by: {
        id: string;
        username: string;
        email: string;
        role: string;
    };
    uploaded_at: string;  // Alias for created_at
    processing_status: ProcessingStatus;
    extracted_text?: string;  // OCR or extracted text content
    metadata?: Record<string, any>;  // Structured metadata from processing
    processing_error?: string;  // Error message if processing failed
    processed_at?: string;  // When processing completed
    is_processed: boolean;
    is_processing?: boolean;  // Computed field
    has_processing_error?: boolean;  // Computed field
    created_at: string;
    updated_at: string;
}

// API Error types
export interface APIError {
    code: string;
    message: string;
    details?: Record<string, string[]>;
}

export interface APIErrorResponse {
    error: APIError;
}

// Pagination
export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

// Query params
export interface RequestQueryParams {
    status?: RequestStatus;
    created_by?: string;
    amount?: string;
    search?: string;
    ordering?: string;
    page?: number;
    page_size?: number;
}

export interface OrderQueryParams {
    status?: POStatus;
    vendor?: string;
    po_number?: string;
    search?: string;
    ordering?: string;
    page?: number;
    page_size?: number;
}
