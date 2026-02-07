/**
 * StorageClient - File storage operations
 *
 * Upload, download, delete, and list files in storage buckets.
 */

import type { AeroFetch } from '../lib/fetch';
import type { AeroDBResponse, FileObject, UploadOptions, ListOptions } from '../types';

/**
 * Bucket operations for a specific bucket
 */
class BucketOperations {
    private bucketName: string;
    private storageUrl: string;
    private fetch: AeroFetch;

    constructor(bucketName: string, storageUrl: string, fetch: AeroFetch) {
        this.bucketName = bucketName;
        this.storageUrl = storageUrl;
        this.fetch = fetch;
    }

    /**
     * Upload a file to the bucket
     */
    async upload(
        path: string,
        file: Blob | ArrayBuffer,
        options: UploadOptions = {}
    ): Promise<AeroDBResponse<FileObject>> {
        const url = `${this.storageUrl}/object/${this.bucketName}/${path}`;

        const headers: Record<string, string> = {};
        if (options.contentType) {
            headers['Content-Type'] = options.contentType;
        } else if (file instanceof Blob && file.type) {
            headers['Content-Type'] = file.type;
        } else {
            headers['Content-Type'] = 'application/octet-stream';
        }
        if (options.cacheControl) {
            headers['Cache-Control'] = options.cacheControl;
        }
        if (options.upsert) {
            headers['x-upsert'] = 'true';
        }

        // Convert ArrayBuffer to Blob if needed
        const body = file instanceof Blob ? file : new Blob([file]);

        const result = await fetch(url, {
            method: 'POST',
            headers,
            body,
        });

        // Parse response
        if (!result.ok) {
            const errorData = await result.json().catch(() => ({ error: 'Upload failed' }));
            return {
                data: null,
                error: {
                    message: errorData.error || 'Upload failed',
                    status: result.status,
                },
            };
        }

        const data = await result.json() as FileObject;
        return { data, error: null };
    }

    /**
     * Download a file from the bucket
     */
    async download(path: string): Promise<{ data: Blob | null; error: import('../types').AeroDBError | null }> {
        const url = `${this.storageUrl}/object/${this.bucketName}/${path}`;

        try {
            const result = await fetch(url, { method: 'GET' });

            if (!result.ok) {
                return {
                    data: null,
                    error: {
                        message: 'Download failed',
                        status: result.status,
                    },
                };
            }

            const blob = await result.blob();
            return { data: blob, error: null };
        } catch (err) {
            return {
                data: null,
                error: {
                    message: err instanceof Error ? err.message : 'Download failed',
                    code: 'DOWNLOAD_ERROR',
                },
            };
        }
    }

    /**
     * Delete a file from the bucket
     */
    async remove(paths: string | string[]): Promise<{ error: import('../types').AeroDBError | null }> {
        const pathArray = Array.isArray(paths) ? paths : [paths];
        const url = `${this.storageUrl}/object/${this.bucketName}`;

        const result = await this.fetch(url, {
            method: 'DELETE',
            body: JSON.stringify({ prefixes: pathArray }),
        });

        return { error: result.error };
    }

    /**
     * List files in the bucket
     */
    async list(
        path: string = '',
        options: ListOptions = {}
    ): Promise<AeroDBResponse<FileObject[]>> {
        const params = new URLSearchParams();
        if (path) {
            params.set('prefix', path);
        }
        if (options.limit) {
            params.set('limit', String(options.limit));
        }
        if (options.offset) {
            params.set('offset', String(options.offset));
        }

        const url = `${this.storageUrl}/object/list/${this.bucketName}?${params}`;

        const result = await this.fetch<FileObject[]>(url, { method: 'GET' });

        return {
            data: result.data,
            error: result.error,
        };
    }

    /**
     * Create a signed URL for temporary access
     */
    async createSignedUrl(
        path: string,
        expiresIn: number
    ): Promise<{ data: { signedUrl: string } | null; error: import('../types').AeroDBError | null }> {
        const url = `${this.storageUrl}/object/sign/${this.bucketName}/${path}`;

        const result = await this.fetch<{ signedUrl: string }>(url, {
            method: 'POST',
            body: JSON.stringify({ expiresIn }),
        });

        return {
            data: result.data,
            error: result.error,
        };
    }

    /**
     * Get public URL for a file (if bucket is public)
     */
    getPublicUrl(path: string): { data: { publicUrl: string } } {
        const publicUrl = `${this.storageUrl}/object/public/${this.bucketName}/${path}`;
        return { data: { publicUrl } };
    }
}

export class StorageClient {
    private storageUrl: string;
    private fetch: AeroFetch;

    constructor(baseUrl: string, fetch: AeroFetch) {
        this.storageUrl = `${baseUrl}/storage/v1`;
        this.fetch = fetch;
    }

    /**
     * Get bucket operations for a specific bucket
     */
    from(bucket: string): BucketOperations {
        return new BucketOperations(bucket, this.storageUrl, this.fetch);
    }

    /**
     * List all buckets
     */
    async listBuckets(): Promise<AeroDBResponse<{ id: string; name: string; public: boolean }[]>> {
        const result = await this.fetch<{ id: string; name: string; public: boolean }[]>(
            `${this.storageUrl}/bucket`,
            { method: 'GET' }
        );

        return {
            data: result.data,
            error: result.error,
        };
    }

    /**
     * Create a new bucket
     */
    async createBucket(
        name: string,
        options: { public?: boolean } = {}
    ): Promise<{ error: import('../types').AeroDBError | null }> {
        const result = await this.fetch(`${this.storageUrl}/bucket`, {
            method: 'POST',
            body: JSON.stringify({
                name,
                public: options.public ?? false,
            }),
        });

        return { error: result.error };
    }
}
