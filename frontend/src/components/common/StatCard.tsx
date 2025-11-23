import React from 'react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    color?: 'blue' | 'green' | 'yellow' | 'purple' | 'red' | 'indigo';
    isLoading?: boolean;
}

/**
 * Modern stat card component with gradient backgrounds and trend indicators
 */
export const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    icon,
    trend,
    color = 'blue',
    isLoading = false,
}) => {
    const colorStyles = {
        blue: {
            bg: 'from-blue-500 to-blue-600',
            icon: 'bg-blue-100 text-blue-600',
            text: 'text-blue-600',
        },
        green: {
            bg: 'from-green-500 to-green-600',
            icon: 'bg-green-100 text-green-600',
            text: 'text-green-600',
        },
        yellow: {
            bg: 'from-yellow-500 to-yellow-600',
            icon: 'bg-yellow-100 text-yellow-600',
            text: 'text-yellow-600',
        },
        purple: {
            bg: 'from-purple-500 to-purple-600',
            icon: 'bg-purple-100 text-purple-600',
            text: 'text-purple-600',
        },
        red: {
            bg: 'from-red-500 to-red-600',
            icon: 'bg-red-100 text-red-600',
            text: 'text-red-600',
        },
        indigo: {
            bg: 'from-indigo-500 to-indigo-600',
            icon: 'bg-indigo-100 text-indigo-600',
            text: 'text-indigo-600',
        },
    };

    const styles = colorStyles[color];

    if (isLoading) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
            <div className="p-6">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
                        <p className="text-3xl font-bold text-gray-900">{value}</p>
                        {trend && (
                            <div className="mt-2 flex items-center text-sm">
                                {trend.isPositive ? (
                                    <>
                                        <svg className="w-4 h-4 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-green-600 font-medium">{trend.value}%</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4 text-red-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-red-600 font-medium">{trend.value}%</span>
                                    </>
                                )}
                                <span className="text-gray-500 ml-1">vs last month</span>
                            </div>
                        )}
                    </div>
                    <div className={`p-3 rounded-full ${styles.icon}`}>
                        {icon}
                    </div>
                </div>
            </div>
            {/* Gradient accent bar at bottom */}
            <div className={`h-2 bg-gradient-to-r ${styles.bg}`}></div>
        </div>
    );
};
