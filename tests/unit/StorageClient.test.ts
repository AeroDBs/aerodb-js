/**
 * StorageClient Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StorageClient } from '../../src/storage/StorageClient';
import type { AeroFetch } from '../../src/lib/fetch';

// Mock fetch
const createMockFetch = (): AeroFetch => {
    return vi.fn().mockResolvedValue({
        data: null,
        error: null,
        status: 200,
    });
};

describe('StorageClient', () => {
    let mockFetch: AeroFetch;
    let storageClient: StorageClient;

    beforeEach(() => {
        mockFetch = createMockFetch();
        storageClient = new StorageClient('https://api.test.com', mockFetch);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('listBuckets', () => {
        it('returns list of buckets', async () => {
            (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                data: [
                    { id: 'bucket1', name: 'images', public: true },
                    { id: 'bucket2', name: 'documents', public: false },
                ],
                error: null,
                status: 200,
            });

            const result = await storageClient.listBuckets();

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.test.com/storage/v1/bucket',
                expect.objectContaining({ method: 'GET' })
            );
            expect(result.data).toHaveLength(2);
            expect(result.data?.[0].name).toBe('images');
        });

        it('handles errors', async () => {
            (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                data: null,
                error: { message: 'Unauthorized', status: 401 },
                status: 401,
            });

            const result = await storageClient.listBuckets();

            expect(result.data).toBeNull();
            expect(result.error?.message).toBe('Unauthorized');
        });
    });

    describe('createBucket', () => {
        it('creates a bucket with default options', async () => {
            (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                data: { name: 'new-bucket' },
                error: null,
                status: 200,
            });

            const result = await storageClient.createBucket('new-bucket');

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.test.com/storage/v1/bucket',
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('"public":false'),
                })
            );
            expect(result.error).toBeNull();
        });

        it('creates a public bucket', async () => {
            (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                data: { name: 'public-bucket' },
                error: null,
                status: 200,
            });

            await storageClient.createBucket('public-bucket', { public: true });

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.test.com/storage/v1/bucket',
                expect.objectContaining({
                    body: expect.stringContaining('"public":true'),
                })
            );
        });
    });

    describe('from (BucketOperations)', () => {
        describe('list', () => {
            it('lists files in bucket', async () => {
                (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                    data: [
                        { name: 'file1.jpg', size: 1024 },
                        { name: 'file2.png', size: 2048 },
                    ],
                    error: null,
                    status: 200,
                });

                const result = await storageClient.from('images').list();

                expect(mockFetch).toHaveBeenCalledWith(
                    expect.stringContaining('/object/list/images'),
                    expect.objectContaining({ method: 'GET' })
                );
                expect(result.data).toHaveLength(2);
            });

            it('lists files with prefix', async () => {
                (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                    data: [],
                    error: null,
                    status: 200,
                });

                await storageClient.from('images').list('avatars/');

                expect(mockFetch).toHaveBeenCalledWith(
                    expect.stringContaining('prefix=avatars'),
                    expect.any(Object)
                );
            });

            it('lists files with pagination', async () => {
                (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                    data: [],
                    error: null,
                    status: 200,
                });

                await storageClient.from('images').list('', { limit: 10, offset: 20 });

                expect(mockFetch).toHaveBeenCalledWith(
                    expect.stringContaining('limit=10'),
                    expect.any(Object)
                );
            });
        });

        describe('remove', () => {
            it('removes single file', async () => {
                (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                    data: null,
                    error: null,
                    status: 200,
                });

                const result = await storageClient.from('images').remove('file.jpg');

                expect(mockFetch).toHaveBeenCalledWith(
                    'https://api.test.com/storage/v1/object/images',
                    expect.objectContaining({
                        method: 'DELETE',
                        body: expect.stringContaining('file.jpg'),
                    })
                );
                expect(result.error).toBeNull();
            });

            it('removes multiple files', async () => {
                (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                    data: null,
                    error: null,
                    status: 200,
                });

                await storageClient.from('images').remove(['file1.jpg', 'file2.png']);

                expect(mockFetch).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.objectContaining({
                        body: expect.stringContaining('file1.jpg'),
                    })
                );
            });
        });

        describe('createSignedUrl', () => {
            it('creates signed URL', async () => {
                (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                    data: { signedUrl: 'https://signed.url/file?token=abc' },
                    error: null,
                    status: 200,
                });

                const result = await storageClient.from('images').createSignedUrl('file.jpg', 3600);

                expect(mockFetch).toHaveBeenCalledWith(
                    'https://api.test.com/storage/v1/object/sign/images/file.jpg',
                    expect.objectContaining({
                        method: 'POST',
                        body: expect.stringContaining('3600'),
                    })
                );
                expect(result.data?.signedUrl).toContain('signed.url');
            });
        });

        describe('getPublicUrl', () => {
            it('returns public URL', () => {
                const result = storageClient.from('images').getPublicUrl('photo.jpg');

                expect(result.data.publicUrl).toBe(
                    'https://api.test.com/storage/v1/object/public/images/photo.jpg'
                );
            });
        });
    });
});
