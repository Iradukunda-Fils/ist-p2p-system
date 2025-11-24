/**
 * File Upload Debugging Utilities
 * Use these functions to diagnose file upload issues
 */

import { documentsApi } from '@/api/documentsApi';
import { FILE_UPLOAD } from './constants';

export interface UploadTestResult {
    success: boolean;
    error?: string;
    details?: any;
    timing?: {
        start: number;
        end: number;
        duration: number;
    };
}

/**
 * Test file upload with detailed logging
 */
export async function testFileUpload(file: File): Promise<UploadTestResult> {
    const start = Date.now();
    
    console.group('🔍 File Upload Debug Test');
    console.log('File details:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified).toISOString(),
    });

    try {
        // Validate file before upload
        const validation = validateFileForUpload(file);
        if (!validation.valid) {
            console.error('❌ File validation failed:', validation.errors);
            return {
                success: false,
                error: `Validation failed: ${validation.errors.join(', ')}`,
                timing: { start, end: Date.now(), duration: Date.now() - start }
            };
        }

        console.log('✅ File validation passed');

        // Test upload
        console.log('📤 Starting upload...');
        const result = await documentsApi.uploadDocument({
            file,
            doc_type: 'OTHER',
            title: `Test Upload - ${file.name}`,
        });

        const end = Date.now();
        console.log('✅ Upload successful:', result);
        console.groupEnd();

        return {
            success: true,
            details: result,
            timing: { start, end, duration: end - start }
        };

    } catch (error: any) {
        const end = Date.now();
        console.error('❌ Upload failed:', error);
        
        // Detailed error analysis
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
            console.error('Response headers:', error.response.headers);
        } else if (error.request) {
            console.error('Request made but no response:', error.request);
        } else {
            console.error('Error setting up request:', error.message);
        }
        
        console.groupEnd();

        return {
            success: false,
            error: error.message || 'Unknown error',
            details: {
                status: error.response?.status,
                data: error.response?.data,
                code: error.code,
            },
            timing: { start, end, duration: end - start }
        };
    }
}

/**
 * Validate file for upload
 */
export function validateFileForUpload(file: File): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check file size
    if (file.size > FILE_UPLOAD.MAX_SIZE) {
        errors.push(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds limit of ${FILE_UPLOAD.MAX_SIZE / 1024 / 1024}MB`);
    }

    // Check file type
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/tiff'];
    if (!allowedTypes.includes(file.type)) {
        errors.push(`File type ${file.type} not allowed. Allowed: ${allowedTypes.join(', ')}`);
    }

    // Check file extension
    const fileName = file.name.toLowerCase();
    const hasValidExtension = FILE_UPLOAD.ALLOWED_EXTENSIONS.some(ext => 
        fileName.endsWith(ext.toLowerCase())
    );
    
    if (!hasValidExtension) {
        errors.push(`File extension not allowed. Allowed: ${FILE_UPLOAD.ALLOWED_EXTENSIONS.join(', ')}`);
    }

    // Check if file is empty
    if (file.size === 0) {
        errors.push('File is empty');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Test network connectivity to upload endpoint
 */
export async function testUploadEndpoint(): Promise<UploadTestResult> {
    console.group('🌐 Upload Endpoint Test');
    
    try {
        // Test with a simple GET request to see if endpoint is reachable
        const response = await fetch('/api/documents/', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
            },
        });

        console.log('Endpoint response status:', response.status);
        console.log('Endpoint response headers:', Object.fromEntries(response.headers.entries()));

        if (response.ok) {
            console.log('✅ Upload endpoint is reachable');
            console.groupEnd();
            return { success: true };
        } else {
            const errorText = await response.text();
            console.error('❌ Endpoint returned error:', errorText);
            console.groupEnd();
            return { 
                success: false, 
                error: `Endpoint returned ${response.status}: ${errorText}` 
            };
        }
    } catch (error: any) {
        console.error('❌ Network error:', error);
        console.groupEnd();
        return { 
            success: false, 
            error: `Network error: ${error.message}` 
        };
    }
}

/**
 * Create a test file for upload testing
 */
export function createTestFile(sizeKB: number = 100): File {
    const content = 'x'.repeat(sizeKB * 1024);
    return new File([content], `test-file-${sizeKB}kb.txt`, {
        type: 'text/plain',
        lastModified: Date.now(),
    });
}

/**
 * Run comprehensive upload diagnostics
 */
export async function runUploadDiagnostics(): Promise<{
    endpointTest: UploadTestResult;
    smallFileTest?: UploadTestResult;
    validationTest: { valid: boolean; errors: string[] };
}> {
    console.group('🔧 Upload Diagnostics');
    
    // Test endpoint connectivity
    console.log('1. Testing endpoint connectivity...');
    const endpointTest = await testUploadEndpoint();
    
    // Test file validation
    console.log('2. Testing file validation...');
    const testFile = createTestFile(100); // 100KB test file
    const validationTest = validateFileForUpload(testFile);
    
    let smallFileTest: UploadTestResult | undefined;
    
    if (endpointTest.success && validationTest.valid) {
        console.log('3. Testing small file upload...');
        smallFileTest = await testFileUpload(testFile);
    } else {
        console.log('3. Skipping file upload test due to previous failures');
    }
    
    console.groupEnd();
    
    return {
        endpointTest,
        smallFileTest,
        validationTest,
    };
}

/**
 * Log system information for debugging
 */
export function logSystemInfo(): void {
    console.group('💻 System Information');
    console.log('User Agent:', navigator.userAgent);
    console.log('Platform:', navigator.platform);
    console.log('Language:', navigator.language);
    console.log('Online:', navigator.onLine);
    console.log('Cookie Enabled:', navigator.cookieEnabled);
    console.log('Current URL:', window.location.href);
    console.log('Referrer:', document.referrer);
    console.log('Screen Resolution:', `${screen.width}x${screen.height}`);
    console.log('Viewport Size:', `${window.innerWidth}x${window.innerHeight}`);
    console.log('Local Storage Available:', typeof Storage !== 'undefined');
    console.log('File API Support:', 'File' in window && 'FileReader' in window && 'FileList' in window && 'Blob' in window);
    console.log('FormData Support:', 'FormData' in window);
    console.log('Fetch Support:', 'fetch' in window);
    console.groupEnd();
}

// Export for use in browser console
if (typeof window !== 'undefined') {
    (window as any).uploadDebugger = {
        testFileUpload,
        validateFileForUpload,
        testUploadEndpoint,
        createTestFile,
        runUploadDiagnostics,
        logSystemInfo,
    };
}