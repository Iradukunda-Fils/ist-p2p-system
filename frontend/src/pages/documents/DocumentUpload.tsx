import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentsApi, DocumentUploadData } from '@/api/documentsApi';
import { DocumentType } from '@/types';
import { MainLayout } from '@/components/layout/MainLayout';
import { showErrorToast, showSuccessToast } from '@/utils/errorHandler';

/**
 * Document upload component with drag-and-drop support
 */
export const DocumentUpload: React.FC = () => {
    const navigate = useNavigate();
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [formData, setFormData] = useState<{
        file: File | null;
        doc_type: DocumentType;
        title: string;
    }>({
        file: null,
        doc_type: 'OTHER',
        title: '',
    });

    // File size limit (50MB per backend config)
    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    
    // Allowed extensions per backend config
    const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.tiff'];

    const validateFile = (file: File): string | null => {
        // Check file size
        if (file.size > MAX_FILE_SIZE) {
            return `File size exceeds 50MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`;
        }

        // Check file extension
        const extension = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(extension)) {
            return `File type not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`;
        }

        return null;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const error = validateFile(file);
            
            if (error) {
                showErrorToast(error);
                return;
            }

            setFormData(prev => ({
                ...prev,
                file,
                title: prev.title || file.name.replace(/\.[^/.]+$/, ''), // Auto-fill title from filename
            }));
        }
    };

    const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            const error = validateFile(file);
            
            if (error) {
                showErrorToast(error);
                return;
            }

            setFormData(prev => ({
                ...prev,
                file,
                title: prev.title || file.name.replace(/\.[^/.]+$/, ''),
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.file) {
            showErrorToast('Please select a file to upload');
            return;
        }

        setUploading(true);

        try {
            const uploadData: DocumentUploadData = {
                file: formData.file,
                doc_type: formData.doc_type,
                title: formData.title || undefined,
            };

            const response = await documentsApi.uploadDocument(uploadData);
            
            showSuccessToast(response.message || 'Document uploaded successfully');
            navigate('/documents');
        } catch (error) {
            console.error('Upload error:', error);
            showErrorToast(error, 'Failed to upload document');
        } finally {
            setUploading(false);
        }
    };

    return (
        <MainLayout>
            <div className="max-w-2xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Upload Document</h1>
                    <p className="mt-1 text-sm text-gray-600">
                        Upload documents for proforma invoices, receipts, or other purposes
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* File Upload Area */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Document File *
                        </label>
                        
                        <div
                            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                                dragActive 
                                    ? 'border-blue-500 bg-blue-50' 
                                    : 'border-gray-300 hover:border-gray-400'
                            }`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            {formData.file ? (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-center">
                                        <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <p className="text-sm font-medium text-gray-900">{formData.file.name}</p>
                                    <p className="text-xs text-gray-500">
                                        {(formData.file.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, file: null }))}
                                        className="text-sm text-red-600 hover:text-red-700 underline"
                                    >
                                        Remove file
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    <div className="flex text-sm text-gray-600">
                                        <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                                            <span>Upload a file</span>
                                            <input
                                                id="file-upload"
                                                name="file-upload"
                                                type="file"
                                                className="sr-only"
                                                accept=".pdf,.png,.jpg,.jpeg,.tiff"
                                                onChange={handleFileChange}
                                            />
                                        </label>
                                        <p className="pl-1">or drag and drop</p>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        PDF, PNG, JPG, JPEG, TIFF up to 50MB
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Document Type */}
                    <div>
                        <label htmlFor="doc_type" className="block text-sm font-medium text-gray-700 mb-2">
                            Document Type *
                        </label>
                        <select
                            id="doc_type"
                            value={formData.doc_type}
                            onChange={(e) => setFormData(prev => ({ ...prev, doc_type: e.target.value as DocumentType }))}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            required
                        >
                            <option value="PROFORMA">Proforma Invoice</option>
                            <option value="RECEIPT">Receipt</option>
                            <option value="PO">Purchase Order</option>
                            <option value="OTHER">Other</option>
                        </select>

                    </div>

                    {/* Title */}
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                            Document Title (Optional)
                        </label>
                        <input
                            type="text"
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="e.g., Office Supplies Proforma"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            If not provided, filename will be used
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end space-x-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={() => navigate('/documents')}
                            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            disabled={uploading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={uploading || !formData.file}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
                        >
                            {uploading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Uploading...
                                </>
                            ) : (
                                'Upload Document'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </MainLayout>
    );
};

export default DocumentUpload;
