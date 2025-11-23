import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { Typography } from '../common/Typography';
import { VStack, HStack } from '../common/Spacing';
import { useAuthStore } from '@/store/authStore';

interface NavigationItem {
  name: string;
  href: string;
  icon?: React.ReactNode;
  badge?: string | number;
  roles?: string[];
  description?: string;
  children?: NavigationItem[];
}

interface NavigationProps {
  items?: NavigationItem[];
  orientation?: 'vertical' | 'horizontal';
  variant?: 'sidebar' | 'tabs' | 'pills' | 'breadcrumb';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const defaultNavigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
      </svg>
    ),
    description: 'Overview and quick actions',
  },
  {
    name: 'Requests',
    href: '/requests',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    description: 'Manage purchase requests',
    children: [
      { name: 'All Requests', href: '/requests' },
      { name: 'Create Request', href: '/requests/create', roles: ['staff', 'admin'] },
      { name: 'My Requests', href: '/requests?filter=mine' },
    ],
  },
  {
    name: 'Purchase Orders',
    href: '/orders',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
    description: 'View and manage purchase orders',
    roles: ['finance', 'admin'],
  },
  {
    name: 'Documents',
    href: '/documents',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    description: 'Upload and manage documents',
    children: [
      { name: 'All Documents', href: '/documents' },
      { name: 'Upload Document', href: '/documents/upload' },
    ],
  },
];

export const Navigation: React.FC<NavigationProps> = ({
  items = defaultNavigationItems,
  orientation = 'vertical',
  variant = 'sidebar',
  size = 'md',
  className,
}) => {
  const location = useLocation();
  const { user } = useAuthStore();

  // Filter items based on user role
  const filteredItems = items.filter(item => 
    !item.roles || item.roles.includes(user?.role || '')
  );

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href);
  };

  const sizeClasses = {
    sm: {
      text: 'text-sm',
      padding: 'px-2 py-1',
      icon: 'w-4 h-4',
    },
    md: {
      text: 'text-sm',
      padding: 'px-3 py-2',
      icon: 'w-5 h-5',
    },
    lg: {
      text: 'text-base',
      padding: 'px-4 py-3',
      icon: 'w-6 h-6',
    },
  };

  const variantClasses = {
    sidebar: {
      container: orientation === 'vertical' ? 'space-y-1' : 'flex space-x-1',
      item: 'flex items-center rounded-md font-medium transition-all duration-200',
      active: 'text-primary-700 bg-primary-50 border-r-2 border-primary-500',
      inactive: 'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-50',
    },
    tabs: {
      container: orientation === 'vertical' ? 'space-y-1' : 'flex space-x-8 border-b border-secondary-200',
      item: 'flex items-center font-medium transition-colors border-b-2',
      active: 'text-primary-600 border-primary-500',
      inactive: 'text-secondary-500 border-transparent hover:text-secondary-700 hover:border-secondary-300',
    },
    pills: {
      container: orientation === 'vertical' ? 'space-y-1' : 'flex space-x-2',
      item: 'flex items-center rounded-full font-medium transition-all duration-200',
      active: 'text-white bg-primary-600 shadow-soft',
      inactive: 'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100',
    },
    breadcrumb: {
      container: 'flex items-center space-x-2',
      item: 'flex items-center font-medium',
      active: 'text-secondary-900',
      inactive: 'text-secondary-500 hover:text-secondary-700',
    },
  };

  const currentVariant = variantClasses[variant];

  const renderNavigationItem = (item: NavigationItem, index: number) => {
    const isActive = isActiveRoute(item.href);
    
    return (
      <div key={item.name}>
        <Link
          to={item.href}
          className={clsx(
            currentVariant.item,
            sizeClasses[size].text,
            sizeClasses[size].padding,
            isActive ? currentVariant.active : currentVariant.inactive
          )}
        >
          {item.icon && (
            <span className={clsx('flex-shrink-0 mr-3', sizeClasses[size].icon)}>
              {item.icon}
            </span>
          )}
          
          <span className="flex-1">{item.name}</span>
          
          {item.badge && (
            <span className="ml-2 bg-error-100 text-error-800 text-xs font-medium px-2 py-0.5 rounded-full">
              {item.badge}
            </span>
          )}
        </Link>
        
        {/* Sub-navigation */}
        {item.children && isActive && variant === 'sidebar' && (
          <div className="ml-8 mt-2 space-y-1">
            {item.children
              .filter(child => !child.roles || child.roles.includes(user?.role || ''))
              .map((child) => (
                <Link
                  key={child.name}
                  to={child.href}
                  className={clsx(
                    'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    location.pathname === child.href
                      ? 'text-primary-600 bg-primary-50'
                      : 'text-secondary-500 hover:text-secondary-700 hover:bg-secondary-50'
                  )}
                >
                  {child.name}
                </Link>
              ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className={clsx(currentVariant.container, className)} aria-label="Navigation">
      {filteredItems.map(renderNavigationItem)}
    </nav>
  );
};

// Quick Actions Navigation Component
interface QuickActionsProps {
  actions: Array<{
    name: string;
    href: string;
    icon?: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
    description?: string;
  }>;
  className?: string;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ actions, className }) => {
  return (
    <div className={clsx('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {actions.map((action) => (
        <Link
          key={action.name}
          to={action.href}
          className="group bg-white rounded-lg border border-secondary-200 p-4 hover:shadow-medium transition-all duration-200"
        >
          <div className="flex items-center space-x-3">
            {action.icon && (
              <div className={clsx(
                'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
                action.variant === 'primary' && 'bg-primary-100 text-primary-600',
                action.variant === 'success' && 'bg-success-100 text-success-600',
                action.variant === 'warning' && 'bg-warning-100 text-warning-600',
                action.variant === 'error' && 'bg-error-100 text-error-600',
                !action.variant && 'bg-secondary-100 text-secondary-600'
              )}>
                {action.icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <Typography variant="body-small" className="font-medium group-hover:text-primary-600 transition-colors">
                {action.name}
              </Typography>
              {action.description && (
                <Typography variant="caption" color="muted">
                  {action.description}
                </Typography>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};