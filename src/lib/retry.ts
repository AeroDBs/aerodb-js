/**
 * Retry utility with exponential backoff
 *
 * Automatically retry failed requests with configurable backoff.
 */

export interface RetryOptions {
    /** Maximum number of retry attempts (default: 3) */
    maxAttempts?: number;
    /** Initial delay in milliseconds (default: 1000) */
    initialDelay?: number;
    /** Maximum delay in milliseconds (default: 30000) */
    maxDelay?: number;
    /** Backoff multiplier (default: 2) */
    backoffMultiplier?: number;
    /** HTTP status codes that should trigger a retry (default: [408, 429, 500, 502, 503, 504]) */
    retryableStatuses?: number[];
    /** Callback when a retry is attempted */
    onRetry?: (attempt: number, error: Error, delay: number) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableStatuses: [408, 429, 500, 502, 503, 504],
};

/**
 * Execute an async function with automatic retry on failure
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError: Error;
    let delay = opts.initialDelay;

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            // Check if we should retry
            if (attempt >= opts.maxAttempts) {
                break;
            }

            // Check if error is retryable
            if (!isRetryable(lastError, opts.retryableStatuses)) {
                break;
            }

            // Call onRetry callback
            options.onRetry?.(attempt, lastError, delay);

            // Wait before retrying
            await sleep(delay);

            // Calculate next delay with jitter
            delay = Math.min(
                delay * opts.backoffMultiplier * (0.5 + Math.random()),
                opts.maxDelay
            );
        }
    }

    throw lastError!;
}

/**
 * Check if an error is retryable
 */
function isRetryable(error: Error, retryableStatuses: number[]): boolean {
    // Check for network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
        return true;
    }

    // Check for HTTP status codes
    const statusMatch = error.message.match(/status:\s*(\d+)/i);
    if (statusMatch) {
        const status = parseInt(statusMatch[1], 10);
        return retryableStatuses.includes(status);
    }

    // Check for common error properties
    if ('status' in error && typeof (error as any).status === 'number') {
        return retryableStatuses.includes((error as any).status);
    }

    return false;
}

/**
 * Sleep for a given duration
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a retryable version of a function
 */
export function retryable<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    options: RetryOptions = {}
): T {
    return ((...args: Parameters<T>) =>
        withRetry(() => fn(...args), options)) as T;
}

/**
 * Retry decorator for methods
 */
export function Retry(options: RetryOptions = {}) {
    return function (
        _target: any,
        _propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args: any[]) {
            return withRetry(() => originalMethod.apply(this, args), options);
        };
        return descriptor;
    };
}
