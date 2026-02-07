/**
 * Environment detection and helper utilities
 */

/**
 * Check if running in a browser environment
 */
export function isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}

/**
 * Check if running in Node.js
 */
export function isNode(): boolean {
    return typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
}

/**
 * Get storage adapter based on environment
 */
export function getStorageAdapter(): StorageAdapter {
    if (isBrowser() && typeof localStorage !== 'undefined') {
        return new LocalStorageAdapter();
    }
    return new MemoryStorageAdapter();
}

/**
 * Storage adapter interface
 */
export interface StorageAdapter {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

/**
 * localStorage adapter for browser
 */
class LocalStorageAdapter implements StorageAdapter {
    getItem(key: string): string | null {
        return localStorage.getItem(key);
    }

    setItem(key: string, value: string): void {
        localStorage.setItem(key, value);
    }

    removeItem(key: string): void {
        localStorage.removeItem(key);
    }
}

/**
 * In-memory adapter for Node.js
 */
class MemoryStorageAdapter implements StorageAdapter {
    private storage = new Map<string, string>();

    getItem(key: string): string | null {
        return this.storage.get(key) ?? null;
    }

    setItem(key: string, value: string): void {
        this.storage.set(key, value);
    }

    removeItem(key: string): void {
        this.storage.delete(key);
    }
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
    return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
