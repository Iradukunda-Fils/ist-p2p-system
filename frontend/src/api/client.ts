import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { env } from "@/config/env";
import { cookieUtils, secureCookieManager } from "@/utils/cookies";
import { broadcastAuthEvent } from "@/utils/authSync";

const API_BASE_URL = env.apiBaseUrl;

// Extend Axios config to include retry metadata
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  metadata?: {
    retryCount?: number;
  };
  _retry?: boolean;
}

// Enhanced request queue for handling concurrent requests during token refresh
interface QueuedRequest {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  config: InternalAxiosRequestConfig;
}

class EnhancedAPIClient {
  private axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: { "Content-Type": "application/json" },
    timeout: 30000, // 30 seconds timeout
  });

  private isRefreshing = false;
  private requestQueue: QueuedRequest[] = [];
  private maxRetries = 3;
  private retryDelay = 1000; // Base delay in milliseconds
  
  // Enhanced token management
  private proactiveRefreshTimer: NodeJS.Timeout | null = null;
  private proactiveRefreshBuffer = 2 * 60 * 1000; // 2 minutes before expiry
  private lastTokenRefresh = 0;
  private minRefreshInterval = 30 * 1000; // Minimum 30 seconds between refreshes
  private refreshAttempts = 0;
  private maxRefreshAttempts = 3;

  constructor() {
    this.setupInterceptors();
    this.startProactiveTokenRefresh();
  }

  private setupInterceptors() {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      this.handleRequest.bind(this),
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      this.handleResponse.bind(this),
      this.handleResponseError.bind(this)
    );
  }

  private handleRequest(config: ExtendedAxiosRequestConfig): ExtendedAxiosRequestConfig {
    const access = cookieUtils.getAccessToken();
    if (access && config.headers) {
      config.headers.Authorization = `Bearer ${access}`;
    }

    // CRITICAL: Remove Content-Type for FormData to let browser set multipart/form-data boundary
    if (config.data instanceof FormData && config.headers) {
      delete config.headers['Content-Type'];
    }

    // Add retry metadata
    if (!config.metadata) {
      config.metadata = {};
    }
    if (!config.metadata.retryCount) {
      config.metadata.retryCount = 0;
    }

    return config;
  }

  private handleResponse(response: AxiosResponse): AxiosResponse {
    // Update activity on successful API calls
    secureCookieManager.updateSessionActivity();
    return response;
  }

  private async handleResponseError(error: AxiosError): Promise<any> {
    const originalRequest: any = error.config;

    // Handle network errors with retry logic
    if (!error.response && this.shouldRetryRequest(originalRequest)) {
      return this.retryRequest(originalRequest, error);
    }

    // Handle 401 errors (token expired)
    if (error.response?.status === 401 && this.shouldRefreshToken(originalRequest)) {
      return this.handleTokenRefresh(originalRequest);
    }

    // Handle other 5xx errors with retry logic
    if (
      error.response?.status &&
      error.response.status >= 500 &&
      this.shouldRetryRequest(originalRequest)
    ) {
      return this.retryRequest(originalRequest, error);
    }

    return Promise.reject(error);
  }

  private shouldRefreshToken(config: any): boolean {
    return (
      !config._retry &&
      !config.url?.includes("/token/refresh/") &&
      !config.url?.includes("/auth/token/") // Don't refresh on login endpoint
    );
  }

  private shouldRetryRequest(config: any): boolean {
    const retryCount = config.metadata?.retryCount || 0;
    return (
      retryCount < this.maxRetries &&
      !config._retry &&
      !config.url?.includes("/token/refresh/")
    );
  }

  private async retryRequest(config: any, originalError: AxiosError): Promise<any> {
    const retryCount = (config.metadata?.retryCount || 0) + 1;
    const delay = this.calculateRetryDelay(retryCount);

    console.warn(`[API] Retrying request (attempt ${retryCount}/${this.maxRetries}) after ${delay}ms:`, {
      url: config.url,
      method: config.method,
      error: originalError.message,
    });

    // Wait before retrying
    await this.sleep(delay);

    // Update retry count
    config.metadata.retryCount = retryCount;

    try {
      return await this.axiosInstance(config);
    } catch (retryError) {
      // If this was the last retry, reject with the original error context
      if (retryCount >= this.maxRetries) {
        console.error(`[API] All retry attempts failed for request:`, {
          url: config.url,
          method: config.method,
          attempts: retryCount,
          finalError: retryError,
        });
      }
      throw retryError;
    }
  }

  private calculateRetryDelay(retryCount: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = this.retryDelay * Math.pow(2, retryCount - 1);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    return Math.min(exponentialDelay + jitter, 10000); // Cap at 10 seconds
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async handleTokenRefresh(originalRequest: any): Promise<any> {
    // If we're already refreshing, queue this request
    if (this.isRefreshing) {
      return this.queueRequest(originalRequest);
    }

    originalRequest._retry = true;
    this.isRefreshing = true;

    try {
      const newTokens = await this.refreshTokens();
      
      // Process queued requests with new token
      this.processRequestQueue(newTokens.access);
      
      // Retry original request with new token
      if (originalRequest.headers) {
        originalRequest.headers["Authorization"] = `Bearer ${newTokens.access}`;
      }
      
      return this.axiosInstance(originalRequest);
    } catch (refreshError) {
      // Clear queue and reject all pending requests
      this.rejectRequestQueue(refreshError);
      throw refreshError;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Start proactive token refresh timer
   * Refreshes tokens before they expire to improve user experience
   */
  private startProactiveTokenRefresh(): void {
    this.scheduleNextRefresh();
  }

  /**
   * Schedule the next proactive token refresh
   */
  private scheduleNextRefresh(): void {
    // Clear existing timer
    if (this.proactiveRefreshTimer) {
      clearTimeout(this.proactiveRefreshTimer);
      this.proactiveRefreshTimer = null;
    }

    // Check if we have valid tokens
    if (!secureCookieManager.hasValidAuthData()) {
      return;
    }

    const timeUntilExpiry = secureCookieManager.getTimeUntilExpiry();
    if (!timeUntilExpiry) {
      return;
    }

    // Calculate when to refresh (buffer time before expiry)
    const refreshTime = Math.max(
      timeUntilExpiry - this.proactiveRefreshBuffer,
      30 * 1000 // Minimum 30 seconds from now
    );

    // Don't schedule if token expires too soon
    if (refreshTime <= 0) {
      console.log('[API] Token expires too soon, triggering immediate refresh');
      this.performProactiveRefresh();
      return;
    }

    console.log(`[API] Scheduling proactive token refresh in ${Math.round(refreshTime / 1000)}s`);

    this.proactiveRefreshTimer = setTimeout(() => {
      this.performProactiveRefresh();
    }, refreshTime);
  }

  /**
   * Perform proactive token refresh
   */
  private async performProactiveRefresh(): Promise<void> {
    const now = Date.now();

    // Prevent too frequent refresh attempts
    if (now - this.lastTokenRefresh < this.minRefreshInterval) {
      console.log('[API] Skipping proactive refresh - too soon since last refresh');
      this.scheduleNextRefresh();
      return;
    }

    // Check if we're already refreshing
    if (this.isRefreshing) {
      console.log('[API] Skipping proactive refresh - already refreshing');
      this.scheduleNextRefresh();
      return;
    }

    try {
      console.log('[API] Performing proactive token refresh...');
      await this.refreshTokens();
      this.refreshAttempts = 0; // Reset attempts on success
      this.scheduleNextRefresh(); // Schedule next refresh
    } catch (error) {
      this.refreshAttempts++;
      console.error(`[API] Proactive refresh failed (attempt ${this.refreshAttempts}/${this.maxRefreshAttempts}):`, error);

      if (this.refreshAttempts < this.maxRefreshAttempts) {
        // Retry with exponential backoff
        const retryDelay = Math.min(30000 * Math.pow(2, this.refreshAttempts - 1), 300000); // Max 5 minutes
        console.log(`[API] Retrying proactive refresh in ${retryDelay / 1000}s`);
        
        this.proactiveRefreshTimer = setTimeout(() => {
          this.performProactiveRefresh();
        }, retryDelay);
      } else {
        console.error('[API] Max proactive refresh attempts reached, stopping automatic refresh');
        this.refreshAttempts = 0;
      }
    }
  }

  /**
   * Stop proactive token refresh
   */
  private stopProactiveTokenRefresh(): void {
    if (this.proactiveRefreshTimer) {
      clearTimeout(this.proactiveRefreshTimer);
      this.proactiveRefreshTimer = null;
    }
  }

  private async refreshTokens(): Promise<{ access: string; refresh: string }> {
    const now = Date.now();
    this.lastTokenRefresh = now;

    try {
      const refresh = secureCookieManager.getRefreshToken();
      if (!refresh) {
        throw new Error("No refresh token available");
      }

      console.log('[API] Refreshing access token...');

      // Use a separate axios instance to avoid interceptor loops
      const refreshResponse = await axios.post(
        `${API_BASE_URL}/auth/token/refresh/`,
        { refresh },
        { 
          timeout: 10000, // Shorter timeout for refresh requests
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      const newAccess = refreshResponse.data.access;
      const newRefresh = refreshResponse.data.refresh || refresh;

      // Store new tokens
      secureCookieManager.setAuthTokens(newAccess, newRefresh);

      // Broadcast token refresh event to all tabs
      broadcastAuthEvent({
        type: 'TOKEN_REFRESH',
        timestamp: now,
      });

      console.log('[API] Token refreshed successfully');
      return { access: newAccess, refresh: newRefresh };
    } catch (error: any) {
      console.error('[API] Token refresh failed:', error);
      
      // Handle specific error cases
      if (error.response?.status === 401) {
        console.log('[API] Refresh token is invalid or expired');
      } else if (error.code === 'ECONNABORTED') {
        console.log('[API] Token refresh timed out');
      } else if (!error.response) {
        console.log('[API] Network error during token refresh');
      }
      
      // Clear authentication data only on certain errors
      if (error.response?.status === 401 || error.response?.status === 403) {
        secureCookieManager.clearAuthData();
        
        // Broadcast logout to all tabs
        broadcastAuthEvent({
          type: 'LOGOUT',
          timestamp: now,
        });
        
        // Redirect to login
        if (window.location.pathname !== '/login') {
          window.location.href = "/login";
        }
      }
      
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  private queueRequest(config: InternalAxiosRequestConfig): Promise<any> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        resolve,
        reject,
        config,
      });
    });
  }

  private processRequestQueue(newAccessToken: string): void {
    console.log(`[API] Processing ${this.requestQueue.length} queued requests`);
    
    this.requestQueue.forEach(({ resolve, config }) => {
      if (config.headers) {
        config.headers["Authorization"] = `Bearer ${newAccessToken}`;
      }
      resolve(this.axiosInstance(config));
    });
    
    this.requestQueue = [];
  }

  private rejectRequestQueue(error: any): void {
    console.log(`[API] Rejecting ${this.requestQueue.length} queued requests due to refresh failure`);
    
    this.requestQueue.forEach(({ reject }) => {
      reject(error);
    });
    
    this.requestQueue = [];
  }

  // Public methods to match axios interface
  public get instance() {
    return this.axiosInstance;
  }

  public get<T = any>(url: string, config?: any): Promise<AxiosResponse<T>> {
    return this.axiosInstance.get<T>(url, config);
  }

  public post<T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<T>> {
    return this.axiosInstance.post<T>(url, data, config);
  }

  public put<T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<T>> {
    return this.axiosInstance.put<T>(url, data, config);
  }

  public patch<T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<T>> {
    return this.axiosInstance.patch<T>(url, data, config);
  }

  public delete<T = any>(url: string, config?: any): Promise<AxiosResponse<T>> {
    return this.axiosInstance.delete<T>(url, config);
  }

  // Enhanced utility methods for monitoring and debugging
  public getQueueStatus(): { isRefreshing: boolean; queueLength: number } {
    return {
      isRefreshing: this.isRefreshing,
      queueLength: this.requestQueue.length,
    };
  }

  public clearQueue(): void {
    this.requestQueue = [];
    this.isRefreshing = false;
  }

  /**
   * Get comprehensive token refresh status
   */
  public getTokenRefreshStatus(): {
    isProactiveRefreshActive: boolean;
    timeUntilNextRefresh: number | null;
    lastRefreshTime: number;
    refreshAttempts: number;
    timeUntilTokenExpiry: number | null;
  } {
    const timeUntilExpiry = secureCookieManager.getTimeUntilExpiry();
    let timeUntilNextRefresh: number | null = null;

    if (this.proactiveRefreshTimer && timeUntilExpiry) {
      timeUntilNextRefresh = Math.max(
        timeUntilExpiry - this.proactiveRefreshBuffer,
        0
      );
    }

    return {
      isProactiveRefreshActive: this.proactiveRefreshTimer !== null,
      timeUntilNextRefresh,
      lastRefreshTime: this.lastTokenRefresh,
      refreshAttempts: this.refreshAttempts,
      timeUntilTokenExpiry: timeUntilExpiry,
    };
  }

  /**
   * Manually trigger token refresh (for testing or emergency use)
   */
  public async manualTokenRefresh(): Promise<boolean> {
    try {
      await this.refreshTokens();
      this.scheduleNextRefresh(); // Reschedule after manual refresh
      return true;
    } catch (error) {
      console.error('[API] Manual token refresh failed:', error);
      return false;
    }
  }

  /**
   * Reset proactive refresh mechanism
   */
  public resetProactiveRefresh(): void {
    this.stopProactiveTokenRefresh();
    this.refreshAttempts = 0;
    this.startProactiveTokenRefresh();
  }

  /**
   * Configure proactive refresh settings
   */
  public configureProactiveRefresh(options: {
    bufferTime?: number; // milliseconds before expiry
    minInterval?: number; // minimum milliseconds between refreshes
    maxAttempts?: number; // maximum retry attempts
  }): void {
    if (options.bufferTime !== undefined) {
      this.proactiveRefreshBuffer = options.bufferTime;
    }
    if (options.minInterval !== undefined) {
      this.minRefreshInterval = options.minInterval;
    }
    if (options.maxAttempts !== undefined) {
      this.maxRefreshAttempts = options.maxAttempts;
    }

    // Restart with new settings
    this.resetProactiveRefresh();
  }

  /**
   * Cleanup method for when the client is no longer needed
   */
  public cleanup(): void {
    this.stopProactiveTokenRefresh();
    this.clearQueue();
  }
}

// Create and export enhanced API client instance
const enhancedClient = new EnhancedAPIClient();

// Export both the enhanced client and the axios instance for backward compatibility
export const apiClient = enhancedClient.instance;
export const enhancedApiClient = enhancedClient;
export default apiClient;
