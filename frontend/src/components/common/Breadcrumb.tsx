import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { Typography } from './Typography';
import { HStack } from './Spacing';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  separator?: 'chevron' | 'slash' | 'arrow';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showHome?: boolean;
  maxItems?: number;
}

const separatorIcons = {
  chevron: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
  ),
  slash: <span>/</span>,
  arrow: <span>→</span>,
};

const homeIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
  </svg>
);

// Auto-generate breadcrumbs from current route
const generateBreadcrumbsFromRoute = (pathname: string): BreadcrumbItem[] => {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  // Route mapping for better labels
  const routeLabels: Record<string, string> = {
    dashboard: 'Dashboard',
    requests: 'Requests',
    orders: 'Purchase Orders',
    documents: 'Documents',
    create: 'Create',
    edit: 'Edit',
    upload: 'Upload',
  };

  segments.forEach((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    
    // Don't make the last item a link
    breadcrumbs.push({
      label,
      href: index === segments.length - 1 ? undefined : href,
    });
  });

  return breadcrumbs;
};

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  separator = 'chevron',
  size = 'md',
  className,
  showHome = true,
  maxItems = 5,
}) => {
  const location = useLocation();
  
  // Use provided items or auto-generate from route
  const breadcrumbItems = items || generateBreadcrumbsFromRoute(location.pathname);
  
  // Add home item if requested and not already present
  const finalItems = showHome && breadcrumbItems[0]?.label !== 'Dashboard' 
    ? [{ label: 'Dashboard', href: '/dashboard', icon: homeIcon }, ...breadcrumbItems]
    : breadcrumbItems;

  // Truncate items if too many
  const displayItems = finalItems.length > maxItems 
    ? [
        finalItems[0],
        { label: '...', href: undefined },
        ...finalItems.slice(-maxItems + 2)
      ]
    : finalItems;

  if (displayItems.length <= 1) return null;

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const SeparatorIcon = separatorIcons[separator];

  return (
    <nav className={clsx('flex items-center', className)} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {displayItems.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <span className="text-secondary-400 mx-2 flex-shrink-0">
                {SeparatorIcon}
              </span>
            )}
            
            <div className="flex items-center space-x-1">
              {item.icon && (
                <span className="text-secondary-400 flex-shrink-0">
                  {item.icon}
                </span>
              )}
              
              {item.href && item.label !== '...' ? (
                <Link
                  to={item.href}
                  className={clsx(
                    sizeClasses[size],
                    'font-medium text-secondary-500 hover:text-secondary-700 transition-colors truncate'
                  )}
                >
                  {item.label}
                </Link>
              ) : (
                <Typography 
                  variant={size === 'lg' ? 'body' : size === 'md' ? 'body-small' : 'caption'}
                  className={clsx(
                    'font-medium truncate',
                    item.label === '...' ? 'text-secondary-400' : 'text-secondary-900'
                  )}
                >
                  {item.label}
                </Typography>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
};

// Convenience hook for getting breadcrumb items
export const useBreadcrumbs = (customItems?: BreadcrumbItem[]) => {
  const location = useLocation();
  
  return customItems || generateBreadcrumbsFromRoute(location.pathname);
};