import React from 'react';
import clsx from 'clsx';
import { RequestStatus } from '@/types';

interface StatusBadgeProps {
    status: RequestStatus;
    className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
    const statusClasses = {
        PENDING: 'badge-pending',
        APPROVED: 'badge-approved',
        REJECTED: 'badge-rejected',
    };

    return (
        <span className={clsx(statusClasses[status], className)}>
            {status}
        </span>
    );
};
