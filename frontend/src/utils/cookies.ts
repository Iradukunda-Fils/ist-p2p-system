/**
 * Enhanced secure cookie management utilities
 * Provides secure cookie storage with validation, expiration checking, and cleanup
 */

import { User } from '../types';
import { logger } from './logger';

// Cookie configuration constants
const COOKIES = {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
    USER_DATA: 'user_data',
    SESSION_TIMESTAMP: 'session_timestamp',
    TOKEN_EXPIRY: 'token_expiry',
} as const;

// Cookie security configuration
const COOKIE_CONFIG = {
    // Access token cookie expiry - MUST match backend JWT lifetime (60 minutes)
    // Backend: SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'] = timedelta(minutes=60)
    ACCESS_TOKEN_EXPIRY_MINUTES: 60,
    // Refresh token expires in 7 days (matches backend)
    REFRESH_TOKEN_EXPIRY_DAYS: 7,
    // User data expires in 7 days
    USER_DATA_EXPIRY_DAYS: 7,
    // Session timeout in minutes (30 minutes of inactivity)
    SESSION_TIMEOUT_MINUTES: 30,
} as const;

interface CookieOptions {
    expires?: Date;
    maxAge?: number; // seconds
    path?: string;
    domain?: string;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
    httpOnly?: boolean; // Note: Cannot be set via JavaScript, but documented for reference
}

interface TokenValidationResult {
    isValid: boolean;
    isExpired: boolean;
    expiresAt?: number;
    error?: string;
}

interface SessionInfo {
    accessToken: string;
    refreshToken: string;
    user: User;
    expiresAt: number;
    lastActivity: number;
}

export class SecureCookieManager {
    private static instance: SecureCookieManager;
    
    private constructor() {}
    
    public static getInstance(): SecureCookieManager {
        if (!SecureCookieManager.instance) {
            SecureCookieManager.instance = new SecureCookieManager();
        }
        return SecureCookieManager.instance;
    }

    /**
     * Set a cookie with enhanced security options
     */
    private setCookie(name: string, value: string, options: CookieOptions = {}): void {
        const {
            expires,
            maxAge,
            path = '/',
            domain,
            secure = this.isSecureContext(),
            sameSite = 'Strict',
        } = options;

        const cookieParts = [`${name}=${encodeURIComponent(value)}`];

        if (expires) {
            cookieParts.push(`expires=${expires.toUTCString()}`);
        }

        if (maxAge !== undefined) {
            cookieParts.push(`max-age=${maxAge}`);
        }

        cookieParts.push(`path=${path}`);

        if (domain) {
            cookieParts.push(`domain=${domain}`);
        }

        if (secure) {
            cookieParts.push('Secure');
        }

        cookieParts.push(`SameSite=${sameSite}`);

        document.cookie = cookieParts.join('; ');
    }

    /**
     * Get a cookie value with validation
     */
    private getCookie(name: string): string | null {
        const nameEQ = `${name}=`;
        const cookies = document.cookie.split(';');
        
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.indexOf(nameEQ) === 0) {
                const value = cookie.substring(nameEQ.length);
                try {
                    return decodeURIComponent(value);
                } catch (error) {
                    logger.error(`Failed to decode cookie ${name}`, error, { context: 'Cookie' });
                    return null;
                }
            }
        }
        
        return null;
    }

    /**
     * Delete a cookie securely
     */
    private deleteCookie(name: string, path: string = '/', domain?: string): void {
        const cookieParts = [
            `${name}=`,
            'expires=Thu, 01 Jan 1970 00:00:00 UTC',
            `path=${path}`,
        ];

        if (domain) {
            cookieParts.push(`domain=${domain}`);
        }

        // Add security attributes even for deletion
        if (this.isSecureContext()) {
            cookieParts.push('Secure');
        }
        cookieParts.push('SameSite=Strict');

        document.cookie = cookieParts.join('; ');
    }

    /**
     * Check if we're in a secure context (HTTPS)
     */
    private isSecureContext(): boolean {
        return window.location.protocol === 'https:' || 
               window.location.hostname === 'localhost' ||
               window.location.hostname === '127.0.0.1';
    }

    /**
     * Create expiration date from minutes
     */
    private createExpiryDate(minutes: number): Date {
        const date = new Date();
        date.setTime(date.getTime() + minutes * 60 * 1000);
        return date;
    }

    /**
     * Create expiration date from days
     */
    private createExpiryDateFromDays(days: number): Date {
        const date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        return date;
    }

    /**
     * Decode and parse JWT token payload (without verification)
     * Used for extracting expiration time
     */
    private parseJWTPayload(token: string): any {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                throw new Error('Invalid JWT format');
            }

            const payload = parts[1];
            // Add padding if needed
            const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
            const decoded = atob(paddedPayload);
            return JSON.parse(decoded);
        } catch (error) {
            logger.error('Failed to parse JWT payload', error, { context: 'Cookie' });
            return null;
        }
    }

    /**
     * Validate JWT token structure and expiration
     */
    public validateToken(token: string): TokenValidationResult {
        if (!token || typeof token !== 'string') {
            return {
                isValid: false,
                isExpired: false,
                error: 'Token is empty or invalid format',
            };
        }

        const payload = this.parseJWTPayload(token);
        if (!payload) {
            return {
                isValid: false,
                isExpired: false,
                error: 'Failed to parse token payload',
            };
        }

        const now = Math.floor(Date.now() / 1000);
        const expiresAt = payload.exp;

        if (!expiresAt) {
            return {
                isValid: false,
                isExpired: false,
                error: 'Token missing expiration claim',
            };
        }

        const isExpired = now >= expiresAt;

        return {
            isValid: !isExpired,
            isExpired,
            expiresAt: expiresAt * 1000, // Convert to milliseconds
            error: isExpired ? 'Token has expired' : undefined,
        };
    }

    /**
     * Check if session is still active based on last activity
     */
    public isSessionActive(): boolean {
        const timestamp = this.getCookie(COOKIES.SESSION_TIMESTAMP);
        if (!timestamp) {
            return false;
        }

        const lastActivity = parseInt(timestamp, 10);
        const now = Date.now();
        const sessionTimeoutMs = COOKIE_CONFIG.SESSION_TIMEOUT_MINUTES * 60 * 1000;

        return (now - lastActivity) < sessionTimeoutMs;
    }

    /**
     * Update session activity timestamp
     */
    public updateSessionActivity(): void {
        const now = Date.now();
        this.setCookie(COOKIES.SESSION_TIMESTAMP, now.toString(), {
            expires: this.createExpiryDateFromDays(COOKIE_CONFIG.USER_DATA_EXPIRY_DAYS),
        });
    }

    /**
     * Store authentication tokens with enhanced security
     */
    public setAuthTokens(accessToken: string, refreshToken: string): void {
        // Validate tokens before storing
        const accessValidation = this.validateToken(accessToken);
        const refreshValidation = this.validateToken(refreshToken);

        if (!accessValidation.isValid) {
            logger.warn('Access token validation failed', { context: 'Cookie', data: accessValidation.error });
        }

        if (!refreshValidation.isValid) {
            logger.warn('Refresh token validation failed', { context: 'Cookie', data: refreshValidation.error });
        }

        // Store access token with short expiry
        this.setCookie(COOKIES.ACCESS_TOKEN, accessToken, {
            expires: this.createExpiryDate(COOKIE_CONFIG.ACCESS_TOKEN_EXPIRY_MINUTES),
        });

        // Store refresh token with longer expiry
        this.setCookie(COOKIES.REFRESH_TOKEN, refreshToken, {
            expires: this.createExpiryDateFromDays(COOKIE_CONFIG.REFRESH_TOKEN_EXPIRY_DAYS),
        });

        // Store token expiry information
        if (accessValidation.expiresAt) {
            this.setCookie(COOKIES.TOKEN_EXPIRY, accessValidation.expiresAt.toString(), {
                expires: this.createExpiryDateFromDays(COOKIE_CONFIG.REFRESH_TOKEN_EXPIRY_DAYS),
            });
        }

        // Update session activity
        this.updateSessionActivity();
    }

    /**
     * Get access token with validation
     */
    public getAccessToken(): string | null {
        const token = this.getCookie(COOKIES.ACCESS_TOKEN);
        if (!token) {
            return null;
        }

        const validation = this.validateToken(token);
        if (!validation.isValid) {
            logger.warn('Access token is invalid', { context: 'Cookie', data: validation.error });
            // Clean up invalid token
            this.deleteCookie(COOKIES.ACCESS_TOKEN);
            return null;
        }

        return token;
    }

    /**
     * Get refresh token with validation
     */
    public getRefreshToken(): string | null {
        const token = this.getCookie(COOKIES.REFRESH_TOKEN);
        if (!token) {
            return null;
        }

        const validation = this.validateToken(token);
        if (!validation.isValid) {
            logger.warn('Refresh token is invalid', { context: 'Cookie', data: validation.error });
            // Clean up invalid token
            this.deleteCookie(COOKIES.REFRESH_TOKEN);
            return null;
        }

        return token;
    }

    /**
     * Store user data securely
     */
    public setUserData(userData: User): void {
        try {
            const serializedData = JSON.stringify(userData);
            this.setCookie(COOKIES.USER_DATA, serializedData, {
                expires: this.createExpiryDateFromDays(COOKIE_CONFIG.USER_DATA_EXPIRY_DAYS),
            });
        } catch (error) {
            logger.error('Failed to serialize user data', error, { context: 'Cookie' });
        }
    }

    /**
     * Get user data with validation
     */
    public getUserData<T = User>(): T | null {
        const data = this.getCookie(COOKIES.USER_DATA);
        if (!data) {
            return null;
        }
        
        try {
            return JSON.parse(data) as T;
        } catch (error) {
            logger.error('Failed to parse user data', error, { context: 'Cookie' });
            // Clean up corrupted data
            this.deleteCookie(COOKIES.USER_DATA);
            return null;
        }
    }

    /**
     * Get complete session information
     */
    public getSessionInfo(): SessionInfo | null {
        const accessToken = this.getAccessToken();
        const refreshToken = this.getRefreshToken();
        const user = this.getUserData<User>();
        const expiryStr = this.getCookie(COOKIES.TOKEN_EXPIRY);
        const timestampStr = this.getCookie(COOKIES.SESSION_TIMESTAMP);

        if (!accessToken || !refreshToken || !user) {
            return null;
        }

        const expiresAt = expiryStr ? parseInt(expiryStr, 10) : 0;
        const lastActivity = timestampStr ? parseInt(timestampStr, 10) : 0;

        return {
            accessToken,
            refreshToken,
            user,
            expiresAt,
            lastActivity,
        };
    }

    /**
     * Check if tokens need refresh (access token expired but refresh token valid)
     */
    public needsTokenRefresh(): boolean {
        const accessToken = this.getCookie(COOKIES.ACCESS_TOKEN);
        const refreshToken = this.getRefreshToken(); // This validates the refresh token

        if (!refreshToken) {
            return false; // No valid refresh token, can't refresh
        }

        if (!accessToken) {
            return true; // No access token but valid refresh token
        }

        const validation = this.validateToken(accessToken);
        return !validation.isValid; // Access token is invalid/expired
    }

    /**
     * Clear all authentication data
     */
    public clearAuthData(): void {
        this.deleteCookie(COOKIES.ACCESS_TOKEN);
        this.deleteCookie(COOKIES.REFRESH_TOKEN);
        this.deleteCookie(COOKIES.USER_DATA);
        this.deleteCookie(COOKIES.SESSION_TIMESTAMP);
        this.deleteCookie(COOKIES.TOKEN_EXPIRY);
    }

    /**
     * Clear expired cookies (cleanup utility)
     */
    public clearExpiredCookies(): void {
        const accessToken = this.getCookie(COOKIES.ACCESS_TOKEN);
        const refreshToken = this.getCookie(COOKIES.REFRESH_TOKEN);

        if (accessToken) {
            const validation = this.validateToken(accessToken);
            if (!validation.isValid) {
                this.deleteCookie(COOKIES.ACCESS_TOKEN);
                this.deleteCookie(COOKIES.TOKEN_EXPIRY);
            }
        }

        if (refreshToken) {
            const validation = this.validateToken(refreshToken);
            if (!validation.isValid) {
                this.deleteCookie(COOKIES.REFRESH_TOKEN);
            }
        }

        // Check session timeout
        if (!this.isSessionActive()) {
            this.clearAuthData();
        }
    }

    /**
     * Get cookie expiration info for debugging
     */
    public getExpirationInfo(): Record<string, any> {
        const info: Record<string, any> = {};
        
        Object.values(COOKIES).forEach(cookieName => {
            const value = this.getCookie(cookieName);
            if (value) {
                info[cookieName] = {
                    exists: true,
                    length: value.length,
                };

                // For tokens, add validation info
                if (cookieName === COOKIES.ACCESS_TOKEN || cookieName === COOKIES.REFRESH_TOKEN) {
                    const validation = this.validateToken(value);
                    info[cookieName].validation = validation;
                }
            } else {
                info[cookieName] = { exists: false };
            }
        });

        info.sessionActive = this.isSessionActive();
        info.needsRefresh = this.needsTokenRefresh();

        return info;
    }

    /**
     * Check if authentication data exists and is valid
     */
    public hasValidAuthData(): boolean {
        const accessToken = this.getAccessToken();
        const refreshToken = this.getRefreshToken();
        const user = this.getUserData();
        
        return !!(accessToken && refreshToken && user && this.isSessionActive());
    }

    /**
     * Get time until access token expires (in milliseconds)
     */
    public getTimeUntilExpiry(): number | null {
        const token = this.getCookie(COOKIES.ACCESS_TOKEN);
        if (!token) return null;

        const validation = this.validateToken(token);
        if (!validation.expiresAt) return null;

        return Math.max(0, validation.expiresAt - Date.now());
    }

    /**
     * Check if access token will expire within specified minutes
     */
    public willExpireSoon(minutes: number = 5): boolean {
        const timeUntilExpiry = this.getTimeUntilExpiry();
        if (timeUntilExpiry === null) return true;

        const thresholdMs = minutes * 60 * 1000;
        return timeUntilExpiry <= thresholdMs;
    }

    /**
     * Perform comprehensive security validation
     */
    public performSecurityCheck(): {
        isSecure: boolean;
        issues: string[];
        recommendations: string[];
    } {
        const issues: string[] = [];
        const recommendations: string[] = [];

        // Check secure context
        if (!this.isSecureContext()) {
            issues.push('Not running in secure context (HTTPS)');
            recommendations.push('Use HTTPS in production for secure cookies');
        }

        // Check session activity
        if (!this.isSessionActive()) {
            issues.push('Session has timed out');
            recommendations.push('User should re-authenticate');
        }

        // Check token validity
        const accessToken = this.getCookie(COOKIES.ACCESS_TOKEN);
        if (accessToken) {
            const validation = this.validateToken(accessToken);
            if (!validation.isValid) {
                issues.push('Access token is invalid or expired');
                recommendations.push('Refresh token or re-authenticate');
            }
        }

        // Check for expired cookies
        const refreshToken = this.getCookie(COOKIES.REFRESH_TOKEN);
        if (refreshToken) {
            const validation = this.validateToken(refreshToken);
            if (!validation.isValid) {
                issues.push('Refresh token is invalid or expired');
                recommendations.push('User must re-authenticate');
            }
        }

        return {
            isSecure: issues.length === 0,
            issues,
            recommendations,
        };
    }
}

// Export singleton instance and backward-compatible interface
export const secureCookieManager = SecureCookieManager.getInstance();

// Backward-compatible cookieUtils interface
export const cookieUtils = {
    /**
     * Set a cookie with secure options (legacy method)
     */
    set(name: string, value: string, days: number = 7): void {
        const expires = new Date();
        expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
        secureCookieManager['setCookie'](name, value, { expires });
    },

    /**
     * Get a cookie value (legacy method)
     */
    get(name: string): string | null {
        return secureCookieManager['getCookie'](name);
    },

    /**
     * Delete a cookie (legacy method)
     */
    delete(name: string): void {
        secureCookieManager['deleteCookie'](name);
    },

    /**
     * Clear all auth-related cookies
     */
    clearAuth(): void {
        secureCookieManager.clearAuthData();
    },

    /**
     * Store access token
     */
    setAccessToken(token: string): void {
        const refreshToken = secureCookieManager.getRefreshToken();
        if (refreshToken) {
            secureCookieManager.setAuthTokens(token, refreshToken);
        } else {
            // Fallback for cases where only access token is being set
            const expires = new Date();
            expires.setTime(expires.getTime() + COOKIE_CONFIG.ACCESS_TOKEN_EXPIRY_MINUTES * 60 * 1000);
            secureCookieManager['setCookie'](COOKIES.ACCESS_TOKEN, token, { expires });
        }
    },

    /**
     * Get access token
     */
    getAccessToken(): string | null {
        return secureCookieManager.getAccessToken();
    },

    /**
     * Store refresh token
     */
    setRefreshToken(token: string): void {
        const accessToken = secureCookieManager.getAccessToken();
        if (accessToken) {
            secureCookieManager.setAuthTokens(accessToken, token);
        } else {
            // Fallback for cases where only refresh token is being set
            const expires = new Date();
            expires.setTime(expires.getTime() + COOKIE_CONFIG.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
            secureCookieManager['setCookie'](COOKIES.REFRESH_TOKEN, token, { expires });
        }
    },

    /**
     * Get refresh token
     */
    getRefreshToken(): string | null {
        return secureCookieManager.getRefreshToken();
    },

    /**
     * Store user data
     */
    setUserData(userData: User): void {
        secureCookieManager.setUserData(userData);
    },

    /**
     * Get user data
     */
    getUserData<T = User>(): T | null {
        return secureCookieManager.getUserData<T>();
    },
};
