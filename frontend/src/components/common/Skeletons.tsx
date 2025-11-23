import React from 'react';
import clsx from 'clsx';

interface SkeletonProps {
    className?: string;
    width?: string | number;
    height?: string | number;
    variant?: 'text' | 'rectangular' | 'circular';
    animation?: 'pulse' | 'wave' | 'none';
}

/**
 * Base skeleton component
 */
export const Skeleton: React.FC<SkeletonProps> = ({
    className,
    width,
    height,
    variant = 'text',
    animation = 'pulse'
}) => {
    const baseClasses = 'bg-gray-200';

    const variantClasses = {
        text: 'rounded',
        rectangular: 'rounded-md',
        circular: 'rounded-full',
    };

    const animationClasses = {
        pulse: 'animate-pulse',
        wave: 'animate-pulse', // Could implement wave animation with CSS
        none: '',
    };

    const style: React.CSSProperties = {};
    if (width) style.width = typeof width === 'number' ? `${width}px` : width;
    if (height) style.height = typeof height === 'number' ? `${height}px` : height;

    return (
        <div
            className={clsx(
                baseClasses,
                variantClasses[variant],
                animationClasses[animation],
                variant === 'text' && !height && 'h-4',
                className
            )}
            style={style}
        />
    );
};

/**
 * Loading skeleton component for stat cards
 */
export const StatCardSkeleton: React.FC<{ className?: string }> = ({ className }) => {
    return (
        <div className={clsx('bg-white rounded-lg shadow-md p-6', className)}>
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <Skeleton width="50%" className="mb-3" />
                    <Skeleton width="75%" height="2rem" className="mb-2" />
                    <Skeleton width="33%" height="0.75rem" />
                </div>
                <Skeleton variant="circular" width="3rem" height="3rem" />
            </div>
            <Skeleton height="0.5rem" className="mt-4" />
        </div>
    );
};

/**
 * Loading skeleton for table rows
 */
export const TableRowSkeleton: React.FC<{ columns?: number; className?: string }> = ({
    columns = 5,
    className
}) => {
    return (
        <tr className={className}>
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} className="px-6 py-4">
                    <Skeleton />
                </td>
            ))}
        </tr>
    );
};

/**
 * Loading skeleton for cards
 */
export const CardSkeleton: React.FC<{ className?: string; lines?: number }> = ({
    className,
    lines = 3
}) => {
    return (
        <div className={clsx('bg-white rounded-lg shadow p-6', className)}>
            <Skeleton width="33%" height="1.5rem" className="mb-4" />
            <div className="space-y-3">
                {Array.from({ length: lines }).map((_, i) => (
                    <Skeleton
                        key={i}
                        width={i === lines - 1 ? '66%' : i === lines - 2 ? '83%' : '100%'}
                    />
                ))}
            </div>
        </div>
    );
};

/**
 * Loading skeleton for list items
 */
export const ListItemSkeleton: React.FC<{
    showAvatar?: boolean;
    lines?: number;
    className?: string;
}> = ({
    showAvatar = false,
    lines = 2,
    className
}) => {
        return (
            <div className={clsx('flex items-start space-x-4 p-4', className)}>
                {showAvatar && (
                    <Skeleton variant="circular" width="2.5rem" height="2.5rem" />
                )}
                <div className="flex-1 space-y-2">
                    {Array.from({ length: lines }).map((_, i) => (
                        <Skeleton
                            key={i}
                            width={i === 0 ? '75%' : i === lines - 1 ? '50%' : '90%'}
                        />
                    ))}
                </div>
            </div>
        );
    };

/**
 * Loading skeleton for dashboard layout
 */
export const DashboardSkeleton: React.FC = () => {
    return (
        <div className="space-y-6">
            {/* Header skeleton */}
            <div className="flex items-center justify-between">
                <Skeleton width="200px" height="2rem" />
                <Skeleton width="120px" height="2.5rem" variant="rectangular" />
            </div>

            {/* Stats grid skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                    <StatCardSkeleton key={i} />
                ))}
            </div>

            {/* Content area skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <CardSkeleton lines={5} />
                </div>
                <div>
                    <CardSkeleton lines={3} />
                </div>
            </div>
        </div>
    );
};

/**
 * Loading skeleton for forms
 */
export const FormSkeleton: React.FC<{ fields?: number; className?: string }> = ({
    fields = 4,
    className
}) => {
    return (
        <div className={clsx('space-y-6', className)}>
            {Array.from({ length: fields }).map((_, i) => (
                <div key={i} className="space-y-2">
                    <Skeleton width="25%" height="1rem" />
                    <Skeleton height="2.5rem" variant="rectangular" />
                </div>
            ))}
            <div className="flex space-x-3 pt-4">
                <Skeleton width="100px" height="2.5rem" variant="rectangular" />
                <Skeleton width="80px" height="2.5rem" variant="rectangular" />
            </div>
        </div>
    );
};

/**
 * Loading skeleton for data tables
 */
export const TableSkeleton: React.FC<{
    rows?: number;
    columns?: number;
    showHeader?: boolean;
    className?: string;
}> = ({
    rows = 5,
    columns = 5,
    showHeader = true,
    className
}) => {
        return (
            <div className={clsx('bg-white shadow rounded-lg overflow-hidden', className)}>
                <table className="min-w-full divide-y divide-gray-200">
                    {showHeader && (
                        <thead className="bg-gray-50">
                            <tr>
                                {Array.from({ length: columns }).map((_, i) => (
                                    <th key={i} className="px-6 py-3">
                                        <Skeleton width="80%" height="1rem" />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                    )}
                    <tbody className="bg-white divide-y divide-gray-200">
                        {Array.from({ length: rows }).map((_, i) => (
                            <TableRowSkeleton key={i} columns={columns} />
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

/**
 * Loading skeleton for navigation
 */
export const NavigationSkeleton: React.FC<{ items?: number }> = ({ items = 5 }) => {
    return (
        <nav className="space-y-1">
            {Array.from({ length: items }).map((_, i) => (
                <div key={i} className="flex items-center space-x-3 px-3 py-2">
                    <Skeleton variant="circular" width="1.5rem" height="1.5rem" />
                    <Skeleton width="120px" />
                </div>
            ))}
        </nav>
    );
};
