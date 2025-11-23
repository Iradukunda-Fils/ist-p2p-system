import React from 'react';
import clsx from 'clsx';
import { Spinner } from './Spinner';
import { Skeleton } from './Skeletons';

interface LoadingStateProps {
    isLoading: boolean;
    children: React.ReactNode;
    fallback?: React.ReactNode;
    skeleton?: React.ReactNode;
    delay?: number;
    className?: string;
}

/**
 * Wrapper component that shows loading state while content is loading
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
    isLoading,
    children,
    fallback,
    skeleton,
    delay = 0,
    className
}) => {
    const [showLoading, setShowLoading] = React.useState(delay === 0);

    React.useEffect(() => {
        if (isLoading && delay > 0) {
            const timer = setTimeout(() => setShowLoading(true), delay);
            return () => clearTimeout(timer);
        } else {
            setShowLoading(isLoading);
        }
    }, [isLoading, delay]);

    if (showLoading) {
        if (fallback) return <>{fallback}</>;
        if (skeleton) return <>{skeleton}</>;
        
        return (
            <div className={clsx('flex items-center justify-center p-8', className)}>
                <Spinner size="md" />
            </div>
        );
    }

    return <>{children}</>;
};

interface InlineLoadingProps {
    isLoading: boolean;
    text?: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

/**
 * Inline loading indicator with optional text
 */
export const InlineLoading: React.FC<InlineLoadingProps> = ({
    isLoading,
    text = 'Loading...',
    size = 'sm',
    className
}) => {
    if (!isLoading) return null;

    return (
        <div className={clsx('flex items-center space-x-2', className)}>
            <Spinner size={size} />
            {text && <span className="text-sm text-gray-600">{text}</span>}
        </div>
    );
};

interface ButtonLoadingProps {
    isLoading: boolean;
    children: React.ReactNode;
    loadingText?: string;
    className?: string;
}

/**
 * Loading state for buttons
 */
export const ButtonLoading: React.FC<ButtonLoadingProps> = ({
    isLoading,
    children,
    loadingText,
    className
}) => {
    return (
        <span className={clsx('flex items-center', className)}>
            {isLoading && <Spinner size="sm" className="mr-2" />}
            {isLoading && loadingText ? loadingText : children}
        </span>
    );
};

interface OverlayLoadingProps {
    isLoading: boolean;
    text?: string;
    backdrop?: boolean;
    className?: string;
    children?: React.ReactNode;
}

/**
 * Overlay loading that covers its container
 */
export const OverlayLoading: React.FC<OverlayLoadingProps> = ({
    isLoading,
    text = 'Loading...',
    backdrop = true,
    className,
    children
}) => {
    if (!isLoading) return <>{children}</>;

    return (
        <div className="relative">
            {children}
            <div className={clsx(
                'absolute inset-0 flex items-center justify-center z-10',
                backdrop && 'bg-white bg-opacity-75',
                className
            )}>
                <div className="text-center">
                    <Spinner size="md" />
                    {text && <p className="mt-2 text-sm text-gray-600">{text}</p>}
                </div>
            </div>
        </div>
    );
};

interface ProgressLoadingProps {
    progress: number;
    text?: string;
    showPercentage?: boolean;
    className?: string;
}

/**
 * Progress bar loading indicator
 */
export const ProgressLoading: React.FC<ProgressLoadingProps> = ({
    progress,
    text,
    showPercentage = true,
    className
}) => {
    const clampedProgress = Math.max(0, Math.min(100, progress));

    return (
        <div className={clsx('w-full', className)}>
            {(text || showPercentage) && (
                <div className="flex justify-between items-center mb-2">
                    {text && <span className="text-sm text-gray-600">{text}</span>}
                    {showPercentage && (
                        <span className="text-sm text-gray-500">{Math.round(clampedProgress)}%</span>
                    )}
                </div>
            )}
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${clampedProgress}%` }}
                />
            </div>
        </div>
    );
};

interface StepLoadingProps {
    steps: Array<{
        label: string;
        status: 'pending' | 'loading' | 'completed' | 'error';
    }>;
    className?: string;
}

/**
 * Step-by-step loading indicator
 */
export const StepLoading: React.FC<StepLoadingProps> = ({ steps, className }) => {
    return (
        <div className={clsx('space-y-4', className)}>
            {steps.map((step, index) => (
                <div key={index} className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                        {step.status === 'loading' && (
                            <Spinner size="sm" />
                        )}
                        {step.status === 'completed' && (
                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            </div>
                        )}
                        {step.status === 'error' && (
                            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </div>
                        )}
                        {step.status === 'pending' && (
                            <div className="w-5 h-5 bg-gray-300 rounded-full" />
                        )}
                    </div>
                    <span className={clsx(
                        'text-sm',
                        step.status === 'completed' && 'text-green-700',
                        step.status === 'error' && 'text-red-700',
                        step.status === 'loading' && 'text-primary-700 font-medium',
                        step.status === 'pending' && 'text-gray-500'
                    )}>
                        {step.label}
                    </span>
                </div>
            ))}
        </div>
    );
};

interface PulseLoadingProps {
    count?: number;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

/**
 * Pulse loading animation with dots
 */
export const PulseLoading: React.FC<PulseLoadingProps> = ({
    count = 3,
    size = 'md',
    className
}) => {
    const sizeClasses = {
        sm: 'w-2 h-2',
        md: 'w-3 h-3',
        lg: 'w-4 h-4',
    };

    return (
        <div className={clsx('flex space-x-1', className)}>
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className={clsx(
                        'bg-primary-600 rounded-full animate-pulse',
                        sizeClasses[size]
                    )}
                    style={{
                        animationDelay: `${i * 0.15}s`,
                        animationDuration: '1s'
                    }}
                />
            ))}
        </div>
    );
};

interface LazyLoadingProps {
    isVisible: boolean;
    children: React.ReactNode;
    fallback?: React.ReactNode;
    className?: string;
}

/**
 * Lazy loading wrapper for content that should load when visible
 */
export const LazyLoading: React.FC<LazyLoadingProps> = ({
    isVisible,
    children,
    fallback,
    className
}) => {
    if (!isVisible) {
        return (
            <div className={clsx('flex items-center justify-center p-4', className)}>
                {fallback || <Skeleton height="200px" />}
            </div>
        );
    }

    return <>{children}</>;
};