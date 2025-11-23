import React from 'react';
import clsx from 'clsx';

interface SpinnerProps {
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    variant?: 'default' | 'dots' | 'pulse' | 'bars';
    color?: 'primary' | 'secondary' | 'white' | 'gray';
    className?: string;
    label?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ 
    size = 'md', 
    variant = 'default',
    color = 'primary',
    className = '',
    label = 'Loading...'
}) => {
    const sizeClasses = {
        xs: 'h-3 w-3',
        sm: 'h-4 w-4',
        md: 'h-6 w-6',
        lg: 'h-8 w-8',
        xl: 'h-12 w-12',
    };

    const colorClasses = {
        primary: 'text-primary-600',
        secondary: 'text-gray-600',
        white: 'text-white',
        gray: 'text-gray-400',
    };

    if (variant === 'dots') {
        return (
            <div className={clsx('flex space-x-1', className)} role="status" aria-label={label}>
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        className={clsx(
                            'rounded-full animate-pulse',
                            sizeClasses[size],
                            colorClasses[color].replace('text-', 'bg-')
                        )}
                        style={{
                            animationDelay: `${i * 0.15}s`,
                            animationDuration: '0.6s'
                        }}
                    />
                ))}
                <span className="sr-only">{label}</span>
            </div>
        );
    }

    if (variant === 'pulse') {
        return (
            <div 
                className={clsx(
                    'rounded-full animate-pulse',
                    sizeClasses[size],
                    colorClasses[color].replace('text-', 'bg-'),
                    className
                )}
                role="status"
                aria-label={label}
            >
                <span className="sr-only">{label}</span>
            </div>
        );
    }

    if (variant === 'bars') {
        return (
            <div className={clsx('flex space-x-1', className)} role="status" aria-label={label}>
                {[0, 1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className={clsx(
                            'animate-pulse',
                            sizeClasses[size].replace('h-', 'h-').replace('w-', 'w-1'),
                            colorClasses[color].replace('text-', 'bg-')
                        )}
                        style={{
                            animationDelay: `${i * 0.1}s`,
                            animationDuration: '0.8s'
                        }}
                    />
                ))}
                <span className="sr-only">{label}</span>
            </div>
        );
    }

    // Default spinner variant
    return (
        <svg
            className={clsx(
                'animate-spin',
                sizeClasses[size],
                colorClasses[color],
                className
            )}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            role="status"
            aria-label={label}
        >
            <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
            />
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
            <span className="sr-only">{label}</span>
        </svg>
    );
};

interface LoadingPageProps {
    message?: string;
    size?: SpinnerProps['size'];
}

export const LoadingPage: React.FC<LoadingPageProps> = ({ 
    message = 'Loading...', 
    size = 'lg' 
}) => {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="text-center">
                <Spinner size={size} className="mx-auto" />
                <p className="mt-4 text-gray-600 text-sm">{message}</p>
            </div>
        </div>
    );
};

interface LoadingOverlayProps {
    isVisible: boolean;
    message?: string;
    className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
    isVisible,
    message = 'Loading...',
    className
}) => {
    if (!isVisible) return null;

    return (
        <div className={clsx(
            'absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10',
            className
        )}>
            <div className="text-center">
                <Spinner size="md" />
                <p className="mt-2 text-sm text-gray-600">{message}</p>
            </div>
        </div>
    );
};
