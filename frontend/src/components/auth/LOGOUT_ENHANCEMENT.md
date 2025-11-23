# Enhanced Logout System

## Overview

The enhanced logout system provides a better user experience with confirmation dialogs, loading states, success notifications, and automatic redirection to the login page.

## Features

### 1. Logout Confirmation Modal
- **User-friendly confirmation**: Shows a clear confirmation dialog before logout
- **Context information**: Displays current username and logout consequences
- **Loading state**: Shows loading indicator during logout process
- **Cancellation**: Users can cancel the logout process

### 2. Success Notification Modal
- **Success confirmation**: Shows successful logout notification
- **Auto-redirect**: Automatically redirects to login page after 3 seconds
- **Manual redirect**: Users can choose to redirect immediately
- **Stay option**: Users can choose to stay on the current page

### 3. Enhanced Auth Store
- **Loading states**: Tracks logout loading state (`isLoggingOut`)
- **Return values**: Logout function returns success status and username
- **Error handling**: Graceful error handling with fallback cleanup
- **Cross-tab sync**: Maintains logout synchronization across browser tabs

## Components

### LogoutConfirmModal

A confirmation modal that appears when the user clicks the logout button.

**Props:**
```typescript
interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
  username?: string;
}
```

**Features:**
- Clear warning about logout consequences
- Loading state during logout process
- User-friendly messaging
- Accessible design with proper ARIA labels

### LogoutSuccessModal

A success notification modal that appears after successful logout.

**Props:**
```typescript
interface LogoutSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRedirect: () => void;
  autoRedirectDelay?: number; // in seconds
  username?: string;
}
```

**Features:**
- Success confirmation with checkmarks
- Countdown timer for auto-redirect
- Manual redirect option
- Option to stay on current page

## Usage

### Basic Implementation

The enhanced logout system is automatically integrated into the Header component. No additional setup is required.

### Manual Usage

```typescript
import { useAuthStore } from '@/store/authStore';

function MyComponent() {
  const { logout, isLoggingOut } = useAuthStore();

  const handleLogout = async () => {
    try {
      const result = await logout();
      
      if (result.success) {
        console.log(`Successfully logged out user: ${result.username}`);
        // Handle success (e.g., show notification, redirect)
      } else {
        console.log('Logout completed with issues');
        // Handle partial success
      }
    } catch (error) {
      console.error('Logout failed:', error);
      // Handle error
    }
  };

  return (
    <button 
      onClick={handleLogout}
      disabled={isLoggingOut}
    >
      {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
    </button>
  );
}
```

### Custom Logout Flow

```typescript
import { LogoutConfirmModal, LogoutSuccessModal } from '@/components/auth';
import { useModal } from '@/hooks/useCommon';

function CustomLogoutFlow() {
  const { logout, isLoggingOut, user } = useAuthStore();
  const { isOpen: showConfirm, open: openConfirm, close: closeConfirm } = useModal();
  const { isOpen: showSuccess, open: openSuccess, close: closeSuccess } = useModal();
  const [logoutResult, setLogoutResult] = useState(null);

  const handleLogoutConfirm = async () => {
    const result = await logout();
    setLogoutResult(result);
    closeConfirm();
    
    if (result.success) {
      openSuccess();
    }
  };

  return (
    <>
      <button onClick={openConfirm}>
        Custom Logout
      </button>

      <LogoutConfirmModal
        isOpen={showConfirm}
        onClose={closeConfirm}
        onConfirm={handleLogoutConfirm}
        isLoading={isLoggingOut}
        username={user?.username}
      />

      <LogoutSuccessModal
        isOpen={showSuccess}
        onClose={closeSuccess}
        onRedirect={() => navigate('/login')}
        username={logoutResult?.username}
        autoRedirectDelay={5} // Custom delay
      />
    </>
  );
}
```

## Auth Store Changes

### New State Properties

```typescript
interface AuthState {
  // ... existing properties
  isLoggingOut: boolean; // NEW: Tracks logout loading state
}
```

### Updated Logout Function

```typescript
logout: () => Promise<{ success: boolean; username?: string }>
```

**Return Value:**
- `success`: Boolean indicating if logout was successful
- `username`: Username of the logged out user (if available)

### Error Handling

The logout function now handles errors gracefully:

1. **Server logout failure**: Continues with client-side cleanup
2. **Network errors**: Still clears local authentication state
3. **Partial failures**: Returns success status and error details

## User Experience Flow

### 1. User Clicks Logout
- Dropdown menu closes
- Logout confirmation modal opens
- User sees clear information about logout consequences

### 2. User Confirms Logout
- Confirmation modal shows loading state
- Logout process begins (server + client cleanup)
- Modal remains open during process

### 3. Logout Completes
- Confirmation modal closes
- Success modal opens with celebration
- Auto-redirect countdown begins
- User can choose immediate redirect or stay

### 4. Redirect to Login
- User is redirected to login page
- Success toast notification appears
- All authentication state is cleared

## Security Features

### 1. Complete Session Cleanup
- Server-side token blacklisting
- Client-side cookie clearing
- Cross-tab logout synchronization
- Session monitoring termination

### 2. Graceful Error Handling
- Continues cleanup even if server logout fails
- Prevents authentication state inconsistencies
- Maintains security even during network issues

### 3. User Feedback
- Clear indication of logout status
- Transparent error communication
- Confirmation of security actions taken

## Accessibility

### 1. Keyboard Navigation
- Full keyboard support for all modals
- Proper focus management
- Escape key support for cancellation

### 2. Screen Reader Support
- Proper ARIA labels and descriptions
- Semantic HTML structure
- Clear status announcements

### 3. Visual Indicators
- Loading states with spinners
- Color-coded status indicators
- Clear iconography for actions

## Customization

### 1. Modal Styling
Both modals use the standard Modal component and can be styled using:
- Custom CSS classes
- Tailwind utility classes
- Theme variables

### 2. Timing Configuration
```typescript
// Custom auto-redirect delay
<LogoutSuccessModal
  autoRedirectDelay={10} // 10 seconds
  // ... other props
/>
```

### 3. Content Customization
The modals can be customized by:
- Modifying the component text
- Adding custom icons or branding
- Changing the layout or styling

## Testing

### Manual Testing
1. Click logout button in header dropdown
2. Verify confirmation modal appears
3. Test cancellation functionality
4. Confirm logout process with loading state
5. Verify success modal and auto-redirect
6. Test manual redirect option

### Automated Testing
```typescript
// Example test for logout flow
describe('Logout Flow', () => {
  it('should show confirmation modal on logout click', () => {
    // Test implementation
  });

  it('should handle logout success with redirect', () => {
    // Test implementation
  });

  it('should handle logout errors gracefully', () => {
    // Test implementation
  });
});
```

## Migration Guide

### From Simple Logout
If you were using the old logout function:

```typescript
// Old way
await logout();
navigate('/login');

// New way
const result = await logout();
if (result.success) {
  // Success handling is now built into the UI
  // No need for manual navigation
}
```

### Custom Implementations
If you have custom logout implementations, you can:

1. Use the new return value for better error handling
2. Integrate the new modals for consistent UX
3. Leverage the `isLoggingOut` state for loading indicators

## Future Enhancements

### Planned Features
- Logout reason tracking (manual, timeout, security)
- Custom logout messages based on context
- Integration with audit logging
- Remember logout preferences

### Configuration Options
- Customizable auto-redirect delays
- Optional logout confirmation
- Custom success messages
- Branding customization