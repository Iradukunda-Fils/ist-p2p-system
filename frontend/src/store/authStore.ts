import { create } from 'zustand';
import { authApi } from '@/api/authApi';
import { User } from '@/types';
import { secureCookieManager } from '@/utils/cookies';
import { broadcastAuthEvent, subscribeToAuthEvents, AuthSyncMessage } from '@/utils/authSync';

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isLoggingOut: boolean;
    error: string | null;
    lastActivity: number;
    sessionTimeoutId: NodeJS.Timeout | null;
    tokenExpiryTimerId: NodeJS.Timeout | null;
    tokenExpiresAt: number | null;
    login: (username: string, password: string) => Promise<void>;
    logout: () => Promise<{ success: boolean; username?: string }>;
    checkAuth: () => Promise<void>;
    initializeAuthSync: () => () => void;
    updateActivity: () => void;
    startSessionMonitoring: () => void;
    stopSessionMonitoring: () => void;
    handleSessionTimeout: () => void;
    refreshTokenIfNeeded: () => Promise<boolean>;
    startTokenExpiryTimer: () => void;
    stopTokenExpiryTimer: () => void;
    handleTokenExpiry: () => Promise<void>;
    getTimeUntilTokenExpiry: () => number | null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isLoggingOut: false,
    error: null,
    lastActivity: Date.now(),
    sessionTimeoutId: null,
    tokenExpiryTimerId: null,
    tokenExpiresAt: null,

    login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
            const response = await authApi.login({ username, password });

            // Use enhanced secure cookie manager to store tokens
            secureCookieManager.setAuthTokens(response.access, response.refresh);
            secureCookieManager.setUserData(response.user);

            const now = Date.now();
            set({
                user: response.user,
                isAuthenticated: true,
                isLoading: false,
                error: null,
                lastActivity: now,
            });

            // Start session monitoring after successful login
            get().startSessionMonitoring();

            // Start token expiry timer to automatically refresh tokens
            get().startTokenExpiryTimer();

            // Broadcast login event to all tabs
            broadcastAuthEvent({
                type: 'LOGIN',
                timestamp: now,
                user: response.user,
            });
        } catch (error) {
            set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
            });
            throw error;
        }
    },

    logout: async () => {
        const currentUser = get().user;
        const username = currentUser?.username;
        
        set({ isLoggingOut: true, error: null });
        
        try {
            // Get refresh token before clearing data
            const refreshToken = secureCookieManager.getRefreshToken();
            
            // Call server logout endpoint to blacklist token (non-blocking)
            if (refreshToken) {
                // Fire-and-forget with 2-second timeout to prevent blocking
                Promise.race([
                    authApi.logout(refreshToken),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Server logout timeout')), 2000)
                    )
                ]).then(
                    () => console.log('[Auth] Server logout successful'),
                    (error) => console.warn('[Auth] Server logout skipped/timed out:', error)
                );
                // Don't await - continue with client cleanup immediately
            }

            // Always perform client-side cleanup regardless of server response
            
            // Stop session monitoring
            get().stopSessionMonitoring();

            // Stop token expiry timer
            get().stopTokenExpiryTimer();

            // Clear all authentication data
            secureCookieManager.clearAuthData();

            set({
                user: null,
                isAuthenticated: false,
                isLoggingOut: false,
                error: null,
                lastActivity: 0,
                sessionTimeoutId: null,
                tokenExpiryTimerId: null,
                tokenExpiresAt: null,
            });

            // Broadcast logout event to all tabs
            broadcastAuthEvent({
                type: 'LOGOUT',
                timestamp: Date.now(),
            });

            console.log('[Auth] Logout completed successfully');
            return { success: true, username };
        } catch (error) {
            console.error('[Auth] Error during logout process:', error);
            
            // Even if there's an error, we should still clear local state
            get().stopSessionMonitoring();
            get().stopTokenExpiryTimer();
            secureCookieManager.clearAuthData();
            
            set({
                user: null,
                isAuthenticated: false,
                isLoggingOut: false,
                error: 'Logout failed, but local session cleared',
                lastActivity: 0,
                sessionTimeoutId: null,
                tokenExpiryTimerId: null,
                tokenExpiresAt: null,
            });

            // Still broadcast logout event even on error
            broadcastAuthEvent({
                type: 'LOGOUT',
                timestamp: Date.now(),
            });

            return { success: false, username };
        }
    },

    checkAuth: async () => {
        try {
            // Perform comprehensive security check
            const securityCheck = secureCookieManager.performSecurityCheck();

            if (!securityCheck.isSecure) {
                console.warn('[Auth] Security issues detected:', securityCheck.issues);

                // If session timed out or tokens are invalid, logout
                if (securityCheck.issues.some(issue =>
                    issue.includes('Session has timed out') ||
                    issue.includes('invalid or expired')
                )) {
                    get().logout().catch(error => {
                        console.error('[Auth] Error during security check logout:', error);
                    });
                    return;
                }
            }

            // Check if we have valid authentication data
            if (!secureCookieManager.hasValidAuthData()) {
                set({
                    user: null,
                    isAuthenticated: false,
                    error: null, // Clear any previous errors
                });
                return;
            }

            // Try to refresh token if needed
            const refreshed = await get().refreshTokenIfNeeded();
            if (!refreshed) {
                // If refresh failed, we're not authenticated
                set({
                    user: null,
                    isAuthenticated: false,
                    error: null, // Clear any previous errors
                });
                return;
            }

            // Get session info and update state
            const sessionInfo = secureCookieManager.getSessionInfo();
            if (sessionInfo) {
                set({
                    user: sessionInfo.user,
                    isAuthenticated: true,
                    lastActivity: sessionInfo.lastActivity,
                    error: null, // Clear any previous errors
                });

                // Start session monitoring if not already started
                get().startSessionMonitoring();

                // Start token expiry timer if not already started
                get().startTokenExpiryTimer();
            } else {
                set({
                    user: null,
                    isAuthenticated: false,
                    error: null, // Clear any previous errors
                });
            }
        } catch (error) {
            console.error('[Auth] Error during auth check:', error);
            set({
                user: null,
                isAuthenticated: false,
                error: 'Authentication check failed',
            });
        }
    },

    /**
     * Update user activity timestamp and extend session
     */
    updateActivity: () => {
        const now = Date.now();

        // Update session activity in cookies
        secureCookieManager.updateSessionActivity();

        // Update local state
        set({ lastActivity: now });

        // Reset session timeout
        get().startSessionMonitoring();
    },

    /**
     * Start monitoring session timeout
     */
    startSessionMonitoring: () => {
        const state = get();

        // Clear existing timeout
        if (state.sessionTimeoutId) {
            clearTimeout(state.sessionTimeoutId);
        }

        // Set new timeout (30 minutes = 1800000ms)
        const timeoutId = setTimeout(() => {
            get().handleSessionTimeout();
        }, 30 * 60 * 1000); // 30 minutes

        set({ sessionTimeoutId: timeoutId });
    },

    /**
     * Stop session monitoring
     */
    stopSessionMonitoring: () => {
        const state = get();
        if (state.sessionTimeoutId) {
            clearTimeout(state.sessionTimeoutId);
            set({ sessionTimeoutId: null });
        }
    },

    /**
     * Handle session timeout
     */
    handleSessionTimeout: () => {
        console.log('[Auth] Session timed out due to inactivity');

        // Check if session is actually inactive
        if (!secureCookieManager.isSessionActive()) {
            get().logout().catch(error => {
                console.error('[Auth] Error during session timeout logout:', error);
            });

            // Redirect to login with timeout message
            const currentPath = window.location.pathname;
            if (currentPath !== '/login') {
                window.location.href = `/login?timeout=true&redirect=${encodeURIComponent(currentPath)}`;
            }
        } else {
            // Session is still active (activity in another tab), restart monitoring
            get().startSessionMonitoring();
        }
    },

    /**
     * Refresh token if needed
     */
    refreshTokenIfNeeded: async (): Promise<boolean> => {
        try {
            // Check if token refresh is needed
            if (!secureCookieManager.needsTokenRefresh()) {
                return true; // No refresh needed, tokens are valid
            }

            const refreshToken = secureCookieManager.getRefreshToken();
            if (!refreshToken) {
                console.warn('[Auth] No refresh token available');
                return false;
            }

            console.log('[Auth] Refreshing access token...');

            // Call refresh API
            const response = await authApi.refreshToken(refreshToken);

            // Store new tokens (keep existing refresh token since Django doesn't rotate it)
            secureCookieManager.setAuthTokens(response.access, refreshToken);

            // Update activity timestamp
            secureCookieManager.updateSessionActivity();

            // Broadcast token refresh event to all tabs
            broadcastAuthEvent({
                type: 'TOKEN_REFRESH',
                timestamp: Date.now(),
            });

            console.log('[Auth] Token refreshed successfully');
            return true;
        } catch (error) {
            console.error('[Auth] Token refresh failed:', error);
            return false;
        }
    },

    /**
     * Initialize cross-tab authentication synchronization
     * Returns cleanup function
     */
    initializeAuthSync: () => {
        const unsubscribe = subscribeToAuthEvents((message: AuthSyncMessage) => {
            console.log('[Auth Sync] Received event from another tab:', message.type);

            switch (message.type) {
                case 'LOGIN':
                    // Another tab logged in - update our state
                    get().checkAuth();
                    break;

                case 'LOGOUT':
                    // Another tab logged out - clear our state
                    get().stopSessionMonitoring();
                    get().stopTokenExpiryTimer();
                    secureCookieManager.clearAuthData();
                    set({
                        user: null,
                        isAuthenticated: false,
                        error: null,
                        lastActivity: 0,
                        sessionTimeoutId: null,
                        tokenExpiryTimerId: null,
                        tokenExpiresAt: null,
                    });

                    // Redirect to login if not already there
                    if (window.location.pathname !== '/login') {
                        window.location.href = '/login';
                    }
                    break;

                case 'TOKEN_REFRESH':
                    // Token was refreshed in another tab - reload user data
                    get().checkAuth();
                    break;
            }
        });

        return unsubscribe;
    },

    /**
     * Start token expiry timer to automatically refresh before expiration
     */
    startTokenExpiryTimer: () => {
        const state = get();

        // Clear existing timer
        if (state.tokenExpiryTimerId) {
            clearTimeout(state.tokenExpiryTimerId);
        }

        // Get time until token expires
        const timeUntilExpiry = secureCookieManager.getTimeUntilExpiry();
        if (!timeUntilExpiry) {
            console.warn('[Auth] Cannot start token expiry timer - no expiry time available');
            return;
        }

        // Set token expiry timestamp
        const expiresAt = Date.now() + timeUntilExpiry;
        set({ tokenExpiresAt: expiresAt });

        // Refresh token well before expiry to account for network latency
        // For 60min tokens: refresh at 55min (5 min buffer)
        // For shorter tokens: refresh halfway through
        const refreshBuffer = Math.min(5 * 60 * 1000, timeUntilExpiry / 2); // 5 minutes or half the lifetime
        const refreshTime = Math.max(timeUntilExpiry - refreshBuffer, 60 * 1000); // At least 1 minute

        console.log(`[Auth] Token expires in ${Math.round(timeUntilExpiry / 1000)}s, will refresh in ${Math.round(refreshTime / 1000)}s`);

        const timerId = setTimeout(() => {
            get().handleTokenExpiry();
        }, refreshTime);

        set({ tokenExpiryTimerId: timerId });
    },

    /**
     * Stop token expiry timer
     */
    stopTokenExpiryTimer: () => {
        const state = get();
        if (state.tokenExpiryTimerId) {
            clearTimeout(state.tokenExpiryTimerId);
            set({
                tokenExpiryTimerId: null,
                tokenExpiresAt: null
            });
        }
    },

    /**
     * Handle token expiry by attempting to refresh
     */
    handleTokenExpiry: async () => {
        console.log('[Auth] Access token is about to expire, attempting refresh...');

        try {
            const refreshed = await get().refreshTokenIfNeeded();
            if (refreshed) {
                // Restart the timer with new token
                get().startTokenExpiryTimer();
            } else {
                console.warn('[Auth] Token refresh failed, user will need to re-authenticate');
                // Don't logout immediately, let the API client handle 401 responses
            }
        } catch (error) {
            console.error('[Auth] Error during token expiry handling:', error);
        }
    },

    /**
     * Get time until access token expires (in milliseconds)
     */
    getTimeUntilTokenExpiry: () => {
        const state = get();
        if (!state.tokenExpiresAt) {
            return secureCookieManager.getTimeUntilExpiry();
        }
        return Math.max(0, state.tokenExpiresAt - Date.now());
    },
}));
