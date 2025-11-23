import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '@/api/ordersApi';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import { toast } from 'react-toastify';

const OrderDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: order, isLoading } = useQuery({
        queryKey: ['order', id],
        queryFn: () => ordersApi.getOrder(id!),
        enabled: !!id,
    });

    const generatePdfMutation = useMutation({
        mutationFn: () => ordersApi.generatePDF(id!),
        onSuccess: () => {
            toast.success('PDF generated successfully!');
            queryClient.invalidateQueries({ queryKey: ['order', id] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error?.message || 'Failed to generate PDF');
        },
    });

    if (isLoading) {
        return (
            <MainLayout>
                <div className="flex justify-center py-12">
                    <Spinner size="lg" />
                </div>
            </MainLayout>
        );
    }

    if (!order) {
        return (
            <MainLayout>
                <div className="text-center py-12">
                    <p className="text-gray-600">Order not found</p>
                    <Button className="mt-4" onClick={() => navigate('/orders')}>
                        Back to Orders
                    </Button>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <button
                            onClick={() => navigate('/orders')}
                            className="text-sm text-gray-600 hover:text-gray-900 mb-2"
                        >
                            ← Back to Orders
                        </button>
                        <h1 className="text-3xl font-bold text-gray-900">{order.po_number}</h1>
                    </div>
                    <div className="flex space-x-3">
                        <Button
                            onClick={() => generatePdfMutation.mutate()}
                            isLoading={generatePdfMutation.isPending}
                        >
                            Generate PDF
                        </Button>
                    </div>
                </div>

                {/* Order Info */}
                <Card title="Purchase Order Information">
                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <dt className="text-sm font-medium text-gray-500">PO Number</dt>
                            <dd className="mt-1 text-sm text-gray-900 font-medium">{order.po_number}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Status</dt>
                            <dd className="mt-1">
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                    {order.status}
                                </span>
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Vendor</dt>
                            <dd className="mt-1 text-sm text-gray-900">{order.vendor}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Vendor Contact</dt>
                            <dd className="mt-1 text-sm text-gray-900">{order.vendor_contact || 'N/A'}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
                            <dd className="mt-1 text-sm text-gray-900 font-semibold text-lg">{formatCurrency(order.total)}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Created Date</dt>
                            <dd className="mt-1 text-sm text-gray-900">{formatDateTime(order.created_at)}</dd>
                        </div>
                    </dl>
                </Card>

                {/* Related Request */}
                <Card title="Related Purchase Request">
                    <div className="space-y-2">
                        <p className="text-sm">
                            <span className="font-medium text-gray-500">Request Title:</span>{' '}
                            <span className="text-gray-900">{order.request.title}</span>
                        </p>
                        <p className="text-sm">
                            <span className="font-medium text-gray-500">Created By:</span>{' '}
                            <span className="text-gray-900">{order.request.created_by.username}</span>
                        </p>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => navigate(`/requests/${order.request.id}`)}
                        >
                            View Request
                        </Button>
                    </div>
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
                                {order.metadata.items.map((item, index) => (
                                    <tr key={index}>
                                        <td className="px-6 py-4 text-sm text-gray-900">{item.name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{item.quantity}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{formatCurrency(item.unit_price)}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                            {formatCurrency(item.line_total || '0')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-50">
                                <tr>
                                    <td colSpan={3} className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                                        Total
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-900">
                                        {formatCurrency(order.total)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </Card>

                {/* Terms */}
                {order.metadata.terms && (
                    <Card title="Terms & Conditions">
                        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {order.metadata.terms.payment_terms && (
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Payment Terms</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{order.metadata.terms.payment_terms}</dd>
                                </div>
                            )}
                            {order.metadata.terms.delivery_terms && (
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Delivery Terms</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{order.metadata.terms.delivery_terms}</dd>
                                </div>
                            )}
                        </dl>
                    </Card>
                )}
            </div>
        </MainLayout>
    );
};

export default OrderDetail;
