/**
 * @aerodb/client - AeroDB JavaScript/TypeScript SDK
 *
 * Production-ready client library for AeroDB.
 * Provides type-safe access to Auth, Database, Realtime, Storage, and Functions APIs.
 *
 * @example
 * ```typescript
 * import { AeroDBClient } from '@aerodb/client';
 *
 * const client = new AeroDBClient({
 *   url: 'https://api.aerodb.com',
 *   key: 'your-api-key',
 * });
 *
 * // Auth
 * const { data, error } = await client.auth.signIn({
 *   email: 'user@example.com',
 *   password: 'password123',
 * });
 *
 * // Database queries
 * const { data: users } = await client
 *   .from('users')
 *   .select('id, name, email')
 *   .eq('role', 'admin')
 *   .limit(10)
 *   .execute();
 *
 * // Realtime subscriptions
 * client.channel('messages')
 *   .on('INSERT', (payload) => {
 *     console.log('New message:', payload.new);
 *   })
 *   .subscribe();
 * ```
 *
 * @packageDocumentation
 */

// Main client
export { AeroDBClient } from './AeroDBClient';
export type { AeroDBClientOptions } from './AeroDBClient';

// Auth
export { AuthClient } from './auth/AuthClient';
export type {
    SignUpCredentials,
    SignInCredentials,
    AuthResponse,
    AuthChangeEvent,
    AuthStateChangeCallback,
} from './auth/types';

// Database
export { PostgrestClient } from './database/PostgrestClient';
export { QueryBuilder } from './database/QueryBuilder';
export type { FilterOperator, Filter, OrderBy } from './database/types';

// Realtime
export { RealtimeClient } from './realtime/RealtimeClient';
export { RealtimeChannel } from './realtime/RealtimeChannel';
export type {
    RealtimeEventType,
    RealtimePayload,
    RealtimeHandler,
    ConnectionState,
} from './realtime/types';

// Storage
export { StorageClient } from './storage/StorageClient';
export type { Bucket, DownloadResponse, SignedUrlResponse } from './storage/types';

// Functions
export { FunctionsClient } from './functions/FunctionsClient';
export type { FunctionResponse } from './functions/types';

// Types
export type {
    AeroDBResponse,
    AeroDBError,
    User,
    Session,
    FileObject,
    UploadOptions,
    ListOptions,
    FunctionInvokeOptions,
} from './types';

// Helpers (for advanced use)
export type { StorageAdapter } from './lib/helpers';
