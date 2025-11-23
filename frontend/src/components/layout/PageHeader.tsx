import React from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Button } from '../common/Button';
import { Typography, Heading } from '../common/Typography';
import { VStack, HStack } from '../common/Spacing';

interface Breadcrumb {
    label: string;
    href?: string;
}

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    breadcrumbs?: Breadcrumb[];
    actions?: React.ReactNode;
    tabs?: Array<{
        name: string;
        href: string;
        current: boolean;
        count?: number;
    }>;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

export const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    subtitle,
    breadcrumbs,
    actions,
    tabs,
    className,
    size = 'md'
}) => {
    const sizeClasses = {
        sm: {
            title: 'text-xl font-semibold',
            subtitle: 'text-sm',
            spacing: 'space-y-3'
        },
        md: {
            title: 'text-2xl font-bold',
            subtitle: 'text-base',
            spacing: 'space-y-4'
        },
        lg: {
            title: 'text-3xl font-bold',
            subtitle: 'text-lg',
            spacing: 'space-y-6'
        }
    };

    const headingLevel = size === 'lg' ? 1 : size === 'md' ? 2 : 3;

    return (
        <VStack size="component" className={clsx('border-b border-secondary-200 pb-content mb-content', className)}>
            {/* Breadcrumbs */}
            {breadcrumbs && breadcrumbs.length > 0 && (
                <nav className="flex" aria-label="Breadcrumb">
                    <ol className="flex items-center space-x-2">
                        {breadcrumbs.map((crumb, index) => (
                            <li key={index} className="flex items-center">
                                {index > 0 && (
                                    <svg
                                        className="flex-shrink-0 h-4 w-4 text-secondary-400 mx-2"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                )}
                                {crumb.href ? (
                                    <Link
                                        to={crumb.href}
                                        className="text-body-small font-medium text-muted hover:text-emphasis transition-colors"
                                    >
                                        {crumb.label}
                                    </Link>
                                ) : (
                                    <Typography variant="body-small" className="font-medium">
                                        {crumb.label}
                                    </Typography>
                                )}
                            </li>
                        ))}
                    </ol>
                </nav>
            )}

            {/* Header Content */}
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <Heading level={headingLevel as 1 | 2 | 3}>
                        {title}
                    </Heading>
                    {subtitle && (
                        <Typography 
                            variant={size === 'lg' ? 'body-large' : size === 'md' ? 'body' : 'body-small'} 
                            color="muted" 
                            className="mt-2"
                        >
                            {subtitle}
                        </Typography>
                    )}
                </div>
                
                {actions && (
                    <HStack size="element" className="ml-6">
                        {actions}
                    </HStack>
                )}
            </div>

            {/* Tabs */}
            {tabs && tabs.length > 0 && (
                <div>
                    <nav className="flex space-x-8" aria-label="Tabs">
                        {tabs.map((tab) => (
                            <Link
                                key={tab.name}
                                to={tab.href}
                                className={clsx(
                                    'flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors',
                                    tab.current
                                        ? 'border-primary-500 text-primary-600'
                                        : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
                                )}
                                aria-current={tab.current ? 'page' : undefined}
                            >
                                {tab.name}
                                {tab.count !== undefined && (
                                    <span
                                        className={clsx(
                                            'ml-2 py-0.5 px-2 rounded-full text-xs font-medium',
                                            tab.current
                                                ? 'bg-primary-100 text-primary-600'
                                                : 'bg-secondary-100 text-secondary-900'
                                        )}
                                    >
                                        {tab.count}
                                    </span>
                                )}
                            </Link>
                        ))}
                    </nav>
                </div>
            )}
        </VStack>
    );
};

interface QuickActionsProps {
    children: React.ReactNode;
    className?: string;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ children, className }) => {
    return (
        <div className={clsx('flex items-center space-x-3', className)}>
            {children}
        </div>
    );
};

interface PageHeaderStatsProps {
    stats: Array<{
        label: string;
        value: string | number;
        change?: {
            value: string;
            trend: 'up' | 'down' | 'neutral';
        };
        icon?: React.ReactNode;
    }>;
    className?: string;
}

export const PageHeaderStats: React.FC<PageHeaderStatsProps> = ({ stats, className }) => {
    return (
        <div className={clsx('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-content', className)}>
            {stats.map((stat, index) => (
                <div key={index} className="bg-white rounded-lg border border-secondary-200 p-component shadow-soft">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <Typography variant="body-small" color="muted" className="font-medium">
                                {stat.label}
                            </Typography>
                            <Typography variant="heading-2" className="mt-1">
                                {stat.value}
                            </Typography>
                            {stat.change && (
                                <div className="flex items-center mt-1">
                                    <Typography
                                        variant="body-small"
                                        className={clsx(
                                            'font-medium',
                                            stat.change.trend === 'up' && 'text-success-600',
                                            stat.change.trend === 'down' && 'text-error-600',
                                            stat.change.trend === 'neutral' && 'text-secondary-600'
                                        )}
                                    >
                                        {stat.change.trend === 'up' && '↗'}
                                        {stat.change.trend === 'down' && '↘'}
                                        {stat.change.value}
                                    </Typography>
                                </div>
                            )}
                        </div>
                        {stat.icon && (
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-secondary-100 rounded-lg flex items-center justify-center">
                                    {stat.icon}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};