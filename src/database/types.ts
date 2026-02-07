/**
 * Database module type definitions
 */

/**
 * Filter operators for query building
 */
export type FilterOperator =
    | 'eq'
    | 'neq'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'like'
    | 'ilike'
    | 'in'
    | 'is';

/**
 * Filter definition
 */
export interface Filter {
    field: string;
    operator: FilterOperator;
    value: unknown;
}

/**
 * Order definition
 */
export interface OrderBy {
    field: string;
    ascending: boolean;
    nullsFirst?: boolean;
}

/**
 * Insert/upsert options
 */
export interface InsertOptions {
    onConflict?: string;
    returning?: 'minimal' | 'representation';
    count?: 'exact' | 'planned' | 'estimated';
}

/**
 * Update options
 */
export interface UpdateOptions {
    returning?: 'minimal' | 'representation';
    count?: 'exact' | 'planned' | 'estimated';
}

/**
 * Delete options
 */
export interface DeleteOptions {
    returning?: 'minimal' | 'representation';
    count?: 'exact' | 'planned' | 'estimated';
}
