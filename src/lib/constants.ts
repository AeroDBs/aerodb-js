/**
 * API version constants
 */
export const API_VERSIONS = {
    REST: 'v1',
    AUTH: 'v1',
    STORAGE: 'v1',
    REALTIME: 'v1',
    FUNCTIONS: 'v1',
} as const;

/**
 * Default headers for all requests
 */
export const DEFAULT_HEADERS = {
    'Content-Type': 'application/json',
    'X-Client-Info': '@aerodb/client',
} as const;

/**
 * WebSocket configuration
 */
export const REALTIME_CONFIG = {
    HEARTBEAT_INTERVAL_MS: 30000,
    RECONNECT_DELAY_MS: 1000,
    MAX_RECONNECT_DELAY_MS: 30000,
    RECONNECT_BACKOFF_MULTIPLIER: 2,
} as const;

/**
 * Storage configuration
 */
export const STORAGE_CONFIG = {
    DEFAULT_CHUNK_SIZE: 6 * 1024 * 1024, // 6MB
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
} as const;
