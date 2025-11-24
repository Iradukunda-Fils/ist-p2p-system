import { UserRole } from '@/types';

/**
 * App-wide constants and configuration
 * Centralized location for all application constants
 */

export const APP_NAME = 'P2P Procurement System';

// Application configuration
export const APP_CONFIG = {
    NAME: 'P2P Procurement System',
    VERSION: '1.0.0',
    DESCRIPTION: 'Procurement and Purchase Order Management System',
} as const;

// API endpoints
export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: '/auth/token/',
        REFRESH: '/auth/token/refresh/',
        USER: '/auth/user/',
    },
    PURCHASES: {
        REQUESTS: '/purchases/requests/',
        ORDERS: '/purchases/purchase-orders/',
    },
    DOCUMENTS: {
        UPLOAD: '/documents/upload/',
    },
};

// Request statuses
export const REQUEST_STATUSES = {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
} as const;

// PO statuses
export const PO_STATUSES = {
    DRAFT: 'DRAFT',
    SENT: 'SENT',
    ACKNOWLEDGED: 'ACKNOWLEDGED',
    FULFILLED: 'FULFILLED',
} as const;

// User roles
export const USER_ROLES: Record<UserRole, string> = {
    staff: 'Staff',
    approver_lvl1: 'Approver Level 1',
    approver_lvl2: 'Approver Level 2',
    finance: 'Finance',
    admin: 'Administrator',
};

// Role-based route permissions
export const ROLE_PERMISSIONS = {
    staff: ['dashboard', 'requests', 'create-request'],
    approver_lvl1: ['dashboard', 'requests', 'approvals'],
    approver_lvl2: ['dashboard', 'requests', 'approvals'],
    finance: ['dashboard', 'requests', 'orders', 'receipts'],
    admin: ['dashboard', 'requests', 'orders', 'users', 'admin'],
};

// Approval thresholds
export const APPROVAL_THRESHOLDS = {
    LEVEL_1_MAX: 1000,
} as const;

// File upload constraints
export const FILE_UPLOAD = {
    MAX_SIZE: 50 * 1024 * 1024, // 50MB (matches backend and nginx)
    ALLOWED_TYPES: {
        PROFORMA: ['application/pdf', 'image/png', 'image/jpeg', 'image/tiff'],
        RECEIPT: ['application/pdf', 'image/png', 'image/jpeg', 'image/tiff'],
    },
    ALLOWED_EXTENSIONS: ['.pdf', '.png', '.jpg', '.jpeg', '.tiff'],
} as const;

// Pagination
export const PAGINATION = {
    DEFAULT_PAGE_SIZE: 20,
    PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;
