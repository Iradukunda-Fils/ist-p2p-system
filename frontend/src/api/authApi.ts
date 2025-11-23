import apiClient from './client';
import { AuthResponse, LoginCredentials, User } from '@/types';

/**
 * Authentication API calls
 */

export const authApi = {
    /**
     * Login with username and password
     */
    login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
        const response = await apiClient.post<AuthResponse>('/auth/token/', credentials);
        return response.data;
    },

    /**
     * Refresh access token
     */
    refreshToken: async (refreshToken: string): Promise<{ access: string }> => {
        const response = await apiClient.post<{ access: string }>('/auth/token/refresh/', {
            refresh: refreshToken,
        });
        return response.data;
    },

    /**
     * Logout and blacklist refresh token on server
     */
    logout: async (refreshToken: string): Promise<{ message: string }> => {
        const response = await apiClient.post<{ message: string }>('/auth/logout/', {
            refresh: refreshToken,
        });
        return response.data;
    },

    /**
     * Get current user info (if backend supports)
     */
    getCurrentUser: async (): Promise<User> => {
        const response = await apiClient.get<User>('/auth/user/');
        return response.data;
    },
};

export default authApi;
