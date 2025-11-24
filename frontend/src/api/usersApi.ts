import apiClient from './client';
import { User } from '@/types';

export interface UserCreateData {
    username: string;
    email: string;
    password: string;
    password_confirm: string;
    first_name?: string;
    last_name?: string;
    role: string;
    is_active?: boolean;
}

export interface UserUpdateData {
    email?: string;
    first_name?: string;
    last_name?: string;
    role?: string;
    is_active?: boolean;
    password?: string;
}

export interface UserStats {
    total_users: number;
    active_users: number;
    inactive_users: number;
    role_counts: Record<string, { name: string; count: number }>;
}

export interface UserListResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: User[];
}

export const usersApi = {
    /**
     * Get all users (paginated)
     */
    getUsers: async (params?: {
        page?: number;
        search?: string;
        role?: string;
        is_active?: boolean;
        ordering?: string;
    }): Promise<UserListResponse> => {
        const response = await apiClient.get<UserListResponse>('/auth/users/', { params });
        return response.data;
    },

    /**
     * Get user by ID
     */
    getUser: async (id: string): Promise<User> => {
        const response = await apiClient.get<User>(`/auth/users/${id}/`);
        return response.data;
    },

    /**
     * Create new user
     */
    createUser: async (data: UserCreateData): Promise<User> => {
        const response = await apiClient.post<User>('/auth/users/', data);
        return response.data;
    },

    /**
     * Update user
     */
    updateUser: async (id: string, data: UserUpdateData): Promise<User> => {
        const response = await apiClient.patch<User>(`/auth/users/${id}/`, data);
        return response.data;
    },

    /**
     * Delete user
     */
    deleteUser: async (id: string): Promise<void> => {
        await apiClient.delete(`/auth/users/${id}/`);
    },

    /**
     * Deactivate user
     */
    deactivateUser: async (id: string): Promise<User> => {
        const response = await apiClient.post<User>(`/auth/users/${id}/deactivate/`);
        return response.data;
    },

    /**
     * Activate user
     */
    activateUser: async (id: string): Promise<User> => {
        const response = await apiClient.post<User>(`/auth/users/${id}/activate/`);
        return response.data;
    },

    /**
     * Get user statistics
     */
    getStats: async (): Promise<UserStats> => {
        const response = await apiClient.get<UserStats>('/auth/users/stats/');
        return response.data;
    },
};

export default usersApi;
