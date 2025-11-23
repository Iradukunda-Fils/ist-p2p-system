import React from 'react';
import clsx from 'clsx';

interface CardProps {
    title?: string;
    subtitle?: string;
    children: React.ReactNode;
    className?: string;
    actions?: React.ReactNode;
    variant?: 'default' | 'outlined' | 'elevated' | 'filled';
    size?: 'sm' | 'md' | 'lg';
    header?: React.ReactNode;
    footer?: React.ReactNode;
    isClickable?: boolean;
    onClick?: () => void;
    isLoading?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
    title, 
    subtitle,
    children, 
    className, 
    actions,
    variant = 'default',
    size = 'md',
    header,
    footer,
    isClickable = false,
    onClick,
    isLoading = false
}) => {
    const baseClasses = 'bg-white rounded-lg transition-all duration-200';
    
    const variantClasses = {
        default: 'shadow-soft border border-secondary-200',
        outlined: 'border-2 border-secondary-300',
        elevated: 'shadow-medium border border-secondary-100',
        filled: 'bg-secondary-50 border border-secondary-200',
    };

    const sizeClasses = {
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
    };

    const clickableClasses = isClickable 
        ? 'cursor-pointer hover:shadow-md hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2' 
        : '';

    const loadingOverlay = isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
            <div className="flex items-center space-x-2">
                <svg className="animate-spin h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-sm text-gray-600">Loading...</span>
            </div>
        </div>
    );

    const cardContent = (
        <>
            {/* Custom Header */}
            {header && (
                <div className="mb-4">
                    {header}
                </div>
            )}

            {/* Title and Actions Header */}
            {(title || subtitle || actions) && (
                <div className="mb-4">
                    <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                            {title && (
                                <h3 className="text-heading-3 truncate">
                                    {title}
                                </h3>
                            )}
                            {subtitle && (
                                <p className="mt-1 text-body-small text-muted">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                        {actions && (
                            <div className="ml-4 flex-shrink-0">
                                {actions}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="flex-1">
                {children}
            </div>

            {/* Footer */}
            {footer && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    {footer}
                </div>
            )}

            {loadingOverlay}
        </>
    );

    if (isClickable && onClick) {
        return (
            <button
                className={clsx(
                    baseClasses,
                    variantClasses[variant],
                    sizeClasses[size],
                    clickableClasses,
                    'relative text-left w-full',
                    className
                )}
                onClick={onClick}
                disabled={isLoading}
            >
                {cardContent}
            </button>
        );
    }

    return (
        <div
            className={clsx(
                baseClasses,
                variantClasses[variant],
                sizeClasses[size],
                clickableClasses,
                'relative',
                className
            )}
            onClick={isClickable ? onClick : undefined}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
        >
            {cardContent}
        </div>
    );
};
