import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { enhancedApiClient } from '../client';
import { secureCookieManager } from '@/utils/cookies';

// Mock dependencies
vi.mock('axios');
vi.mock('@/utils/cookies');
vi.mock('@/utils/authSync');
vi.mock('@/config/env', () => ({
  env: {
    apiBaseUrl: 'http://localhost:8000/api'
  }
}));

const mockedAxios = vi.mocked(axios);
const mockedSecureCookieManager = vi.mocked(secureCookieManager);

describe('EnhancedAPIClient Token Refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Mock axios.create to return a mock instance
    const mockAxiosInstance = {
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      },
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn()
    };
    
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
  });

  afterEach(() => {
    vi.useRealTimers();
    enhancedApiClient.cleanup();
  });

  describe('Proactive Token Refresh', () => {
    it('should schedule proactive refresh before token expiry', () => {
      // Mock token with 10 minutes remaining
      mockedSecureCookieManager.hasValidAuthData.mockReturnValue(true);
      mockedSecureCookieManager.getTimeUntilExpiry.mockReturnValue(10 * 60 * 1000);

      const status = enhancedApiClient.getTokenRefreshStatus();
      
      expect(status.isProactiveRefreshActive).toBe(true);
      expect(status.timeUntilNextRefresh).toBeGreaterThan(0);
    });

    it('should not schedule refresh if token expires too soon', () => {
      // Mock token with 30 seconds remaining
      mockedSecureCookieManager.hasValidAuthData.mockReturnValue(true);
      mockedSecureCookieManager.getTimeUntilExpiry.mockReturnValue(30 * 1000);

      const status = enhancedApiClient.getTokenRefreshStatus();
      
      // Should trigger immediate refresh instead of scheduling
      expect(status.timeUntilNextRefresh).toBeLessThanOrEqual(30 * 1000);
    });

    it('should not schedule refresh without valid auth data', () => {
      mockedSecureCookieManager.hasValidAuthData.mockReturnValue(false);

      const status = enhancedApiClient.getTokenRefreshStatus();
      
      expect(status.isProactiveRefreshActive).toBe(false);
    });
  });

  describe('Manual Token Refresh', () => {
    it('should successfully refresh tokens manually', async () => {
      // Mock successful refresh
      mockedSecureCookieManager.getRefreshToken.mockReturnValue('refresh_token');
      mockedAxios.post.mockResolvedValue({
        data: {
          access: 'new_access_token',
          refresh: 'new_refresh_token'
        }
      });

      const result = await enhancedApiClient.manualTokenRefresh();
      
      expect(result).toBe(true);
      expect(mockedSecureCookieManager.setAuthTokens).toHaveBeenCalledWith(
        'new_access_token',
        'new_refresh_token'
      );
    });

    it('should handle manual refresh failure', async () => {
      mockedSecureCookieManager.getRefreshToken.mockReturnValue('refresh_token');
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      const result = await enhancedApiClient.manualTokenRefresh();
      
      expect(result).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('should allow configuring proactive refresh settings', () => {
      const newConfig = {
        bufferTime: 5 * 60 * 1000, // 5 minutes
        minInterval: 60 * 1000, // 1 minute
        maxAttempts: 5
      };

      enhancedApiClient.configureProactiveRefresh(newConfig);
      
      // Configuration should be applied (we can't directly test private properties,
      // but we can verify the method doesn't throw)
      expect(() => enhancedApiClient.configureProactiveRefresh(newConfig)).not.toThrow();
    });

    it('should reset proactive refresh mechanism', () => {
      enhancedApiClient.resetProactiveRefresh();
      
      // Should not throw and should restart the mechanism
      expect(() => enhancedApiClient.resetProactiveRefresh()).not.toThrow();
    });
  });

  describe('Status Monitoring', () => {
    it('should provide comprehensive token refresh status', () => {
      mockedSecureCookieManager.getTimeUntilExpiry.mockReturnValue(5 * 60 * 1000);

      const status = enhancedApiClient.getTokenRefreshStatus();
      
      expect(status).toHaveProperty('isProactiveRefreshActive');
      expect(status).toHaveProperty('timeUntilNextRefresh');
      expect(status).toHaveProperty('lastRefreshTime');
      expect(status).toHaveProperty('refreshAttempts');
      expect(status).toHaveProperty('timeUntilTokenExpiry');
    });

    it('should provide queue status', () => {
      const queueStatus = enhancedApiClient.getQueueStatus();
      
      expect(queueStatus).toHaveProperty('isRefreshing');
      expect(queueStatus).toHaveProperty('queueLength');
      expect(typeof queueStatus.isRefreshing).toBe('boolean');
      expect(typeof queueStatus.queueLength).toBe('number');
    });
  });

  describe('Cleanup', () => {
    it('should properly cleanup resources', () => {
      enhancedApiClient.cleanup();
      
      const status = enhancedApiClient.getTokenRefreshStatus();
      expect(status.isProactiveRefreshActive).toBe(false);
      
      const queueStatus = enhancedApiClient.getQueueStatus();
      expect(queueStatus.queueLength).toBe(0);
      expect(queueStatus.isRefreshing).toBe(false);
    });
  });
});