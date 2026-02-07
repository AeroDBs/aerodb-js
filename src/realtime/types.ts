/**
 * Realtime module type definitions
 */

/**
 * Realtime event types
 */
export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

/**
 * Realtime payload delivered to subscribers
 */
export interface RealtimePayload<T = Record<string, unknown>> {
    type: RealtimeEventType;
    table: string;
    schema: string;
    commit_timestamp: string;
    new: T | null;
    old: T | null;
}

/**
 * Handler function for realtime events
 */
export type RealtimeHandler<T = Record<string, unknown>> = (
    payload: RealtimePayload<T>
) => void;

/**
 * Subscription filter options
 */
export interface SubscriptionFilter {
    event?: RealtimeEventType;
    schema?: string;
    table?: string;
    filter?: string;
}

/**
 * WebSocket connection state
 */
export type ConnectionState =
    | 'CONNECTING'
    | 'CONNECTED'
    | 'DISCONNECTED'
    | 'RECONNECTING';
