import React from 'react';

/**
 * File type icons and utilities
 */

export type FileType = 'pdf' | 'image' | 'word' | 'excel' | 'csv' | 'text' | 'unknown';

/**
 * Get file type from extension
 */
export function getFileType(extension: string | undefined): FileType {
    if (!extension) return 'unknown';
    
    const ext = extension.toLowerCase().replace('.', '');
    
    if (ext === 'pdf') return 'pdf';
    if (['png', 'jpg', 'jpeg', 'bmp', 'tiff', 'gif', 'svg', 'webp'].includes(ext)) return 'image';
    if (['doc', 'docx'].includes(ext)) return 'word';
    if (['xls', 'xlsx'].includes(ext)) return 'excel';
    if (ext === 'csv') return 'csv';
    if (['txt', 'md', 'log'].includes(ext)) return 'text';
    
    return 'unknown';
}

/**
 * Get color scheme for file type
 */
export function getFileTypeColor(type: FileType): string {
    const colors = {
        pdf: 'text-red-500',
        image: 'text-blue-500',
        word: 'text-blue-600',
        excel: 'text-green-600',
        csv: 'text-green-500',
        text: 'text-gray-500',
        unknown: 'text-gray-400',
    };
    
    return colors[type];
}

/**
 * Get background color for file type
 */
export function getFileTypeBgColor(type: FileType): string {
    const colors = {
        pdf: 'bg-red-50',
        image: 'bg-blue-50',
        word: 'bg-blue-50',
        excel: 'bg-green-50',
        csv: 'bg-green-50',
        text: 'bg-gray-50',
        unknown: 'bg-gray-50',
    };
    
    return colors[type];
}

/**
 * File type icon components
 */
export const FileIcon: React.FC<{ type: FileType; className?: string }> = ({ type, className = 'w-12 h-12' }) => {
    const color = getFileTypeColor(type);
    
    switch (type) {
        case 'pdf':
            return (
                <svg className={`${className} ${color}`} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18.5,9H13V3.5L18.5,9M6,20V4H12V10H18V20H6Z" />
                </svg>
            );
        
        case 'image':
            return (
                <svg className={`${className} ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            );
        
        case 'word':
            return (
                <svg className={`${className} ${color}`} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18.5,9H13V3.5L18.5,9M7,11H17V13H7V11M7,15H17V17H7V15Z" />
                </svg>
            );
        
        case 'excel':
        case 'csv':
            return (
                <svg className={`${className} ${color}`} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18.5,9H13V3.5L18.5,9M7,11H9V13H7V11M15,11H17V13H15V11M11,11H13V13H11V11M7,15H9V17H7V15M15,15H17V17H15V15M11,15H13V17H11V15Z" />
                </svg>
            );
        
        case 'text':
            return (
                <svg className={`${className} ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            );
        
        default:
            return (
                <svg className={`${className} ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
            );
    }
};
