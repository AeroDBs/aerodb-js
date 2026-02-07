/**
 * Functions module type definitions
 */

export type { FunctionInvokeOptions } from '../types';

/**
 * Function invoke response
 */
export interface FunctionResponse<T = unknown> {
    data: T | null;
    error: import('../types').AeroDBError | null;
}
