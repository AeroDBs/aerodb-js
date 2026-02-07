/**
 * @aerodb/client - Global Type Definitions
 */

/**
 * Standard response type for all AeroDB async operations.
 * Uses Result pattern - never throws exceptions.
 */
export interface AeroDBResponse<T> {
    data: T | null;
    error: AeroDBError | null;
}

/**
 * Standard error type for all AeroDB operations.
 */
export interface AeroDBError {
    message: string;
    status?: number;
    code?: string;
    details?: unknown;
}

/**
 * User type returned from auth operations.
 */
export interface User {
    id: string;
    email: string;
    email_verified: boolean;
    created_at: string;
    updated_at?: string;
    metadata?: Record<string, unknown>;
}

/**
 * Session type containing authentication tokens.
 */
export interface Session {
    access_token: string;
    refresh_token: string;
    expires_at?: number;
    expires_in?: number;
    token_type?: string;
}

/**
 * Combined auth response with user and session.
 */
export interface AuthResponse {
    data: {
        user: User;
        session: Session;
    } | null;
    error: AeroDBError | null;
}

/**
 * Database event types for realtime subscriptions.
 */
export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

/**
 * Payload received from realtime events.
 */
export interface RealtimePayload<T = Record<string, unknown>> {
    type: RealtimeEvent;
    table: string;
    schema: string;
    commit_timestamp: string;
    new: T | null;
    old: T | null;
}

/**
 * File object returned from storage operations.
 */
export interface FileObject {
    id: string;
    name: string;
    bucket: string;
    path: string;
    size: number;
    content_type: string;
    created_at: string;
    updated_at: string;
    metadata?: Record<string, unknown>;
}

/**
 * Options for file uploads.
 */
export interface UploadOptions {
    contentType?: string;
    cacheControl?: string;
    upsert?: boolean;
    metadata?: Record<string, unknown>;
}

/**
 * Options for listing files.
 */
export interface ListOptions {
    prefix?: string;
    limit?: number;
    offset?: number;
    sortBy?: {
        column: string;
        order: 'asc' | 'desc';
    };
}

/**
 * Function invocation options.
 */
export interface FunctionInvokeOptions {
    headers?: Record<string, string>;
    body?: unknown;
    method?: 'GET' | 'POST';
}
