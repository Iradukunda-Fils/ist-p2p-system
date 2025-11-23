import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { useAuthStore } from '@/store/authStore';
import { APP_NAME, USER_ROLES } from '@/utils/constants';
import { Avatar } from '@/components/common/Avatar';
import { Typography } from '@/components/common/Typography';
import { TokenExpiryIndicator } from '@/components/auth/TokenExpiryIndicator';
import { LogoutConfirmModal } from '@/components/auth/LogoutConfirmModal';
import { LogoutSuccessModal } from '@/components/auth/LogoutSuccessModal';
import { useModal, useClickOutside } from '@/hooks/useCommon';
import { toast } from 'react-toastify';

interface NavigationItem {
    name: string;
    href: string;
    icon?: React.ReactNode;
    roles?: string[];
    badge?: string | number;
}

export const Header: React.FC = () => {
    const { user, logout, isLoggingOut } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const { isOpen: isDropdownOpen, close: closeDropdown, toggle: toggleDropdown } = useModal();
    const { isOpen: isMobileMenuOpen, toggle: toggleMobileMenu, close: closeMobileMenu } = useModal();
    const { isOpen: isLogoutConfirmOpen, open: openLogoutConfirm, close: closeLogoutConfirm } = useModal();
    const { isOpen: isLogoutSuccessOpen, open: openLogoutSuccess, close: closeLogoutSuccess } = useModal();
    const dropdownRef = useClickOutside<HTMLDivElement>(closeDropdown);

    const [logoutResult, setLogoutResult] = React.useState<{ success: boolean; username?: string } | null>(null);

    const handleLogoutClick = () => {
        closeDropdown();
        openLogoutConfirm();
    };

    const handleLogoutConfirm = async () => {
        try {
            const result = await logout();
            setLogoutResult(result);
            closeLogoutConfirm();

            if (result.success) {
                openLogoutSuccess();
                toast.success(`Successfully signed out${result.username ? ` ${result.username}` : ''}`);
            } else {
                toast.error('Logout completed with issues, but session was cleared');
                // Still redirect on failure after clearing local state
                setTimeout(() => navigate('/login'), 1000);
            }
        } catch (error) {
            console.error('[Header] Logout error:', error);
            closeLogoutConfirm();
            toast.error('Logout failed, but local session was cleared');
            // Still navigate to login even if logout fails
            setTimeout(() => navigate('/login'), 1000);
        }
    };

    const handleRedirectToLogin = () => {
        closeLogoutSuccess();
        navigate('/login');
    };

    if (!user) return null;

    const roleLabel = USER_ROLES[user.role as keyof typeof USER_ROLES] || user.role;

    const navigationItems: NavigationItem[] = [
        {
            name: 'Dashboard',
            href: '/dashboard',
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
                </svg>
            ),
        },
        {
            name: 'Requests',
            href: '/requests',
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
        },
        {
            name: 'Purchase Orders',
            href: '/orders',
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
            ),
            roles: ['finance', 'admin'],
        },
        {
            name: 'Documents',
            href: '/documents',
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
            ),
        },
    ];

    const filteredNavItems = navigationItems.filter(item =>
        !item.roles || item.roles.includes(user.role)
    );

    const isActiveRoute = (href: string) => {
        if (href === '/dashboard') {
            return location.pathname === '/' || location.pathname === '/dashboard';
        }
        return location.pathname.startsWith(href);
    };

    return (
        <header className="bg-white shadow-soft border-b border-secondary-200 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo and Brand */}
                    <div className="flex items-center">
                        <Link to="/dashboard" className="flex items-center group">
                            <div className="flex items-center space-x-3">
                                <div className="h-8 w-8 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center group-hover:shadow-medium transition-shadow">
                                    <Typography variant="caption" className="text-white font-bold">P2P</Typography>
                                </div>
                                <Typography
                                    variant="heading-4"
                                    className="group-hover:text-primary-600 transition-colors"
                                >
                                    {APP_NAME}
                                </Typography>
                            </div>
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center space-x-1">
                        {filteredNavItems.map((item) => (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={clsx(
                                    'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
                                    isActiveRoute(item.href)
                                        ? 'text-primary-700 bg-primary-50 border border-primary-200'
                                        : 'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100'
                                )}
                            >
                                {item.icon}
                                <span>{item.name}</span>
                                {item.badge && (
                                    <span className="ml-2 bg-error-100 text-error-800 text-xs font-medium px-2 py-0.5 rounded-full">
                                        {item.badge}
                                    </span>
                                )}
                            </Link>
                        ))}
                    </nav>

                    {/* Mobile menu button and User Menu */}
                    <div className="flex items-center space-x-3">
                        {/* Mobile menu button */}
                        <button
                            onClick={toggleMobileMenu}
                            className="md:hidden p-2 rounded-md text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {isMobileMenuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>

                        {/* User Menu */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={toggleDropdown}
                                className="flex items-center space-x-3 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg p-2 hover:bg-secondary-50 transition-colors"
                            >
                                <Avatar name={user.username} size="md" />
                                <div className="hidden sm:block text-left">
                                    <Typography variant="body-small" className="font-medium text-secondary-900">{user.username}</Typography>
                                    <Typography variant="caption" color="muted">{roleLabel}</Typography>
                                </div>
                                <svg
                                    className={clsx(
                                        'w-4 h-4 text-secondary-400 transition-transform duration-200',
                                        isDropdownOpen && 'transform rotate-180'
                                    )}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {/* User Dropdown Menu */}
                            {isDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="py-2">
                                        {/* User Info */}
                                        <div className="px-4 py-3 border-b border-gray-200">
                                            <div className="flex items-center space-x-3">
                                                <Avatar name={user.username} size="lg" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                        {user.username}
                                                    </p>
                                                    <p className="text-xs text-gray-500 truncate">
                                                        {user.email || roleLabel}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Token Status */}
                                        <div className="px-4 py-2 border-b border-gray-200">
                                            <TokenExpiryIndicator showDetails={true} />
                                        </div>

                                        {/* Quick Actions */}
                                        <div className="py-2">
                                            <Link
                                                to="/dashboard"
                                                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                                onClick={closeDropdown}
                                            >
                                                <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                                                </svg>
                                                Dashboard
                                            </Link>
                                            <Link
                                                to="/requests"
                                                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                                onClick={closeDropdown}
                                            >
                                                <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                My Requests
                                            </Link>
                                        </div>

                                        {/* Sign Out */}
                                        <div className="border-t border-gray-200 py-2">
                                            <button
                                                onClick={handleLogoutClick}
                                                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                            >
                                                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                </svg>
                                                Sign Out
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Mobile Navigation Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden border-t border-gray-200 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <nav className="space-y-1">
                            {filteredNavItems.map((item) => (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={clsx(
                                        'flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium transition-colors',
                                        isActiveRoute(item.href)
                                            ? 'text-primary-700 bg-primary-50'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                    )}
                                    onClick={closeMobileMenu}
                                >
                                    {item.icon}
                                    <span>{item.name}</span>
                                    {item.badge && (
                                        <span className="ml-auto bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded-full">
                                            {item.badge}
                                        </span>
                                    )}
                                </Link>
                            ))}
                        </nav>
                    </div>
                )}
            </div>

            {/* Logout Confirmation Modal */}
            <LogoutConfirmModal
                isOpen={isLogoutConfirmOpen}
                onClose={closeLogoutConfirm}
                onConfirm={handleLogoutConfirm}
                isLoading={isLoggingOut}
                username={user.username}
            />

            {/* Logout Success Modal */}
            <LogoutSuccessModal
                isOpen={isLogoutSuccessOpen}
                onClose={closeLogoutSuccess}
                onRedirect={handleRedirectToLogin}
                username={logoutResult?.username}
                autoRedirectDelay={3}
            />
        </header>
    );
};
