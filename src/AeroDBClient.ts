/**
 * AeroDBClient - Main client class
 *
 * Entry point for all AeroDB operations.
 * Initializes and exposes auth, database, realtime, storage, and functions clients.
 */

import { AuthClient } from './auth/AuthClient';
import { PostgrestClient } from './database/PostgrestClient';
import { QueryBuilder } from './database/QueryBuilder';
import { RealtimeClient } from './realtime/RealtimeClient';
import { RealtimeChannel } from './realtime/RealtimeChannel';
import { StorageClient } from './storage/StorageClient';
import { FunctionsClient } from './functions/FunctionsClient';
import { createFetch } from './lib/fetch';
import { getStorageAdapter } from './lib/helpers';
import type { StorageAdapter } from './lib/helpers';

/**
 * AeroDB client configuration options
 */
export interface AeroDBClientOptions {
    /**
     * Base URL of the AeroDB instance (e.g., https://api.aerodb.com)
     */
    url: string;

    /**
     * API key for authentication (optional if using signIn)
     */
    key?: string;

    /**
     * Database schema to use (default: 'public')
     */
    schema?: string;

    /**
     * Custom headers to include in all requests
     */
    headers?: Record<string, string>;

    /**
     * WebSocket URL override for realtime connections
     */
    realtime?: {
        url: string;
    };

    /**
     * Custom storage adapter (default: localStorage in browser, memory in Node.js)
     */
    storage?: StorageAdapter;
}

export class AeroDBClient {
    /**
     * Authentication client for user management
     */
    readonly auth: AuthClient;

    /**
     * Realtime client for WebSocket subscriptions
     */
    readonly realtime: RealtimeClient;

    /**
     * Storage client for file operations
     */
    readonly storage: StorageClient;

    /**
     * Functions client for serverless invocation
     */
    readonly functions: FunctionsClient;

    private readonly db: PostgrestClient;

    constructor(options: AeroDBClientOptions) {
        // Validate required options
        if (!options.url) {
            throw new Error('AeroDBClient: url is required');
        }

        // Normalize URL (remove trailing slash)
        const baseUrl = options.url.replace(/\/$/, '');

        // Get storage adapter
        const storage = options.storage ?? getStorageAdapter();

        // Create fetch function with token injection
        const aeroFetch = createFetch(
            baseUrl,
            options.key,
            storage,
            options.headers ?? {}
        );

        // Initialize clients
        this.auth = new AuthClient(baseUrl, aeroFetch, storage);
        this.db = new PostgrestClient(baseUrl, aeroFetch, options.schema ?? 'public');
        this.storage = new StorageClient(baseUrl, aeroFetch);
        this.functions = new FunctionsClient(baseUrl, aeroFetch);

        // Initialize realtime with WebSocket URL
        const wsUrl = options.realtime?.url ?? this.buildWebSocketUrl(baseUrl);
        this.realtime = new RealtimeClient(wsUrl, options.key, storage);
    }

    /**
     * Create a query builder for a database collection/table
     */
    from<T = Record<string, unknown>>(collection: string): QueryBuilder<T> {
        return this.db.from<T>(collection);
    }

    /**
     * Create or get a realtime channel
     */
    channel(name: string): RealtimeChannel {
        return this.realtime.channel(name);
    }

    /**
     * Build WebSocket URL from base URL
     */
    private buildWebSocketUrl(baseUrl: string): string {
        const url = new URL(baseUrl);
        const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${url.host}/realtime/v1/websocket`;
    }
}
