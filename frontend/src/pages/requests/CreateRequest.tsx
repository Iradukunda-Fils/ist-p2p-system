import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { purchasesApi } from '@/api/purchasesApi';
import { documentsApi } from '@/api/documentsApi';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { CreateRequestData, RequestItem, Document } from '@/types';
import { formatCurrency } from '@/utils/formatters';
import { handleApiError, handleSuccess, handleInfo, validateRequired, validatePositiveNumber } from '@/utils/errorHandling';

type FormData = {
    title: string;
    description: string;
    items: Omit<RequestItem, 'id' | 'line_total'>[];
};

const CreateRequest: React.FC = () => {
    const navigate = useNavigate();
    const [calculatedTotal, setCalculatedTotal] = useState(0);
    const [selectedProforma, setSelectedProforma] = useState<string | undefined>(undefined);
    const [showProformaModal, setShowProformaModal] = useState(false);

    // Fetch available proforma documents
    const { data: proformaDocuments } = useQuery({
        queryKey: ['documents', { doc_type: 'PROFORMA' }],
        queryFn: () => documentsApi.getDocuments({ doc_type: 'PROFORMA', page_size: 100 }),
    });

    const { register, control, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
        defaultValues: {
            title: '',
            description: '',
            items: [{ name: '', quantity: 1, unit_price: '0.01', unit_of_measure: 'pieces' }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'items',
    });

    const watchItems = watch('items');

    // Calculate total whenever items change
    useEffect(() => {
        const total = watchItems.reduce((sum, item) => {
            const quantity = Number(item.quantity) || 0;
            const price = Number(item.unit_price) || 0;
            return sum + quantity * price;
        }, 0);
        setCalculatedTotal(total);
    }, [watchItems]);

    // Mutation to create request
    const createMutation = useMutation({
        mutationFn: (data: CreateRequestData) => purchasesApi.createRequest(data),
        onSuccess: (response) => {
            handleSuccess('Request created successfully!');
            navigate(`/requests/${response.request.id}`);
        },
        onError: (error: any) => {
            handleApiError(error, 'Create Request');
        },
    });

    // Handle form submit with validation
    const onSubmit = (data: FormData) => {
        // Critical validation: prevent empty items
        if (!data.items || data.items.length === 0) {
            handleApiError({ message: "Add at least one item" }, 'Form Validation');
            return;
        }

        // Critical validation: check for valid numbers
        const hasInvalidNumbers = data.items.some(item => {
            const qty = Number(item.quantity);
            const price = Number(item.unit_price);
            return isNaN(qty) || isNaN(price) || qty <= 0 || price <= 0;
        });

        if (hasInvalidNumbers) {
            handleApiError({ message: "All items must have valid quantity and price greater than 0" }, 'Form Validation');
            return;
        }

        const payload: CreateRequestData = {
            title: data.title.trim(), // Prevent whitespace-only titles
            description: data.description.trim(),
            items: data.items.map(i => ({
                name: i.name.trim(),
                quantity: Number(i.quantity),
                unit_price: String(Number(i.unit_price)),
                unit_of_measure: i.unit_of_measure?.trim() || 'pieces',
            })),
            proforma_id: selectedProforma || undefined, // Only include if selected
        };

        console.log('Payload sent to server:', payload);
        createMutation.mutate(payload);
    };

    return (
        <MainLayout>
            <div className="space-y-6">
                <div>
                    <button
                        onClick={() => navigate('/requests')}
                        className="text-sm text-gray-600 hover:text-gray-900 mb-2"
                    >
                        ← Back to Requests
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900">Create Purchase Request</h1>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Basic Info */}
                    <Card title="Basic Information">
                        <div className="space-y-4">
                            <Input
                                label="Title"
                                {...register('title', { required: 'Title is required' })}
                                error={errors.title?.message}
                                placeholder="Brief description of the request"
                            />
                            <div>
                                <label className="label">Description</label>
                                <textarea
                                    {...register('description')}
                                    className="input"
                                    rows={3}
                                    placeholder="Detailed description of what you need"
                                />
                                {errors.description && (
                                    <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Proforma Document (Optional) */}
                    <Card title="Proforma Invoice (Optional)">
                        <div className="space-y-4">
                            {selectedProforma ? (
                                <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <svg className="w-10 h-10 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    Proforma document attached
                                                </p>
                                                <p className="text-xs text-gray-600">
                                                    ID: {selectedProforma}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedProforma(undefined);
                                                handleInfo('Proforma removed');
                                            }}
                                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-sm text-gray-600">
                                        Attach a proforma invoice document to this request (optional)
                                    </p>
                                    <div className="flex space-x-3">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={() => setShowProformaModal(true)}
                                            size="sm"
                                        >
                                            Select Existing Proforma
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => window.open('/documents/upload', '_blank')}
                                            size="sm"
                                        >
                                            Upload New Proforma
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Proforma Selection Modal */}
                    {showProformaModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
                                <div className="p-6 border-b border-gray-200">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-xl font-bold text-gray-900">Select Proforma Document</h2>
                                        <button
                                            onClick={() => setShowProformaModal(false)}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                <div className="p-6 overflow-y-auto max-h-[60vh]">
                                    {proformaDocuments && proformaDocuments.results.length > 0 ? (
                                        <div className="space-y-2">
                                            {proformaDocuments.results.map((doc: Document) => (
                                                <button
                                                    key={doc.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedProforma(doc.id);
                                                        setShowProformaModal(false);
                                                        handleSuccess(`Selected: ${doc.title || doc.original_filename}`);
                                                    }}
                                                    className="w-full text-left p-4 border border-gray-200 hover:border-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                >
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                            </svg>
                                                        </div>
                                                        <div className="ml-4">
                                                            <p className="text-sm font-medium text-gray-900">
                                                                {doc.title || doc.original_filename}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                            </svg>
                                            <p className="mt-2 text-sm text-gray-600">No proforma documents found</p>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    window.open('/documents/upload', '_blank');
                                                    setShowProformaModal(false);
                                                }}
                                                className="mt-4 text-sm text-blue-600 hover:text-blue-700 underline"
                                            >
                                                Upload a proforma first
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Items */}
                    <Card
                        title="Items"
                        actions={
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => append({ name: '', quantity: 1, unit_price: '0.01', unit_of_measure: 'pieces' })}
                            >
                                + Add Item
                            </Button>
                        }
                    >
                        <div className="space-y-4">
                            {fields.map((field, index) => (
                                <div key={field.id} className="border border-gray-200 p-4 rounded-md">
                                    <div className="flex justify-between items-start mb-3">
                                        <h4 className="text-sm font-medium text-gray-700">Item {index + 1}</h4>
                                        {fields.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => remove(index)}
                                                className="text-red-600 hover:text-red-800 text-sm"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <Input
                                                label="Item Name"
                                                {...register(`items.${index}.name`, { required: 'Item name is required' })}
                                                error={errors.items?.[index]?.name?.message}
                                                placeholder="e.g., Printer Paper A4"
                                            />
                                        </div>
                                        <Input
                                            label="Quantity"
                                            type="number"
                                            min={1}
                                            {...register(`items.${index}.quantity`, {
                                                required: 'Quantity is required',
                                                min: { value: 1, message: 'Quantity must be at least 1' },
                                                valueAsNumber: true,
                                            })}
                                            error={errors.items?.[index]?.quantity?.message}
                                        />
                                        <Input
                                            label="Unit Price"
                                            type="number"
                                            step={0.01}
                                            min={0.01}
                                            {...register(`items.${index}.unit_price`, {
                                                required: 'Unit price is required',
                                                min: { value: 0.01, message: 'Price must be greater than 0' },
                                                valueAsNumber: true,
                                            })}
                                            error={errors.items?.[index]?.unit_price?.message}
                                        />
                                        <Input
                                            label="Unit of Measure"
                                            {...register(`items.${index}.unit_of_measure`)}
                                            placeholder="e.g., pieces, boxes, reams"
                                        />
                                        <div>
                                            <label className="label">Line Total</label>
                                            <div className="text-lg font-semibold text-gray-900">
                                                {formatCurrency(
                                                    (Number(watchItems[index]?.quantity) || 0) *
                                                    (Number(watchItems[index]?.unit_price) || 0)
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Summary */}
                    <Card>
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm text-gray-600">Total Amount</p>
                                <p className="text-3xl font-bold text-gray-900">{formatCurrency(calculatedTotal)}</p>
                            </div>
                            <div className="space-x-3">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => navigate('/requests')}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    isLoading={createMutation.isPending}
                                >
                                    Create Request
                                </Button>
                            </div>
                        </div>
                    </Card>
                </form>
            </div>
        </MainLayout>
    );
};

export default CreateRequest;
