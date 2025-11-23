import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { documentsApi, DocumentQueryParams } from '@/api/documentsApi';
import { Document, DocumentType, ProcessingStatus } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { VStack } from '@/components/common/Spacing';

export const DocumentsList: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();

    const [filters, setFilters] = useState<DocumentQueryParams>({
        page: 1,
        page_size: 20,
        ordering: '-uploaded_at',
    });

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['documents', filters],
        queryFn: () => documentsApi.getDocuments(filters),
    });

    const getStatusBadge = (status: ProcessingStatus) => {
        const styles: Record<ProcessingStatus, string> = {
            PENDING: 'bg-yellow-100 text-yellow-800',
            PROCESSING: 'bg-blue-100 text-blue-800',
            COMPLETED: 'bg-green-100 text-green-800',
            FAILED: 'bg-red-100 text-red-800',
        };

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
                {status}
            </span>
        );
    };

    const getTypeBadge = (type: DocumentType) => {
        const labels: Record<DocumentType, string> = {
            PROFORMA: 'Proforma',
            RECEIPT: 'Receipt',
            PO: 'PO',
            OTHER: 'Other',
        };

        return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {labels[type]}
            </span>
        );
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / 1024 / 1024).toFixed(2) + ' MB';
    };

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleString();
    };

    const handleDownload = async (doc: Document) => {
        try {
            const blob = await documentsApi.downloadDirectDocument(doc.id);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = doc.original_filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success('Document downloaded successfully');
        } catch (error) {
            toast.error('Failed to download document');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this document?')) {
            return;
        }

        try {
            await documentsApi.deleteDocument(id);
            toast.success('Document deleted successfully');
            refetch();
        } catch (error: any) {
            const errorMessage = error.response?.data?.error?.message || 'Failed to delete document';
            toast.error(errorMessage);
            console.error('Failed to delete document:', error);
        }
    };

    return (
        <MainLayout>
            <VStack size="content">
                {/* Breadcrumb Navigation */}
                <Breadcrumb />

                {/* Page Header */}
                <PageHeader
                    title="Documents"
                    subtitle="Manage uploaded documents, proforma invoices, and receipts"
                    actions={
                        <Button
                            onClick={() => navigate('/documents/upload')}
                            leftIcon={
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            }
                        >
                            Upload Document
                        </Button>
                    }
                />

                {/* Filters */}
                <Card title="Filter Documents">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-secondary-700 mb-1">
                                Document Type
                            </label>
                            <select
                                value={filters.doc_type || ''}
                                onChange={(e) => setFilters(prev => ({ ...prev, doc_type: e.target.value as DocumentType || undefined, page: 1 }))}
                                className="block w-full rounded-md border-secondary-300 shadow-soft focus:border-primary-500 focus:ring-primary-500 text-sm"
                            >
                                <option value="">All Types</option>
                                <option value="PROFORMA">Proforma</option>
                                <option value="RECEIPT">Receipt</option>
                                <option value="PO">Purchase Order</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-secondary-700 mb-1">
                                Processing Status
                            </label>
                            <select
                                value={filters.processing_status || ''}
                                onChange={(e) => setFilters(prev => ({ ...prev, processing_status: e.target.value as ProcessingStatus || undefined, page: 1 }))}
                                className="block w-full rounded-md border-secondary-300 shadow-soft focus:border-primary-500 focus:ring-primary-500 text-sm"
                            >
                                <option value="">All Statuses</option>
                                <option value="PENDING">Pending</option>
                                <option value="PROCESSING">Processing</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="FAILED">Failed</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-secondary-700 mb-1">
                                Search
                            </label>
                            <input
                                type="text"
                                placeholder="Search filename or title..."
                                value={filters.search || ''}
                                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value || undefined, page: 1 }))}
                                className="block w-full rounded-md border-secondary-300 shadow-soft focus:border-primary-500 focus:ring-primary-500 text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-secondary-700 mb-1">
                                Sort By
                            </label>
                            <select
                                value={filters.ordering || '-uploaded_at'}
                                onChange={(e) => setFilters(prev => ({ ...prev, ordering: e.target.value }))}
                                className="block w-full rounded-md border-secondary-300 shadow-soft focus:border-primary-500 focus:ring-primary-500 text-sm"
                            >
                                <option value="-uploaded_at">Newest First</option>
                                <option value="uploaded_at">Oldest First</option>
                                <option value="original_filename">Name (A-Z)</option>
                                <option value="-original_filename">Name (Z-A)</option>
                                <option value="-file_size">Size (Large to Small)</option>
                                <option value="file_size">Size (Small to Large)</option>
                            </select>
                        </div>
                    </div>
                </Card>

                {/* Documents List */}
                {isLoading ? (
                    <Card>
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                        </div>
                    </Card>
                ) : data && data.results.length > 0 ? (
                    <>
                        <Card>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-secondary-200">
                                    <thead className="bg-secondary-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                                                Document
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                                                Type
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                                                Size
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                                                Uploaded
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {data.results.map((doc) => (
                                            <tr key={doc.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10">
                                                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {doc.title || doc.original_filename}
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                {doc.original_filename}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {getTypeBadge(doc.doc_type)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {getStatusBadge(doc.processing_status)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {formatFileSize(doc.file_size)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <div>{formatDate(doc.uploaded_at)}</div>
                                                    <div className="text-xs text-gray-400">by {doc.uploaded_by.username}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                                    <button
                                                        onClick={() => navigate(`/documents/${doc.id}`)}
                                                        className="text-blue-600 hover:text-blue-900"
                                                    >
                                                        View
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownload(doc)}
                                                        className="text-green-600 hover:text-green-900"
                                                    >
                                                        Download
                                                    </button>
                                                    {user?.is_admin_user && (
                                                        <button
                                                            onClick={() => handleDelete(doc.id)}
                                                            className="text-red-600 hover:text-red-900"
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {data.count > (filters.page_size || 20) && (
                                <div className="flex justify-between items-center">
                                    <div className="text-sm text-gray-700">
                                        Showing {((filters.page || 1) - 1) * (filters.page_size || 20) + 1} to {Math.min((filters.page || 1) * (filters.page_size || 20), data.count)} of {data.count} documents
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => setFilters(prev => ({ ...prev, page: (prev.page || 1) - 1 }))}
                                            disabled={!data.previous}
                                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => setFilters(prev => ({ ...prev, page: (prev.page || 1) + 1 }))}
                                            disabled={!data.next}
                                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </>
                ) : (
                    <div className="text-center py-12 bg-white rounded-lg shadow">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No documents found</h3>
                        <p className="mt-1 text-sm text-gray-500">Get started by uploading a new document</p>
                        <div className="mt-6">
                            <Link
                                to="/documents/upload"
                                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Upload Document
                            </Link>
                        </div>
                    </div>
                )}
            </VStack>
        </MainLayout>
    );
};

export default DocumentsList;

