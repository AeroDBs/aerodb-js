/**
 * Storage module type definitions
 */

export type { FileObject, UploadOptions, ListOptions } from '../types';

/**
 * Download response
 */
export interface DownloadResponse {
    data: Blob | null;
    error: import('../types').AeroDBError | null;
}

/**
 * Signed URL response
 */
export interface SignedUrlResponse {
    data: {
        signedUrl: string;
    } | null;
    error: import('../types').AeroDBError | null;
}

/**
 * Bucket info
 */
export interface Bucket {
    id: string;
    name: string;
    public: boolean;
    created_at: string;
    updated_at: string;
}
