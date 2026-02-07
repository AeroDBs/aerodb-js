/**
 * FunctionsClient - Serverless function invocation
 *
 * Invoke edge functions deployed to AeroDB.
 */

import type { AeroFetch } from '../lib/fetch';
import type { AeroDBResponse, FunctionInvokeOptions } from '../types';

export class FunctionsClient {
    private functionsUrl: string;
    private fetch: AeroFetch;

    constructor(baseUrl: string, fetch: AeroFetch) {
        this.functionsUrl = `${baseUrl}/functions/v1`;
        this.fetch = fetch;
    }

    /**
     * Invoke a function by name
     */
    async invoke<T = unknown>(
        functionName: string,
        options: FunctionInvokeOptions = {}
    ): Promise<AeroDBResponse<T>> {
        const url = `${this.functionsUrl}/${functionName}`;
        const method = options.method ?? 'POST';

        const headers: Record<string, string> = {
            ...options.headers,
        };

        let body: string | undefined;
        if (options.body !== undefined) {
            if (typeof options.body === 'string') {
                body = options.body;
            } else {
                body = JSON.stringify(options.body);
                if (!headers['Content-Type']) {
                    headers['Content-Type'] = 'application/json';
                }
            }
        }

        const result = await this.fetch<T>(url, {
            method,
            headers,
            body,
        });

        return {
            data: result.data,
            error: result.error,
        };
    }

    /**
     * Get function metadata
     */
    async list(): Promise<AeroDBResponse<{ name: string; version: string }[]>> {
        const result = await this.fetch<{ name: string; version: string }[]>(
            this.functionsUrl,
            { method: 'GET' }
        );

        return {
            data: result.data,
            error: result.error,
        };
    }
}
