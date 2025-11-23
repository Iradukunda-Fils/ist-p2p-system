# Enhanced API Client

This document describes the enhanced API client implementation that provides improved token refresh logic, automatic retry mechanisms, and request queuing during token refresh.

## Overview

The enhanced API client is built on top of Axios and provides the following key improvements:

1. **Enhanced Token Refresh Logic** - Better error handling and race condition prevention
2. **Automatic Retry Mechanisms** - Exponential backoff for network and server errors
3. **Request Queuing** - Queue concurrent requests during token refresh to prevent conflicts

## Key Features

### 1. Enhanced Token Refresh Logic

#### Improvements:
- **Race Condition Prevention**: Only one token refresh occurs at a time, even with concurrent requests
- **Better Error Handling**: Comprehensive error handling with proper cleanup
- **Cross-Tab Synchronization**: Broadcasts token refresh events to all browser tabs
- **Automatic Redirect**: Redirects to login on refresh failure

#### How it works:
```typescript
// When a 401 error occurs:
1. Check if token refresh is already in progress
2. If yes, queue the request
3. If no, start token refresh process
4. On success: process all queued requests with new token
5. On failure: clear queue and redirect to login
```

### 2. Automatic Retry Mechanisms

#### Retry Conditions:
- **Network Errors**: Connection timeouts, DNS failures, etc.
- **5xx Server Errors**: Internal server errors, bad gateway, etc.
- **Not Retried**: 4xx client errors (except 401), successful responses

#### Retry Configuration:
- **Max Retries**: 3 attempts (configurable)
- **Base Delay**: 1000ms (configurable)
- **Backoff Strategy**: Exponential with jitter
- **Max Delay**: 10 seconds

#### Retry Logic:
```typescript
// Exponential backoff with jitter
const delay = baseDelay * Math.pow(2, retryCount - 1) + randomJitter;
const cappedDelay = Math.min(delay, maxDelay);
```

### 3. Request Queuing During Token Refresh

#### Queue Management:
- **Concurrent Requests**: All requests during token refresh are queued
- **Queue Processing**: After successful refresh, all queued requests are retried
- **Queue Cleanup**: On refresh failure, all queued requests are rejected
- **Queue Monitoring**: Status available for debugging

#### Queue Flow:
```typescript
1. Request fails with 401
2. If refresh in progress: add to queue
3. If refresh not in progress: start refresh
4. On refresh success: process entire queue
5. On refresh failure: reject entire queue
```

## Usage

### Basic Usage (Backward Compatible)

```typescript
import { apiClient } from '@/api/client';

// All existing code continues to work
const response = await apiClient.get('/api/data');
const result = await apiClient.post('/api/data', payload);
```

### Enhanced Features

```typescript
import { enhancedApiClient } from '@/api/client';

// Monitor queue status
const status = enhancedApiClient.getQueueStatus();
console.log('Is refreshing:', status.isRefreshing);
console.log('Queue length:', status.queueLength);

// Clear queue (for debugging/testing)
enhancedApiClient.clearQueue();

// Use enhanced methods (same as apiClient)
const response = await enhancedApiClient.get('/api/data');
```

## Configuration

### Default Configuration

```typescript
const config = {
  maxRetries: 3,           // Maximum retry attempts
  retryDelay: 1000,        // Base delay in milliseconds
  timeout: 30000,          // Request timeout
  refreshTimeout: 10000    // Token refresh timeout
};
```

### Customization

The configuration is currently hardcoded but can be made configurable:

```typescript
// Future enhancement - configurable retry settings
const client = new EnhancedAPIClient({
  maxRetries: 5,
  retryDelay: 2000,
  enableJitter: true
});
```

## Error Handling

### Token Refresh Errors

```typescript
// Automatic handling of token refresh failures
try {
  const response = await apiClient.get('/protected-endpoint');
} catch (error) {
  // If token refresh fails, user is automatically redirected to login
  // Error contains context about the failure
}
```

### Retry Exhaustion

```typescript
// When all retry attempts are exhausted
try {
  const response = await apiClient.get('/unreliable-endpoint');
} catch (error) {
  // Error contains information about retry attempts
  console.log('Request failed after', maxRetries, 'attempts');
}
```

### Network Errors

```typescript
// Automatic retry for network issues
try {
  const response = await apiClient.get('/api/data');
} catch (error) {
  // Only thrown after all retry attempts fail
  if (error.code === 'NETWORK_ERROR') {
    // Handle persistent network issues
  }
}
```

## Monitoring and Debugging

### Queue Status Monitoring

```typescript
import { enhancedApiClient } from '@/api/client';

// Check current queue status
const status = enhancedApiClient.getQueueStatus();

if (status.isRefreshing) {
  console.log(`Token refresh in progress, ${status.queueLength} requests queued`);
}
```

### Console Logging

The enhanced client provides detailed console logging:

```
[API] Refreshing access token...
[API] Token refreshed successfully
[API] Processing 3 queued requests
[API] Retrying request (attempt 2/3) after 2000ms: GET /api/data
```

### Error Context

Errors include additional context for debugging:

```typescript
catch (error) {
  console.log('Request URL:', error.config?.url);
  console.log('Retry attempts:', error.config?.metadata?.retryCount);
  console.log('Queue status:', enhancedApiClient.getQueueStatus());
}
```

## Implementation Details

### Class Structure

```typescript
class EnhancedAPIClient {
  private axiosInstance: AxiosInstance;
  private isRefreshing: boolean = false;
  private requestQueue: QueuedRequest[] = [];
  private maxRetries: number = 3;
  private retryDelay: number = 1000;
}
```

### Key Methods

- `handleRequest()`: Adds retry metadata and auth headers
- `handleResponse()`: Updates session activity
- `handleResponseError()`: Manages retries and token refresh
- `handleTokenRefresh()`: Manages token refresh and queue processing
- `queueRequest()`: Adds requests to queue during refresh
- `processRequestQueue()`: Processes queued requests after refresh
- `retryRequest()`: Implements retry logic with backoff

### Type Definitions

```typescript
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  metadata?: {
    retryCount?: number;
  };
  _retry?: boolean;
}

interface QueuedRequest {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  config: InternalAxiosRequestConfig;
}
```

## Testing

### Manual Testing

Use the verification script to test enhanced features:

```typescript
import verification from '@/api/client-verification';

// Run verification
verification.verifyEnhancedAPIClient();
verification.demonstrateEnhancedFeatures();

// Get summary of enhancements
const summary = verification.getEnhancementsSummary();
console.log(summary);
```

### Integration Testing

Test scenarios to verify:

1. **Token Refresh**: Simulate 401 errors and verify refresh
2. **Request Queuing**: Make concurrent requests during refresh
3. **Retry Logic**: Simulate network errors and verify retries
4. **Error Handling**: Test various error conditions
5. **Cross-Tab Sync**: Verify token refresh broadcasts

## Migration Guide

### From Previous Implementation

No changes required for existing code:

```typescript
// This continues to work unchanged
import { apiClient } from '@/api/client';
const response = await apiClient.get('/api/data');
```

### Leveraging New Features

To use enhanced features:

```typescript
// Import enhanced client for monitoring
import { enhancedApiClient } from '@/api/client';

// Monitor queue status in development
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const status = enhancedApiClient.getQueueStatus();
    if (status.queueLength > 0) {
      console.log('API Queue Status:', status);
    }
  }, 5000);
}
```

## Performance Considerations

### Memory Usage
- Queue is automatically cleared after processing
- No memory leaks from abandoned requests
- Minimal overhead for retry metadata

### Network Efficiency
- Prevents duplicate token refresh requests
- Reduces server load through intelligent retries
- Jitter prevents thundering herd problems

### User Experience
- Seamless token refresh without user intervention
- Automatic retry of failed requests
- Cross-tab synchronization for consistent state

## Future Enhancements

### Planned Improvements
1. **Configurable Settings**: Runtime configuration of retry parameters
2. **Metrics Collection**: Request success/failure metrics
3. **Circuit Breaker**: Temporary disable retries for failing endpoints
4. **Request Prioritization**: Priority queue for critical requests
5. **Offline Support**: Queue requests when offline

### Extension Points
The enhanced client is designed to be extensible:

```typescript
// Future: Plugin system for custom retry logic
client.addRetryPlugin(customRetryLogic);

// Future: Custom queue processors
client.setQueueProcessor(customProcessor);

// Future: Metrics collection
client.onMetrics(metricsCollector);
```