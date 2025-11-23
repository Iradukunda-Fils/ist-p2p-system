import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { purchasesApi } from '@/api/purchasesApi';

/**
 * Approval Summary Widget for Approvers
 * 
 * Displays:
 * - Total pending approvals for the user
 * - Breakdown by approval level (if applicable)
 * - Quick action link to filtered requests
 */
export const ApprovalSummaryWidget: React.FC = () => {
    const { data, isLoading, error } = useQuery({
        queryKey: ['approval-summary'],
        queryFn: () => purchasesApi.getApprovalSummary(),
        refetchInterval: 60000, // Refetch every minute
    });

    if (isLoading) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600">Failed to load approval summary</p>
            </div>
        );
    }

    // Defensive: Check if data exists
    if (!data) {
        return null;
    }

    const totalPending = (data.pending_level_1_approvals || 0) + (data.pending_level_2_approvals || 0);

    return (
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-md p-6 border border-blue-200">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Pending Approvals</h3>
                <div className="bg-blue-600 rounded-full p-2">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
            </div>

            <div className="space-y-4">
                {/* Total Pending */}
                <div>
                    <p className="text-sm text-gray-600 mb-1">Total Requests Awaiting Your Approval</p>
                    <p className="text-4xl font-bold text-blue-600">{totalPending}</p>
                    <p className="text-sm text-gray-600 mb-2">Level 1: {data?.pending_level_1_approvals ?? 0} pending</p>
                    <p className="text-sm text-gray-600">Level 2: {data?.pending_level_2_approvals ?? 0} pending</p>
                </div>

                {/* Action Button */}
                <div className="pt-4">
                    {totalPending > 0 ? (
                        <Link
                            to="/requests?status=pending"
                            className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                        >
                            Review Pending Requests →
                        </Link>
                    ) : (
                        <div className="text-center py-2 text-sm text-gray-600">
                            ✓ All caught up! No pending approvals
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ApprovalSummaryWidget;
