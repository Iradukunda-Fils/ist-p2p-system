# Enhanced Token Refresh System

## Overview

The enhanced token refresh system provides proactive token management to improve user experience by automatically refreshing access tokens before they expire, eliminating authentication interruptions during active sessions.

## Key Features

### 1. Proactive Token Refresh
- **Automatic Scheduling**: Tokens are refreshed automatically before expiration
- **Configurable Buffer**: Default 2-minute buffer before token expiry
- **Smart Timing**: Calculates optimal refresh timing based on token lifetime
- **Retry Logic**: Exponential backoff for failed refresh attempts

### 2. Enhanced Error Handling
- **Network Resilience**: Handles network errors with automatic retries
- **Queue Management**: Queues requests during token refresh to prevent failures
- **Graceful Degradation**: Maintains functionality during temporary issues
- **Comprehensive Logging**: Detailed logging for debugging and monitoring

### 3. Cross-Tab Synchronization
- **Broadcast Events**: Synchronizes token refresh across browser tabs
- **Consistent State**: Ensures all tabs have the same authentication state
- **Efficient Updates**: Minimizes redundant refresh requests

### 4. Monitoring and Debugging
- **Status API**: Real-time status of token refresh mechanism
- **Debug Components**: Visual components for monitoring token status
- **Configuration API**: Runtime configuration of refresh behavior

## Architecture

```typescript
// Enhanced API Client Structure
class EnhancedAPIClient {
  // Proactive refresh management
  private proactiveRefreshTimer: NodeJS.Timeout | null;
  private proactiveRefreshBuffer: number; // 2 minutes default
  private minRefreshInterval: number; // 30 seconds default
  
  // Retry and error handling
  private refreshAttempts: number;
  private maxRefreshAttempts: number; // 3 default
  private lastTokenRefresh: number;
  
  // Request queue management
  private isRefreshing: boolean;
  private requestQueue: QueuedRequest[];
}
```

## Configuration Options

### Default Configuration
```typescript
{
  bufferTime: 2 * 60 * 1000,     // 2 minutes before expiry
  minInterval: 30 * 1000,        // 30 seconds minimum between refreshes
  maxAttempts: 3                 // Maximum retry attempts
}
```

### Configuration Presets

#### Aggressive
- **Buffer Time**: 5 minutes
- **Min Interval**: 30 seconds
- **Max Attempts**: 5
- **Use Case**: High-security environments, frequent API usage

#### Conservative
- **Buffer Time**: 1 minute
- **Min Interval**: 2 minutes
- **Max Attempts**: 2
- **Use Case**: Low-bandwidth environments, infrequent API usage

#### Default
- **Buffer Time**: 2 minutes
- **Min Interval**: 30 seconds
- **Max Attempts**: 3
- **Use Case**: Standard production environments

## Usage Examples

### Basic Usage
The enhanced token refresh works automatically once the user is authenticated. No additional setup is required.

### Manual Token Refresh
```typescript
import { enhancedApiClient } from '@/api/client';

// Manually trigger token refresh
const success = await enhancedApiClient.manualTokenRefresh();
console.log('Refresh successful:', success);
```

### Configuration
```typescript
import { enhancedApiClient } from '@/api/client';

// Configure refresh behavior
enhancedApiClient.configureProactiveRefresh({
  bufferTime: 5 * 60 * 1000,  // 5 minutes
  minInterval: 60 * 1000,     // 1 minute
  maxAttempts: 5              // 5 attempts
});
```

### Monitoring
```typescript
import { enhancedApiClient } from '@/api/client';

// Get current status
const status = enhancedApiClient.getTokenRefreshStatus();
console.log('Token refresh status:', status);

// Monitor queue status
const queueStatus = enhancedApiClient.getQueueStatus();
console.log('Request queue:', queueStatus);
```

### Using the Hook
```typescript
import { useTokenRefresh } from '@/hooks/useTokenRefresh';

function MyComponent() {
  const {
    isRefreshing,
    timeUntilExpiry,
    isExpiringSoon,
    manualRefresh,
    refreshHealthy
  } = useTokenRefresh();

  return (
    <div>
      <p>Token expires in: {timeUntilExpiry}ms</p>
      <p>Status: {isRefreshing ? 'Refreshing' : 'Active'}</p>
      <button onClick={manualRefresh}>Manual Refresh</button>
    </div>
  );
}
```

## Components

### TokenExpiryIndicator
Visual indicator showing token status and refresh activity.

```typescript
<TokenExpiryIndicator 
  showDetails={true}
  showRefreshStatus={true}
/>
```

### TokenRefreshDebug
Comprehensive debug panel for monitoring and testing token refresh functionality.

```typescript
<TokenRefreshDebug />
```

## API Reference

### EnhancedAPIClient Methods

#### `getTokenRefreshStatus()`
Returns comprehensive status information about the token refresh mechanism.

**Returns:**
```typescript
{
  isProactiveRefreshActive: boolean;
  timeUntilNextRefresh: number | null;
  lastRefreshTime: number;
  refreshAttempts: number;
  timeUntilTokenExpiry: number | null;
}
```

#### `manualTokenRefresh()`
Manually triggers a token refresh operation.

**Returns:** `Promise<boolean>` - Success status

#### `configureProactiveRefresh(options)`
Configures the proactive refresh behavior.

**Parameters:**
```typescript
{
  bufferTime?: number;     // milliseconds before expiry
  minInterval?: number;    // minimum milliseconds between refreshes
  maxAttempts?: number;    // maximum retry attempts
}
```

#### `resetProactiveRefresh()`
Resets the proactive refresh mechanism with current configuration.

#### `cleanup()`
Cleans up timers and resources when the client is no longer needed.

### useTokenRefresh Hook

#### Parameters
```typescript
{
  updateInterval?: number;        // Status update interval (default: 10s)
  expiringSoonThreshold?: number; // Threshold for "expiring soon" (default: 3min)
}
```

#### Returns
```typescript
{
  // Status information
  isRefreshing: boolean;
  timeUntilExpiry: number | null;
  timeUntilNextRefresh: number | null;
  refreshAttempts: number;
  isProactiveRefreshActive: boolean;
  
  // Actions
  manualRefresh: () => Promise<boolean>;
  resetRefresh: () => void;
  configureRefresh: (options) => void;
  
  // Computed states
  isExpiringSoon: boolean;
  refreshHealthy: boolean;
}
```

## Error Handling

### Network Errors
- Automatic retry with exponential backoff
- Maximum retry attempts configurable
- Graceful degradation on persistent failures

### Token Errors
- 401 responses trigger automatic token refresh
- Invalid refresh tokens result in logout and redirect
- Expired tokens are handled transparently

### Queue Management
- Requests are queued during token refresh
- Failed refreshes reject all queued requests
- Successful refreshes replay all queued requests

## Security Considerations

### Token Storage
- Tokens stored in secure HTTP-only cookies
- Automatic cleanup of expired tokens
- Session activity tracking

### Refresh Timing
- Configurable buffer time prevents last-minute failures
- Minimum interval prevents excessive refresh requests
- Smart scheduling based on actual token expiry

### Cross-Tab Security
- Broadcast events use secure channels
- State synchronization prevents token conflicts
- Consistent logout across all tabs

## Performance Impact

### Minimal Overhead
- Lightweight timer-based scheduling
- Efficient queue management
- Optimized for minimal memory usage

### Network Efficiency
- Proactive refresh reduces 401 errors
- Request queuing prevents duplicate API calls
- Smart retry logic minimizes unnecessary requests

## Debugging and Monitoring

### Development Tools
- TokenRefreshDebug component for visual monitoring
- Comprehensive logging with configurable levels
- Status APIs for programmatic monitoring

### Production Monitoring
- Error tracking and reporting
- Performance metrics collection
- Health status indicators

## Migration Guide

### From Basic Token Refresh
The enhanced system is backward compatible. Existing code will continue to work without changes.

### Configuration Migration
```typescript
// Old approach (still works)
// Manual token refresh only

// New approach (recommended)
enhancedApiClient.configureProactiveRefresh({
  bufferTime: 2 * 60 * 1000,
  minInterval: 30 * 1000,
  maxAttempts: 3
});
```

## Testing

### Unit Tests
Comprehensive test suite covering:
- Proactive refresh scheduling
- Error handling scenarios
- Configuration changes
- Status monitoring

### Integration Tests
- Cross-tab synchronization
- Network failure scenarios
- Token expiry edge cases

### Manual Testing
Use the TokenRefreshDebug component and AuthDiagnostic page for manual testing and verification.

## Troubleshooting

### Common Issues

#### Tokens Not Refreshing
1. Check if proactive refresh is active: `getTokenRefreshStatus().isProactiveRefreshActive`
2. Verify token expiry time: `getTokenRefreshStatus().timeUntilTokenExpiry`
3. Check for errors in browser console

#### Excessive Refresh Attempts
1. Verify network connectivity
2. Check server-side token validation
3. Review refresh configuration settings

#### Cross-Tab Issues
1. Ensure BroadcastChannel support in browser
2. Check for conflicting authentication state
3. Verify cookie settings and domain configuration

### Debug Steps
1. Enable TokenRefreshDebug component
2. Monitor browser console for detailed logs
3. Check network tab for refresh requests
4. Verify cookie storage and expiry times

## Future Enhancements

### Planned Features
- Adaptive refresh timing based on usage patterns
- Background refresh using Web Workers
- Enhanced metrics and analytics
- Integration with service workers for offline support

### Configuration Improvements
- Dynamic configuration based on network conditions
- User-specific refresh preferences
- Integration with backend token policies