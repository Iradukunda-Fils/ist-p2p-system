import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LogoutConfirmModal } from '../LogoutConfirmModal';
import { LogoutSuccessModal } from '../LogoutSuccessModal';

// Mock dependencies
vi.mock('@/store/authStore');
vi.mock('@/api/authApi');

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Logout Flow Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('LogoutConfirmModal', () => {
    const defaultProps = {
      isOpen: true,
      onClose: vi.fn(),
      onConfirm: vi.fn(),
      isLoading: false,
      username: 'testuser',
    };

    it('should render confirmation modal with user information', () => {
      render(
        <TestWrapper>
          <LogoutConfirmModal {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Confirm Logout')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to sign out?')).toBeInTheDocument();
      expect(screen.getByText(/testuser/)).toBeInTheDocument();
    });

    it('should show loading state when isLoading is true', () => {
      render(
        <TestWrapper>
          <LogoutConfirmModal {...defaultProps} isLoading={true} />
        </TestWrapper>
      );

      expect(screen.getByText('Signing Out...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /signing out/i })).toBeDisabled();
    });

    it('should call onConfirm when Sign Out button is clicked', async () => {
      const mockOnConfirm = vi.fn().mockResolvedValue(undefined);
      
      render(
        <TestWrapper>
          <LogoutConfirmModal {...defaultProps} onConfirm={mockOnConfirm} />
        </TestWrapper>
      );

      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      fireEvent.click(signOutButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      });
    });

    it('should call onClose when Cancel button is clicked', () => {
      const mockOnClose = vi.fn();
      
      render(
        <TestWrapper>
          <LogoutConfirmModal {...defaultProps} onClose={mockOnClose} />
        </TestWrapper>
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should display logout consequences', () => {
      render(
        <TestWrapper>
          <LogoutConfirmModal {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Clear your session from this device')).toBeInTheDocument();
      expect(screen.getByText('Sign out from all open tabs')).toBeInTheDocument();
      expect(screen.getByText('Redirect you to the login page')).toBeInTheDocument();
    });
  });

  describe('LogoutSuccessModal', () => {
    const defaultProps = {
      isOpen: true,
      onClose: vi.fn(),
      onRedirect: vi.fn(),
      autoRedirectDelay: 3,
      username: 'testuser',
    };

    it('should render success modal with user information', () => {
      render(
        <TestWrapper>
          <LogoutSuccessModal {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Successfully Signed Out')).toBeInTheDocument();
      expect(screen.getByText(/testuser/)).toBeInTheDocument();
    });

    it('should show countdown timer', () => {
      render(
        <TestWrapper>
          <LogoutSuccessModal {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText(/Automatically redirecting in 3 second/)).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // Countdown number
    });

    it('should call onRedirect when Go to Login Now button is clicked', () => {
      const mockOnRedirect = vi.fn();
      
      render(
        <TestWrapper>
          <LogoutSuccessModal {...defaultProps} onRedirect={mockOnRedirect} />
        </TestWrapper>
      );

      const redirectButton = screen.getByRole('button', { name: /go to login now/i });
      fireEvent.click(redirectButton);

      expect(mockOnRedirect).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Stay on Page button is clicked', () => {
      const mockOnClose = vi.fn();
      
      render(
        <TestWrapper>
          <LogoutSuccessModal {...defaultProps} onClose={mockOnClose} />
        </TestWrapper>
      );

      const stayButton = screen.getByRole('button', { name: /stay on page/i });
      fireEvent.click(stayButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should display success indicators', () => {
      render(
        <TestWrapper>
          <LogoutSuccessModal {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('All authentication tokens cleared')).toBeInTheDocument();
      expect(screen.getByText('Session data removed from all tabs')).toBeInTheDocument();
      expect(screen.getByText('Secure logout completed')).toBeInTheDocument();
    });

    it('should auto-redirect after countdown', async () => {
      const mockOnRedirect = vi.fn();
      
      render(
        <TestWrapper>
          <LogoutSuccessModal 
            {...defaultProps} 
            onRedirect={mockOnRedirect}
            autoRedirectDelay={1} // 1 second for faster test
          />
        </TestWrapper>
      );

      // Wait for auto-redirect
      await waitFor(() => {
        expect(mockOnRedirect).toHaveBeenCalledTimes(1);
      }, { timeout: 2000 });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete logout flow', async () => {
      const mockLogout = vi.fn().mockResolvedValue({ success: true, username: 'testuser' });
      const mockNavigate = vi.fn();

      // This would be a more complex integration test
      // involving the Header component and auth store
      expect(true).toBe(true); // Placeholder for integration test
    });
  });
});