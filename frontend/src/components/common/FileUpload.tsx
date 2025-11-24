import React, { useRef, useState } from 'react';
import clsx from 'clsx';
import { FILE_UPLOAD } from '@/utils/constants';
import { validateFileSize, validateFileType } from '@/utils/validationUtils';

interface FileUploadProps {
    onFileSelect: (file: File) => void;
    accept?: string;
    maxSize?: number; // in bytes
    isLoading?: boolean;
    label?: string;
    error?: string;
    allowedTypes?: string[];
    showProgress?: boolean;
    uploadProgress?: number;
}

export const FileUpload: React.FC<FileUploadProps> = ({
    onFileSelect,
    accept = 'application/pdf,image/*',
    maxSize = FILE_UPLOAD.MAX_SIZE,
    isLoading = false,
    label = 'Upload File',
    error,
    allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/tiff'],
    showProgress = false,
    uploadProgress = 0,
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [localError, setLocalError] = useState<string | null>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const validateAndSetFile = (file: File) => {
        setLocalError(null);

        // Validate file size
        const sizeValidation = validateFileSize(file, maxSize / (1024 * 1024));
        if (!sizeValidation.isValid) {
            setLocalError(sizeValidation.error || 'File size validation failed');
            return;
        }

        // Validate file type
        const typeValidation = validateFileType(file, allowedTypes);
        if (!typeValidation.isValid) {
            setLocalError(typeValidation.error || 'File type validation failed');
            return;
        }

        // Additional file extension validation
        const fileName = file.name.toLowerCase();
        const hasValidExtension = FILE_UPLOAD.ALLOWED_EXTENSIONS.some(ext =>
            fileName.endsWith(ext.toLowerCase())
        );

        if (!hasValidExtension) {
            setLocalError(`File type not supported. Allowed: ${FILE_UPLOAD.ALLOWED_EXTENSIONS.join(', ')}`);
            return;
        }

        setSelectedFile(file);
        onFileSelect(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndSetFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            validateAndSetFile(e.target.files[0]);
        }
    };

    const triggerInput = () => {
        if (!isLoading) {
            inputRef.current?.click();
        }
    };

    const clearFile = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedFile(null);
        setLocalError(null);
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="w-full">
            <div
                className={clsx(
                    'relative border-2 border-dashed rounded-lg p-6 text-center transition-colors',
                    !isLoading && 'cursor-pointer',
                    dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400',
                    error || localError ? 'border-red-500 bg-red-50' : '',
                    isLoading ? 'opacity-50 pointer-events-none' : ''
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={triggerInput}
            >
                <input
                    ref={inputRef}
                    type="file"
                    className="hidden"
                    accept={accept}
                    onChange={handleChange}
                    disabled={isLoading}
                />

                {isLoading && showProgress ? (
                    <div className="space-y-3">
                        <div className="flex items-center justify-center">
                            <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>
                        <div className="text-sm text-gray-600">
                            Uploading... {uploadProgress}%
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            ></div>
                        </div>
                        {selectedFile && (
                            <div className="text-xs text-gray-500">
                                {selectedFile.name} ({formatFileSize(selectedFile.size)})
                            </div>
                        )}
                    </div>
                ) : selectedFile ? (
                    <div className="flex items-center justify-center space-x-2">
                        <div className="flex items-center space-x-2">
                            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-900 truncate max-w-xs">
                                {selectedFile.name}
                            </span>
                            <span className="text-xs text-gray-500">
                                ({formatFileSize(selectedFile.size)})
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={clearFile}
                            className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors"
                            disabled={isLoading}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="text-sm text-gray-600">
                            <span className="font-medium text-indigo-600 hover:text-indigo-500">
                                {label}
                            </span>
                            <span className="pl-1">or drag and drop</span>
                        </div>
                        <p className="text-xs text-gray-500">
                            PDF, PNG, JPG, TIFF up to {Math.round(maxSize / (1024 * 1024))}MB
                        </p>
                    </div>
                )}
            </div>

            {(error || localError) && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center">
                        <svg className="w-4 h-4 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm text-red-600">
                            {error || localError}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
