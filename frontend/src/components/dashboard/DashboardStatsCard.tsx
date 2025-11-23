import React from 'react';
import { Card } from '@/components/common/Card';
import { Spinner } from '@/components/common/Spinner';

interface DashboardStatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'blue' | 'yellow' | 'green' | 'red' | 'orange' | 'indigo' | 'gray';
  isLoading?: boolean;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-100',
    text: 'text-blue-600',
    value: 'text-blue-600',
  },
  yellow: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-600',
    value: 'text-yellow-600',
  },
  green: {
    bg: 'bg-green-100',
    text: 'text-green-600',
    value: 'text-green-600',
  },
  red: {
    bg: 'bg-red-100',
    text: 'text-red-600',
    value: 'text-red-600',
  },
  orange: {
    bg: 'bg-orange-100',
    text: 'text-orange-600',
    value: 'text-orange-600',
  },
  indigo: {
    bg: 'bg-indigo-100',
    text: 'text-indigo-600',
    value: 'text-indigo-600',
  },
  gray: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    value: 'text-gray-900',
  },
};

export const DashboardStatsCard: React.FC<DashboardStatsCardProps> = ({
  title,
  value,
  icon,
  color = 'gray',
  isLoading = false,
  subtitle,
  trend,
}) => {
  const colors = colorClasses[color];

  return (
    <Card className="h-full">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-600 truncate">{title}</p>
          <div className="mt-1">
            {isLoading ? (
              <Spinner size="sm" />
            ) : (
              <p className={`text-2xl font-semibold ${colors.value}`}>
                {value}
              </p>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center mt-2">
              <span className={`text-xs font-medium ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend.isPositive ? '↗' : '↘'} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-gray-500 ml-1">vs last week</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${colors.bg} flex-shrink-0`}>
          <div className={`h-8 w-8 ${colors.text}`}>
            {icon}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default DashboardStatsCard;