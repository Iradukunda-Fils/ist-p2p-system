import React, { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { purchasesApi } from '@/api/purchasesApi';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { ApprovalTimeline } from '@/components/requests/ApprovalTimeline';
import { ReceiptSection } from '@/components/requests/ReceiptSection';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import { useAuthStore } from '@/store/authStore';
import { APPROVAL_THRESHOLDS } from '@/utils/constants';
import { useModal, useApproval, useReceipt } from '@/hooks';

const RequestDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();

    // Modals
    const approveModal = useModal();
    const rejectModal = useModal();

    // Fetch request data
    const { data: request, isLoading } = useQuery({
        queryKey: ['request', id],
        queryFn: () => purchasesApi.getRequest(id!),
        enabled: !!id,
    });

    // Approval hook
    const approval = useApproval({
        requestId: id!,
        onSuccess: () => {
            approveModal.close();
            rejectModal.close();
        },
    });

    // Receipt hook
    const receipt = useReceipt({
        requestId: id!,
        isApproved: request?.status === 'APPROVED',
    });

    // Determine user permissions
    const isApprover = user?.role === 'approver_lvl1' || user?.role === 'approver_lvl2' || user?.role === 'admin';
    const canApproveLevel2 = user?.role === 'approver_lvl2' || user?.role === 'admin';

    // Calculate approval level
    const requestAmount = request ? parseFloat(request.amount) : 0;
    const requiresLevel2 = requestAmount > APPROVAL_THRESHOLDS.LEVEL_1_MAX;
    const approvalLevel = requiresLevel2 && canApproveLevel2 ? 2 : 1;

    // Determine if action buttons should be shown
    const showApproveButton = request?.status === 'PENDING' && isApprover;

    // Handle approve click
    const handleApprove = useCallback(() => {
        approval.approve(approvalLevel);
    }, [approval, approvalLevel]);

    // Handle reject click
    const handleReject = useCallback(() => {
        approval.reject(canApproveLevel2 ? 2 : 1);
    }, [approval, canApproveLevel2]);

    // Keyboard support for modals
    const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            action();
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
    if (!request) {
        return (
            <MainLayout>
                <div className="text-center py-12">
                    <p className="text-gray-600">Request not found</p>
                    <Button className="mt-4" onClick={() => navigate('/requests')}>
                        Back to Requests
                    </Button>
                </div>
            </MainLayout>
        );
    }

    // Check if user can upload receipts
    const canUploadReceipt = request.created_by.id === user?.id || user?.role === 'finance';

    return (
        <MainLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <button
                            onClick={() => navigate('/requests')}
                            className="text-sm text-gray-600 hover:text-gray-900 mb-2"
                            aria-label="Back to requests list"
                        >
                            ← Back to Requests
                        </button>
                        <h1 className="text-3xl font-bold text-gray-900">{request.title}</h1>
                    </div>
                    <StatusBadge status={request.status} />
                </div>

                {/* Request Info */}
                <Card title="Request Information">
                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Request ID</dt>
                            <dd className="mt-1 text-sm text-gray-900">{request.id}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Amount</dt>
                            <dd className="mt-1 text-sm text-gray-900 font-semibold">{formatCurrency(request.amount)}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Created By</dt>
                            <dd className="mt-1 text-sm text-gray-900">{request.created_by.username}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Created Date</dt>
                            <dd className="mt-1 text-sm text-gray-900">{formatDateTime(request.created_at)}</dd>
                        </div>
                        {request.description && (
                            <div className="sm:col-span-2">
                                <dt className="text-sm font-medium text-gray-500">Description</dt>
                                <dd className="mt-1 text-sm text-gray-900">{request.description}</dd>
                            </div>
                        )}
                    </dl>
                </Card>

                {/* Items */}
                <Card title="Items">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {request.items.map((item, index) => (
                                    <tr key={item.id || index}>
                                        <td className="px-6 py-4 text-sm text-gray-900">{item.name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{item.quantity}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{formatCurrency(item.unit_price)}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                            {formatCurrency(item.line_total || '0')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Approval Timeline */}
                {request.approvals.length > 0 && (
                    <Card title="Approval History">
                        <ApprovalTimeline approvals={request.approvals} />
                    </Card>
                )}

                {/* Receipts & Validation */}
                {request.status === 'APPROVED' && (
                    <Card title="Receipts & Validation">
                        <ReceiptSection
                            validationResults={receipt.validationStatus?.validation_results}
                            canUpload={canUploadReceipt}
                            onUpload={receipt.uploadReceipt}
                            isUploading={receipt.isUploading}
                        />
                    </Card>
                )}

                {/* Actions */}
                {showApproveButton && (
                    <Card>
                        <div className="flex space-x-3">
                            <Button 
                                onClick={approveModal.open}
                                disabled={approval.isApproving || approval.isRejecting}
                                aria-label="Open approve request dialog"
                            >
                                {approval.isApproving ? 'Approving...' : 'Approve Request'}
                            </Button>
                            <Button 
                                variant="danger" 
                                onClick={rejectModal.open}
                                disabled={approval.isApproving || approval.isRejecting}
                                aria-label="Open reject request dialog"
                            >
                                {approval.isRejecting ? 'Rejecting...' : 'Reject Request'}
                            </Button>
                        </div>
                    </Card>
                )}
            </div>

            {/* Approve Modal */}
            <Modal
                isOpen={approveModal.isOpen}
                onClose={() => {
                    approveModal.close();
                    approval.reset();
                }}
                title="Approve Request"
            >
                <div className="space-y-4" onKeyDown={(e) => handleKeyDown(e, handleApprove)}>
                    <p className="text-sm text-gray-600">
                        You are about to approve this request at level {approvalLevel}. 
                        Please provide a comment (optional).
                    </p>
                    <Input
                        label="Comment"
                        value={approval.comment}
                        onChange={(e) => approval.setComment(e.target.value)}
                        placeholder="Add your approval comment..."
                        aria-label="Approval comment"
                    />
                    <div className="flex justify-end space-x-3">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                approveModal.close();
                                approval.reset();
                            }}
                            disabled={approval.isApproving}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleApprove}
                            isLoading={approval.isApproving}
                            disabled={approval.isApproving}
                        >
                            {approval.isApproving ? 'Approving...' : 'Approve'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Reject Modal */}
            <Modal
                isOpen={rejectModal.isOpen}
                onClose={() => {
                    rejectModal.close();
                    approval.reset();
                }}
                title="Reject Request"
            >
                <div className="space-y-4" onKeyDown={(e) => handleKeyDown(e, handleReject)}>
                    <p className="text-sm text-gray-600">
                        You are about to reject this request. Please provide a reason.
                    </p>
                    <Input
                        label="Reason"
                        value={approval.comment}
                        onChange={(e) => approval.setComment(e.target.value)}
                        placeholder="Explain why you're rejecting..."
                        required
                        aria-label="Rejection reason"
                        aria-required="true"
                    />
                    <div className="flex justify-end space-x-3">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                rejectModal.close();
                                approval.reset();
                            }}
                            disabled={approval.isRejecting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleReject}
                            isLoading={approval.isRejecting}
                            disabled={!approval.comment.trim() || approval.isRejecting}
                        >
                            {approval.isRejecting ? 'Rejecting...' : 'Reject'}
                        </Button>
                    </div>
                </div>
            </Modal>

        </MainLayout>
    );
};

export default RequestDetail;
