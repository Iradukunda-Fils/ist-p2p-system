import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi } from '@/api/documentsApi';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { FileCard, FilePreviewModal } from '@/components/documents';
import { formatDateTime, formatFileSize } from '@/utils/formatters';
import { getStatusVariant, copyToClipboard } from '@/utils/codeCleanup';
import { useAuthStore } from '@/store/authStore';
import { useDocumentPreview } from '@/hooks';
import { DocumentType } from '@/types';

const DocumentDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    // State
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState<string | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [editedTitle, setEditedTitle] = useState('');
    const [editedDocType, setEditedDocType] = useState<DocumentType>('OTHER');

    // Fetch document data
    const { data: document, isLoading } = useQuery({
        queryKey: ['document', id],
        queryFn: () => documentsApi.getDocument(id!),
        enabled: !!id,
    });

    // Document preview hook (handles blob URL management)
    const { previewUrl, isLoading: isPreviewLoading, canPreview } = useDocumentPreview(document || null);

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: (data: { title?: string; doc_type?: DocumentType }) =>
            documentsApi.updateDocument(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['document', id] });
            setIsEditModalOpen(false);
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: () => documentsApi.deleteDocument(id!),
        onSuccess: () => {
            navigate('/documents');
        },
    });

    // Reprocess mutation
    const reprocessMutation = useMutation({
        mutationFn: () => documentsApi.reprocessDocument(id!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['document', id] });
        },
    });

    // Handle download
    const handleDownload = async () => {
        if (!id) return;
        setIsDownloading(true);
        setDownloadError(null);
        try {
            const blob = await documentsApi.downloadDirectDocument(id);
            const url = window.URL.createObjectURL(blob);
            const link = window.document.createElement('a');
            link.href = url;
            link.download = document?.original_filename || 'document';
            window.document.body.appendChild(link);
            link.click();
            window.document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            setDownloadError('Failed to download document. Please try again.');
            console.error('Download failed:', error);
        } finally {
            setIsDownloading(false);
        }
    };

    // Handle edit
    const handleEditClick = () => {
        if (document) {
            setEditedTitle(document.title || '');
            setEditedDocType(document.doc_type);
            setIsEditModalOpen(true);
        }
    };

    const handleSaveEdit = () => {
        updateMutation.mutate({
            title: editedTitle,
            doc_type: editedDocType,
        });
    };

    // Handle delete
    const handleDelete = () => {
        deleteMutation.mutate();
    };

    // Permissions
    const canEdit = document && (document.uploaded_by.username === user?.username || user?.role === 'admin');
    const canDelete = user?.role === 'admin';
    const canReprocess = user?.role === 'admin';

    // Utility functions
    const getStatusMessage = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return '✓ Document processed successfully';
            case 'FAILED':
                return '✗ Document processing failed';
            case 'PROCESSING':
                return '⏳ Processing in progress...';
            case 'PENDING':
                return '⏸ Waiting to be processed';
            default:
                return status;
        }
    };

    const copyHash = async () => {
        if (document?.file_hash) {
            const success = await copyToClipboard(document.file_hash);
            if (success) {
                // Could add toast notification here
                console.log('Hash copied to clipboard');
            }
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <MainLayout>
                <div className="flex justify-center py-12">
                    <Spinner size="lg" />
                </div>
            </MainLayout>
        );
    }

    // Not found state
    if (!document) {
        return (
            <MainLayout>
                <div className="text-center py-12">
                    <p className="text-gray-600">Document not found</p>
                    <Button className="mt-4" onClick={() => navigate('/documents')}>
                        Back to Documents
                    </Button>
                </div>
            </MainLayout>
        );
    }



    return (
        <MainLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <button
                            onClick={() => navigate('/documents')}
                            className="text-sm text-gray-600 hover:text-gray-900 mb-2"
                            aria-label="Back to documents list"
                        >
                            ← Back to Documents
                        </button>
                        <h1 className="text-3xl font-bold text-gray-900">
                            {document.title || document.original_filename}
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">{getStatusMessage(document.processing_status)}</p>
                    </div>
                    <StatusBadge status={getStatusVariant(document.processing_status)} />
                </div>

                {/* Document File Card - NEW */}
                {document && (
                    <Card title="Document File">
                        <FileCard
                            document={document}
                            onDownload={handleDownload}
                            onEdit={canEdit ? handleEditClick : undefined}
                            onDelete={canDelete ? () => setIsDeleteModalOpen(true) : undefined}
                            onPreview={canPreview ? () => setIsPreviewModalOpen(true) : undefined}
                        />
                    </Card>
                )}

                {/* Document Info */}
                <Card title="Document Information">
                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Document ID</dt>
                            <dd className="mt-1 text-sm text-gray-900">{document.id}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">File Name</dt>
                            <dd className="mt-1 text-sm text-gray-900">{document.original_filename}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Document Type</dt>
                            <dd className="mt-1 text-sm text-gray-900 uppercase">{document.doc_type}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">File Size</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {formatFileSize(document.file_size)}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Uploaded By</dt>
                            <dd className="mt-1 text-sm text-gray-900">{document.uploaded_by.username}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Upload Date</dt>
                            <dd className="mt-1 text-sm text-gray-900">{formatDateTime(document.created_at)}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Processing Status</dt>
                            <dd className="mt-1 text-sm text-gray-900">{document.processing_status}</dd>
                        </div>
                        {document.processed_at && (
                            <div>
                                <dt className="text-sm font-medium text-gray-500">Processed Date</dt>
                                <dd className="mt-1 text-sm text-gray-900">{formatDateTime(document.processed_at)}</dd>
                            </div>
                        )}
                        {document.file_extension && (
                            <div>
                                <dt className="text-sm font-medium text-gray-500">File Extension</dt>
                                <dd className="mt-1 text-sm text-gray-900 uppercase">{document.file_extension}</dd>
                            </div>
                        )}
                        {document.file_hash && (
                            <div className="sm:col-span-2">
                                <dt className="text-sm font-medium text-gray-500">File Hash (SHA-256)</dt>
                                <dd className="mt-1 text-xs text-gray-600 font-mono break-all flex items-center justify-between">
                                    <span>{document.file_hash}</span>
                                    <button
                                        onClick={copyHash}
                                        className="ml-2 text-blue-600 hover:text-blue-800 text-xs font-sans"
                                        title="Copy hash"
                                    >
                                        Copy
                                    </button>
                                </dd>
                            </div>
                        )}
                    </dl>
                </Card>

                {/* Extracted Text */}
                {document.extracted_text && (
                    <Card title="Extracted Text">
                        <div className="bg-gray-50 p-4 rounded-md max-h-96 overflow-y-auto">
                            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">
                                {document.extracted_text}
                            </pre>
                        </div>
                    </Card>
                )}

                {/* Metadata */}
                {document.metadata && Object.keys(document.metadata).length > 0 && (
                    <Card title="Extracted Metadata">
                        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {Object.entries(document.metadata).map(([key, value]) => (
                                <div key={key}>
                                    <dt className="text-sm font-medium text-gray-500 capitalize">
                                        {key.replace(/_/g, ' ')}
                                    </dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {typeof value === 'object' ? (
                                            <pre className="text-xs bg-gray-50 p-2 rounded">
                                                {JSON.stringify(value, null, 2)}
                                            </pre>
                                        ) : (
                                            String(value)
                                        )}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </Card>
                )}

                {/* Processing Error */}
                {document.processing_error && (
                    <Card title="Processing Error">
                        <div className="bg-red-50 border border-red-200 p-4 rounded-md">
                            <p className="text-sm text-red-800">{document.processing_error}</p>
                        </div>
                    </Card>
                )}

                {/* Download Error */}
                {downloadError && (
                    <div className="bg-red-50 border border-red-200 p-4 rounded-md">
                        <p className="text-sm text-red-800">{downloadError}</p>
                    </div>
                )}

                {/* Actions */}
                <Card>
                    <div className="flex flex-wrap gap-3">
                        <Button onClick={handleDownload} isLoading={isDownloading} disabled={isDownloading}>
                            {isDownloading ? 'Downloading...' : 'Download Document'}
                        </Button>
                        {canEdit && (
                            <Button variant="secondary" onClick={handleEditClick}>
                                Edit Metadata
                            </Button>
                        )}
                        {canReprocess && document.processing_status === 'FAILED' && (
                            <Button
                                variant="secondary"
                                onClick={() => reprocessMutation.mutate()}
                                isLoading={reprocessMutation.isPending}
                                disabled={reprocessMutation.isPending}
                            >
                                {reprocessMutation.isPending ? 'Reprocessing...' : 'Reprocess Document'}
                            </Button>
                        )}
                        {canDelete && (
                            <Button
                                variant="danger"
                                onClick={() => setIsDeleteModalOpen(true)}
                            >
                                Delete Document
                            </Button>
                        )}
                    </div>
                </Card>
            </div>

            {/* Edit Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit Document Metadata"
            >
                <div className="space-y-4">
                    <Input
                        label="Title"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        placeholder="Enter document title"
                    />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Document Type
                        </label>
                        <select
                            value={editedDocType}
                            onChange={(e) => setEditedDocType(e.target.value as DocumentType)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="PROFORMA">Proforma Invoice</option>
                            <option value="RECEIPT">Receipt</option>
                            <option value="PO">Purchase Order</option>
                            <option value="INVOICE">Invoice</option>
                            <option value="CONTRACT">Contract</option>
                            <option value="OTHER">Other</option>
                        </select>
                    </div>
                    <div className="flex justify-end space-x-3">
                        <Button
                            variant="secondary"
                            onClick={() => setIsEditModalOpen(false)}
                            disabled={updateMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveEdit}
                            isLoading={updateMutation.isPending}
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Delete Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Document"
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                        Are you sure you want to delete this document? This action cannot be undone.
                    </p>
                    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md">
                        <p className="text-sm text-yellow-800">
                            <strong>Warning:</strong> The document file will be permanently deleted from the system.
                        </p>
                    </div>
                    <div className="flex justify-end space-x-3">
                        <Button
                            variant="secondary"
                            onClick={() => setIsDeleteModalOpen(false)}
                            disabled={deleteMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleDelete}
                            isLoading={deleteMutation.isPending}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete Document'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* File Preview Modal */}
            <FilePreviewModal
                isOpen={isPreviewModalOpen}
                onClose={() => setIsPreviewModalOpen(false)}
                document={document || null}
                previewUrl={previewUrl}
                onDownload={handleDownload}
            />
        </MainLayout>
    );
};

export default DocumentDetail;
