import React, { useRef, useState } from 'react';
import clsx from 'clsx';
import { FILE_UPLOAD } from '@/utils/constants';

interface FileUploadProps {
    onFileSelect: (file: File) => void;
    accept?: string;
    maxSize?: number; // in bytes
    isLoading?: boolean;
    label?: string;
    error?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
    onFileSelect,
    accept = 'application/pdf,image/*',
    maxSize = FILE_UPLOAD.MAX_SIZE,
    isLoading = false,
    label = 'Upload File',
    error,
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
        
        if (file.size > maxSize) {
            setLocalError(`File size exceeds ${maxSize / (1024 * 1024)}MB limit.`);
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
        inputRef.current?.click();
    };

    const clearFile = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedFile(null);
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    return (
        <div className="w-full">
            <div
                className={clsx(
                    'relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
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

                {selectedFile ? (
                    <div className="flex items-center justify-center space-x-2">
                        <span className="text-sm font-medium text-gray-900 truncate max-w-xs">
                            {selectedFile.name}
                        </span>
                        <span className="text-xs text-gray-500">
                            ({(selectedFile.size / 1024).toFixed(1)} KB)
                        </span>
                        <button
                            type="button"
                            onClick={clearFile}
                            className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors"
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
                            PDF, PNG, JPG up to {maxSize / (1024 * 1024)}MB
                        </p>
                    </div>
                )}
            </div>
            
            {(error || localError) && (
                <p className="mt-2 text-sm text-red-600">
                    {error || localError}
                </p>
            )}
        </div>
    );
};
