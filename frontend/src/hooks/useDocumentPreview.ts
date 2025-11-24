import { useState, useEffect } from 'react';
import { Document } from '@/types';
import { documentsApi } from '@/api/documentsApi';

/**
 * Custom hook for fetching and managing document previews
 * Handles blob URL creation, cleanup, and memory management
 * 
 * @param document - Document to preview (or null)
 * @returns Preview state with URL, loading, and error
 */
export function useDocumentPreview(document: Document | null) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Determine if document can be previewed
    const canPreview = document ? isPreviewable(document.file_extension) : false;

    useEffect(() => {
        // Early return if no document or not previewable
        if (!document || !canPreview) {
            setPreviewUrl(null);
            setIsLoading(false);
            setError(null);
            return;
        }

        let isCancelled = false;

        const fetchPreview = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const blob = await documentsApi.downloadDirectDocument(document.id);
                
                if (!isCancelled) {
                    const url = window.URL.createObjectURL(blob);
                    setPreviewUrl(url);
                    setIsLoading(false);
                }
            } catch (err) {
                if (!isCancelled) {
                    console.error('Preview fetch failed:', err);
                    setError('Failed to load preview');
                    setIsLoading(false);
                }
            }
        };

        fetchPreview();

        // Cleanup function to prevent memory leaks
        return () => {
            isCancelled = true;
            if (previewUrl) {
                window.URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
            }
        };
    }, [document?.id, document?.file_extension, canPreview]);

    return {
        previewUrl,
        isLoading,
        error,
        canPreview,
    };
}

/**
 * Check if a file extension is previewable
 */
function isPreviewable(extension: string | undefined): boolean {
    if (!extension) return false;
    
    const ext = extension.toLowerCase();
    const imageExtensions = ['png', 'jpg', 'jpeg', 'bmp', 'tiff'];
    const pdfExtensions = ['pdf'];
    
    return [...imageExtensions, ...pdfExtensions].includes(ext);
}
