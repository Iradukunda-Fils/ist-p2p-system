import React, { useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { VStack } from '@/components/common/Spacing';
import { Typography } from '@/components/common/Typography';

interface LogoutSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRedirect: () => void;
  autoRedirectDelay?: number; // in seconds
  username?: string;
}

export const LogoutSuccessModal: React.FC<LogoutSuccessModalProps> = ({
  isOpen,
  onClose,
  onRedirect,
  autoRedirectDelay = 3,
  username
}) => {
  const [countdown, setCountdown] = React.useState(autoRedirectDelay);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(autoRedirectDelay);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onRedirect();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, autoRedirectDelay, onRedirect]);

  const handleRedirectNow = () => {
    onRedirect();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Successfully Signed Out"
      size="sm"
      showCloseButton={false}
    >
      <VStack size="component">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg 
                className="w-8 h-8 text-green-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M5 13l4 4L19 7" 
                />
              </svg>
            </div>
          </div>
          <div className="flex-1">
            <Typography variant="heading-5" className="text-gray-900">
              You've been signed out successfully
            </Typography>
            {username && (
              <Typography variant="body-small" color="muted" className="mt-1">
                Thank you for using the system, <span className="font-medium">{username}</span>
              </Typography>
            )}
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <Typography variant="body-small" className="text-green-800">
              Your session has been securely terminated
            </Typography>
          </div>
          <ul className="mt-2 space-y-1 text-sm text-green-700">
            <li>✓ All authentication tokens cleared</li>
            <li>✓ Session data removed from all tabs</li>
            <li>✓ Secure logout completed</li>
          </ul>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <Typography variant="body-small" className="text-blue-800 font-medium">
                Redirecting to login page
              </Typography>
              <Typography variant="caption" className="text-blue-600">
                Automatically redirecting in {countdown} second{countdown !== 1 ? 's' : ''}
              </Typography>
            </div>
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center">
                <Typography variant="caption" className="text-blue-800 font-bold">
                  {countdown}
                </Typography>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Stay on Page
          </Button>
          <Button
            variant="primary"
            onClick={handleRedirectNow}
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" 
                />
              </svg>
            }
          >
            Go to Login Now
          </Button>
        </div>
      </VStack>
    </Modal>
  );
};