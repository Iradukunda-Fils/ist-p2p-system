import React from 'react';
import { Header } from './Header';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface MainLayoutProps {
    children: React.ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    background?: 'gray' | 'white' | 'transparent';
    className?: string;
    header?: React.ReactNode;
    sidebar?: React.ReactNode;
    footer?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ 
    children,
    maxWidth = '7xl',
    padding = 'md',
    background = 'gray',
    className,
    header,
    sidebar,
    footer
}) => {
    const maxWidthClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '7xl': 'max-w-7xl',
        full: 'max-w-full',
    };

    const paddingClasses = {
        none: '',
        sm: 'py-4 px-4 sm:px-6',
        md: 'py-6 px-4 sm:px-6 lg:px-8',
        lg: 'py-8 px-4 sm:px-6 lg:px-8',
    };

    const backgroundClasses = {
        gray: 'bg-gray-50',
        white: 'bg-white',
        transparent: 'bg-transparent',
    };

    return (
        <div className={`min-h-screen ${backgroundClasses[background]} flex flex-col`}>
            {/* Header */}
            {header || <Header />}
            
            <div className="flex-1 flex">
                {/* Sidebar */}
                {sidebar && (
                    <aside className="hidden lg:flex lg:flex-shrink-0">
                        <div className="flex flex-col w-64 border-r border-gray-200 bg-white">
                            {sidebar}
                        </div>
                    </aside>
                )}

                {/* Main Content */}
                <main className={`flex-1 ${maxWidthClasses[maxWidth]} mx-auto ${paddingClasses[padding]} ${className || ''}`}>
                    <ErrorBoundary level="section">
                        <div className="w-full">
                            {children}
                        </div>
                    </ErrorBoundary>
                </main>
            </div>

            {/* Footer */}
            {footer && (
                <footer className="bg-white border-t border-gray-200">
                    <div className={`${maxWidthClasses[maxWidth]} mx-auto px-4 sm:px-6 lg:px-8 py-4`}>
                        {footer}
                    </div>
                </footer>
            )}
        </div>
    );
};
