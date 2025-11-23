import React from 'react';
import clsx from 'clsx';
import { Button } from './Button';

interface ErrorDisplayProps {
    title?: string;
    message?: string;
    variant?: 'error' | 'warning' | 'info';
    size?: 'sm' | 'md' | 'lg';
    showIcon?: boolean;
    onRetry?: () => void;
    onDismiss?: () => void;
    retryText?: string;
    dismissText?: string;
    className?: string;
    children?: React.ReactNode;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
    title = 'Something went wrong',
    message = 'An unexpected error occurred. Please try again.',
    variant = 'error',
    size = 'md',
    showIcon = true,
    onRetry,
    onDismiss,
    retryText = 'Try Again',
    dismissText = 'Dismiss',
    className,
    children
}) => {
    const variantClasses = {
        error: 'bg-red-50 border-red-200 text-red-800',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        info: 'bg-blue-50 border-blue-200 text-blue-800',
    };

    const iconClasses = {
        error: 'text-red-400',
        warning: 'text-yellow-400',
        info: 'text-blue-400',
    };

    const sizeClasses = {
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
    };

    const getIcon = () => {
        switch (variant) {
            case 'error':
                return (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                );
            case 'warning':
                return (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                );
            case 'info':
                return (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                );
        }
    };

    return (
        <div className={clsx(
            'border rounded-lg',
            variantClasses[variant],
            sizeClasses[size],
            className
        )}>
            <div className="flex items-start">
                {showIcon && (
                    <div className={clsx('flex-shrink-0 mt-0.5 mr-3', iconClasses[variant])}>
                        {getIcon()}
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium">{title}</h3>
                    {message && (
                        <p className="mt-1 text-sm opacity-90">{message}</p>
                    )}
                    {children && (
                        <div className="mt-2">{children}</div>
                    )}
                    {(onRetry || onDismiss) && (
                        <div className="mt-3 flex space-x-3">
                            {onRetry && (
                                <Button
                                    size="sm"
                                    variant={variant === 'error' ? 'danger' : 'primary'}
                                    onClick={onRetry}
                                >
                                    {retryText}
                                </Button>
                            )}
                            {onDismiss && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={onDismiss}
                                >
                                    {dismissText}
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

interface InlineErrorProps {
    message: string;
    className?: string;
}

export const InlineError: React.FC<InlineErrorProps> = ({ message, className }) => {
    return (
        <div className={clsx('flex items-center text-red-600 text-sm', className)}>
            <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{message}</span>
        </div>
    );
};

interface EmptyStateErrorProps {
    title?: string;
    message?: string;
    onRetry?: () => void;
    retryText?: string;
    icon?: React.ReactNode;
    className?: string;
}

export const EmptyStateError: React.FC<EmptyStateErrorProps> = ({
    title = 'Unable to load data',
    message = 'Something went wrong while loading this content.',
    onRetry,
    retryText = 'Try Again',
    icon,
    className
}) => {
    const defaultIcon = (
        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
    );

    return (
        <div className={clsx('text-center py-12', className)}>
            <div className="mx-auto mb-4">
                {icon || defaultIcon}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600 mb-6 max-w-sm mx-auto">{message}</p>
            {onRetry && (
                <Button onClick={onRetry} leftIcon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                }>
                    {retryText}
                </Button>
            )}
        </div>
    );
};