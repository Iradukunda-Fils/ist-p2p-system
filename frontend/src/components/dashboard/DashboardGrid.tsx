import React from 'react';

interface DashboardGridProps {
  children: React.ReactNode;
  className?: string;
}

interface DashboardSectionProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export const DashboardGrid: React.FC<DashboardGridProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {children}
    </div>
  );
};

export const DashboardStatsGrid: React.FC<DashboardGridProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 ${className}`}>
      {children}
    </div>
  );
};

export const DashboardContentGrid: React.FC<DashboardGridProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`grid grid-cols-1 gap-6 lg:grid-cols-3 ${className}`}>
      {children}
    </div>
  );
};

export const DashboardSection: React.FC<DashboardSectionProps> = ({ 
  children, 
  className = '',
  title 
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {title && (
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      )}
      {children}
    </div>
  );
};

// Responsive column spans for different content types
export const DashboardColumn = {
  Full: ({ children, className = '' }: DashboardGridProps) => (
    <div className={`lg:col-span-3 ${className}`}>{children}</div>
  ),
  TwoThirds: ({ children, className = '' }: DashboardGridProps) => (
    <div className={`lg:col-span-2 ${className}`}>{children}</div>
  ),
  OneThird: ({ children, className = '' }: DashboardGridProps) => (
    <div className={`lg:col-span-1 ${className}`}>{children}</div>
  ),
  Half: ({ children, className = '' }: DashboardGridProps) => (
    <div className={`sm:col-span-1 lg:col-span-1 xl:col-span-1 ${className}`}>{children}</div>
  ),
};

export default DashboardGrid;