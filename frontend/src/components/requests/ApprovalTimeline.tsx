import React from 'react';
import { Approval } from '@/types';
import { formatDateTime } from '@/utils/formatters';

interface ApprovalTimelineProps {
    approvals: Approval[];
}

/**
 * Displays the approval history timeline with accessibility features
 */
export const ApprovalTimeline: React.FC<ApprovalTimelineProps> = ({ approvals }) => {
    if (approvals.length === 0) {
        return null;
    }

    return (
        <div className="flow-root">
            <ul className="-mb-8">
                {approvals.map((approval, index) => (
                    <li key={approval.id}>
                        <div className="relative pb-8">
                            {index !== approvals.length - 1 && (
                                <span
                                    className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                                    aria-hidden="true"
                                />
                            )}
                            <div className="relative flex space-x-3">
                                <div>
                                    <span 
                                        className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                                            approval.decision === 'APPROVED' ? 'bg-green-500' : 'bg-red-500'
                                        }`}
                                        aria-label={`${approval.decision === 'APPROVED' ? 'Approved' : 'Rejected'} by ${approval.approver.username}`}
                                    >
                                        {approval.decision === 'APPROVED' ? (
                                            <svg 
                                                className="h-5 w-5 text-white" 
                                                fill="currentColor" 
                                                viewBox="0 0 20 20"
                                                aria-hidden="true"
                                            >
                                                <path 
                                                    fillRule="evenodd" 
                                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                                                    clipRule="evenodd" 
                                                />
                                            </svg>
                                        ) : (
                                            <svg 
                                                className="h-5 w-5 text-white" 
                                                fill="currentColor" 
                                                viewBox="0 0 20 20"
                                                aria-hidden="true"
                                            >
                                                <path 
                                                    fillRule="evenodd" 
                                                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" 
                                                    clipRule="evenodd" 
                                                />
                                            </svg>
                                        )}
                                    </span>
                                </div>
                                <div className="min-w-0 flex-1 pt-1.5">
                                    <div>
                                        <p className="text-sm text-gray-600">
                                            <span className="font-medium text-gray-900">
                                                {approval.approver.username}
                                            </span>
                                            {' '}{approval.decision.toLowerCase()} at level {approval.level}
                                        </p>
                                        <p className="mt-0.5 text-xs text-gray-500">
                                            {formatDateTime(approval.created_at)}
                                        </p>
                                    </div>
                                    {approval.comment && (
                                        <div 
                                            className="mt-2 text-sm text-gray-700 bg-gray-50 p-2 rounded"
                                            role="note"
                                            aria-label="Approval comment"
                                        >
                                            {approval.comment}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};
