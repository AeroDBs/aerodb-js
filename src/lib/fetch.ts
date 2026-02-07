/**
 * HTTP fetch wrapper with authentication token injection
 */

import type { AeroDBError } from '../types';
import { DEFAULT_HEADERS } from './constants';
import type { StorageAdapter } from './helpers';

export interface FetchOptions extends RequestInit {
    headers?: Record<string, string>;
}

export interface FetchResult<T> {
    data: T | null;
    error: AeroDBError | null;
    status: number;
}

/**
 * Create a configured fetch function with token injection
 */
export function createFetch(
    baseUrl: string,
    apiKey: string | undefined,
    storage: StorageAdapter,
    customHeaders: Record<string, string> = {}
) {
    return async function aeroFetch<T>(
        path: string,
        options: FetchOptions = {}
    ): Promise<FetchResult<T>> {
        const url = path.startsWith('http') ? path : `${baseUrl}${path}`;

        // Get access token from storage
        const accessToken = storage.getItem('aerodb.auth.token');

        // Build headers
        const headers: Record<string, string> = {
            ...DEFAULT_HEADERS,
            ...customHeaders,
            ...options.headers,
        };

        // Add API key if provided
        if (apiKey) {
            headers['apikey'] = apiKey;
        }

        // Add authorization header if token exists
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers,
            });

            // Handle no-content responses
            if (response.status === 204) {
                return { data: null, error: null, status: response.status };
            }

            // Try to parse JSON
            let data: T | null = null;
            let error: AeroDBError | null = null;

            const contentType = response.headers.get('content-type');
            if (contentType?.includes('application/json')) {
                const json = await response.json();

                if (!response.ok) {
                    error = {
                        message: json.error || json.message || 'Request failed',
                        status: response.status,
                        code: json.code,
                        details: json.details,
                    };
                } else {
                    data = json;
                }
            } else if (!response.ok) {
                const text = await response.text();
                error = {
                    message: text || 'Request failed',
                    status: response.status,
                };
            }

            return { data, error, status: response.status };
        } catch (err) {
            // Network error
            return {
                data: null,
                error: {
                    message: err instanceof Error ? err.message : 'Network error',
                    code: 'NETWORK_ERROR',
                },
                status: 0,
            };
        }
    };
}

export type AeroFetch = ReturnType<typeof createFetch>;
