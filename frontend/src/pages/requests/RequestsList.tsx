import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { purchasesApi } from '@/api/purchasesApi';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Spinner } from '@/components/common/Spinner';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { RequestStatus } from '@/types';
import { useAuthStore } from '@/store/authStore';

const RequestsList: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [searchParams] = useSearchParams();
    const filterParam = searchParams.get('filter');
    const createdByParam = searchParams.get('created_by');
    
    // Determine the effective created_by filter
    const createdByFilter = filterParam === 'mine' && user 
        ? user.id 
        : createdByParam;
    
    const [statusFilter, setStatusFilter] = useState<RequestStatus | ''>('');
    const [searchQuery, setSearchQuery] = useState('');

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['requests', statusFilter, searchQuery, createdByFilter],
        queryFn: () => purchasesApi.getRequests({
            status: statusFilter || undefined,
            search: searchQuery || undefined,
            created_by: createdByFilter || undefined,
            ordering: '-created_at',
        }),
    });

    const handleExport = () => {
        if (!data?.results) return;

        const headers = ['ID', 'Title', 'Amount', 'Status', 'Created By', 'Created Date', 'Items Count'];
        const csvContent = [
            headers.join(','),
            ...data.results.map(r => [
                r.id,
                `"${r.title.replace(/"/g, '""')}"`,
                r.amount,
                r.status,
                r.created_by.username,
                new Date(r.created_at).toLocaleDateString(),
                r.items.length
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `requests_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const canCreateRequest = user?.role === 'staff' || user?.role === 'admin';

    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Purchase Requests</h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Manage and track all purchase requests
                        </p>
                    </div>
                    <div className="flex space-x-3">
                        <Button variant="secondary" onClick={handleExport} disabled={!data?.results.length}>
                            Export CSV
                        </Button>
                        {canCreateRequest && (
                            <Button onClick={() => navigate('/requests/create')}>
                                Create Request
                            </Button>
                        )}
                    </div>
                </div>

                {/* Active Filters Banner */}
                {createdByFilter && (
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                        <div className="flex justify-between items-center">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-blue-700">
                                        {createdByFilter === user?.id ? (
                                            <span className="font-medium">Filtering requests created by you</span>
                                        ) : (
                                            <>
                                                Filtering requests created by user ID: <span className="font-medium">{createdByFilter}</span>
                                            </>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/requests')}
                                className="text-sm text-blue-700 hover:text-blue-600 font-medium"
                            >
                                Clear Filter
                            </button>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <Card>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                            type="text"
                            placeholder="Search requests..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <select
                            className="input"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as RequestStatus | '')}
                        >
                            <option value="">All Statuses</option>
                            <option value="PENDING">Pending</option>
                            <option value="APPROVED">Approved</option>
                            <option value="REJECTED">Rejected</option>
                        </select>
                        <Button variant="secondary" onClick={() => refetch()}>
                            Refresh
                        </Button>
                    </div>
                </Card>

                {/* Results */}
                <Card>
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Spinner />
                        </div>
                    ) : data?.results.length === 0 ? (
                        <div className="text-center py-12">
                            <svg
                                className="mx-auto h-12 w-12 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                            <p className="mt-2 text-sm text-gray-600">No requests found</p>
                            {canCreateRequest && (
                                <Button
                                    className="mt-4"
                                    onClick={() => navigate('/requests/create')}
                                >
                                    Create Your First Request
                                </Button>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="mb-4 text-sm text-gray-600">
                                Showing {data?.results.length} of {data?.count} requests
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Title
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Amount
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Created By
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Created Date
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {data?.results.map((request) => (
                                            <tr
                                                key={request.id}
                                                className="hover:bg-gray-50"
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {request.title}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {request.items.length} item(s)
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                                    {formatCurrency(request.amount)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <StatusBadge status={request.status} />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {request.created_by.username}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {formatDate(request.created_at)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button
                                                        onClick={() => navigate(`/requests/${request.id}`)}
                                                        className="text-primary-600 hover:text-primary-900"
                                                    >
                                                        View Details
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </Card>
            </div>
        </MainLayout>
    );
};

export default RequestsList;
