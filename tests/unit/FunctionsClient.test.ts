/**
 * FunctionsClient Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FunctionsClient } from '../../src/functions/FunctionsClient';
import type { AeroFetch } from '../../src/lib/fetch';

// Mock fetch
const createMockFetch = (): AeroFetch => {
    return vi.fn().mockResolvedValue({
        data: null,
        error: null,
        status: 200,
    });
};

describe('FunctionsClient', () => {
    let mockFetch: AeroFetch;
    let functionsClient: FunctionsClient;

    beforeEach(() => {
        mockFetch = createMockFetch();
        functionsClient = new FunctionsClient('https://api.test.com', mockFetch);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('invoke', () => {
        it('invokes function with POST by default', async () => {
            (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                data: { result: 'success' },
                error: null,
                status: 200,
            });

            const result = await functionsClient.invoke('hello-world');

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.test.com/functions/v1/hello-world',
                expect.objectContaining({ method: 'POST' })
            );
            expect(result.data).toEqual({ result: 'success' });
        });

        it('invokes function with JSON body', async () => {
            (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                data: { greeting: 'Hello, Alice!' },
                error: null,
                status: 200,
            });

            const result = await functionsClient.invoke('greet', {
                body: { name: 'Alice' },
            });

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.test.com/functions/v1/greet',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ name: 'Alice' }),
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                    }),
                })
            );
            expect(result.data).toEqual({ greeting: 'Hello, Alice!' });
        });

        it('invokes function with string body', async () => {
            (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                data: { parsed: true },
                error: null,
                status: 200,
            });

            await functionsClient.invoke('parse', {
                body: 'raw text data',
            });

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: 'raw text data',
                })
            );
        });

        it('invokes function with custom method', async () => {
            (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                data: { items: [] },
                error: null,
                status: 200,
            });

            await functionsClient.invoke('get-items', {
                method: 'GET',
            });

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ method: 'GET' })
            );
        });

        it('invokes function with custom headers', async () => {
            (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                data: null,
                error: null,
                status: 200,
            });

            await functionsClient.invoke('auth-required', {
                headers: {
                    'X-Custom-Header': 'custom-value',
                },
            });

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'X-Custom-Header': 'custom-value',
                    }),
                })
            );
        });

        it('handles function not found error', async () => {
            (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                data: null,
                error: { message: 'Function not found', status: 404 },
                status: 404,
            });

            const result = await functionsClient.invoke('non-existent');

            expect(result.data).toBeNull();
            expect(result.error?.message).toBe('Function not found');
        });

        it('handles function execution error', async () => {
            (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                data: null,
                error: { message: 'Internal function error', status: 500, code: 'FUNCTION_ERROR' },
                status: 500,
            });

            const result = await functionsClient.invoke('failing-function');

            expect(result.data).toBeNull();
            expect(result.error?.message).toBe('Internal function error');
        });

        it('handles timeout error', async () => {
            (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                data: null,
                error: { message: 'Function timed out', status: 504, code: 'TIMEOUT' },
                status: 504,
            });

            const result = await functionsClient.invoke('slow-function');

            expect(result.error?.status).toBe(504);
        });
    });

    describe('list', () => {
        it('returns list of functions', async () => {
            (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                data: [
                    { name: 'hello-world', version: '1.0.0' },
                    { name: 'greet', version: '2.1.0' },
                ],
                error: null,
                status: 200,
            });

            const result = await functionsClient.list();

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.test.com/functions/v1',
                expect.objectContaining({ method: 'GET' })
            );
            expect(result.data).toHaveLength(2);
            expect(result.data?.[0].name).toBe('hello-world');
            expect(result.data?.[1].version).toBe('2.1.0');
        });

        it('handles empty list', async () => {
            (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                data: [],
                error: null,
                status: 200,
            });

            const result = await functionsClient.list();

            expect(result.data).toEqual([]);
        });

        it('handles error', async () => {
            (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                data: null,
                error: { message: 'Unauthorized', status: 401 },
                status: 401,
            });

            const result = await functionsClient.list();

            expect(result.data).toBeNull();
            expect(result.error?.message).toBe('Unauthorized');
        });
    });
});
