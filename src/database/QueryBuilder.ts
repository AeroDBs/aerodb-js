/**
 * QueryBuilder - Fluent API for building database queries
 *
 * Implements PostgREST-style query syntax.
 * Query is not executed until execute() is called.
 */

import type { AeroFetch } from '../lib/fetch';
import type { AeroDBResponse } from '../types';
import type { Filter, FilterOperator, OrderBy } from './types';

export class QueryBuilder<T = Record<string, unknown>> {
    private collection: string;
    private baseUrl: string;
    private fetch: AeroFetch;
    private schema: string;

    private selectFields: string = '*';
    private filters: Filter[] = [];
    private orderByFields: OrderBy[] = [];
    private limitValue?: number;
    private offsetValue?: number;
    private isSingle: boolean = false;

    constructor(
        collection: string,
        baseUrl: string,
        fetch: AeroFetch,
        schema: string = 'public'
    ) {
        this.collection = collection;
        this.baseUrl = baseUrl;
        this.fetch = fetch;
        this.schema = schema;
    }

    /**
     * Select specific columns
     */
    select(columns: string = '*'): this {
        this.selectFields = columns;
        return this;
    }

    /**
     * Filter: equal
     */
    eq<K extends keyof T>(field: K, value: T[K]): this {
        this.filters.push({ field: String(field), operator: 'eq', value });
        return this;
    }

    /**
     * Filter: not equal
     */
    neq<K extends keyof T>(field: K, value: T[K]): this {
        this.filters.push({ field: String(field), operator: 'neq', value });
        return this;
    }

    /**
     * Filter: greater than
     */
    gt<K extends keyof T>(field: K, value: T[K]): this {
        this.filters.push({ field: String(field), operator: 'gt', value });
        return this;
    }

    /**
     * Filter: greater than or equal
     */
    gte<K extends keyof T>(field: K, value: T[K]): this {
        this.filters.push({ field: String(field), operator: 'gte', value });
        return this;
    }

    /**
     * Filter: less than
     */
    lt<K extends keyof T>(field: K, value: T[K]): this {
        this.filters.push({ field: String(field), operator: 'lt', value });
        return this;
    }

    /**
     * Filter: less than or equal
     */
    lte<K extends keyof T>(field: K, value: T[K]): this {
        this.filters.push({ field: String(field), operator: 'lte', value });
        return this;
    }

    /**
     * Filter: LIKE pattern match (case sensitive)
     */
    like<K extends keyof T>(field: K, pattern: string): this {
        this.filters.push({ field: String(field), operator: 'like', value: pattern });
        return this;
    }

    /**
     * Filter: ILIKE pattern match (case insensitive)
     */
    ilike<K extends keyof T>(field: K, pattern: string): this {
        this.filters.push({ field: String(field), operator: 'ilike', value: pattern });
        return this;
    }

    /**
     * Filter: IN array of values
     */
    in<K extends keyof T>(field: K, values: T[K][]): this {
        this.filters.push({ field: String(field), operator: 'in', value: values });
        return this;
    }

    /**
     * Filter: IS NULL or IS NOT NULL
     */
    is<K extends keyof T>(field: K, value: null | boolean): this {
        this.filters.push({ field: String(field), operator: 'is', value });
        return this;
    }

    /**
     * Order results
     */
    order<K extends keyof T>(
        field: K,
        options: { ascending?: boolean; nullsFirst?: boolean } = {}
    ): this {
        this.orderByFields.push({
            field: String(field),
            ascending: options.ascending ?? true,
            nullsFirst: options.nullsFirst,
        });
        return this;
    }

    /**
     * Limit number of results
     */
    limit(count: number): this {
        this.limitValue = count;
        return this;
    }

    /**
     * Offset for pagination
     */
    offset(count: number): this {
        this.offsetValue = count;
        return this;
    }

    /**
     * Return only a single row
     */
    single(): this {
        this.isSingle = true;
        this.limitValue = 1;
        return this;
    }

    /**
     * Build the query string for GET requests
     */
    private buildQueryString(): string {
        const params = new URLSearchParams();

        // Select
        if (this.selectFields) {
            params.set('select', this.selectFields);
        }

        // Filters
        for (const filter of this.filters) {
            const value = this.formatFilterValue(filter.operator, filter.value);
            params.set(filter.field, `${filter.operator}.${value}`);
        }

        // Order
        if (this.orderByFields.length > 0) {
            const orderStr = this.orderByFields
                .map((o) => {
                    let str = `${o.field}.${o.ascending ? 'asc' : 'desc'}`;
                    if (o.nullsFirst !== undefined) {
                        str += `.${o.nullsFirst ? 'nullsfirst' : 'nullslast'}`;
                    }
                    return str;
                })
                .join(',');
            params.set('order', orderStr);
        }

        // Pagination
        if (this.limitValue !== undefined) {
            params.set('limit', String(this.limitValue));
        }
        if (this.offsetValue !== undefined) {
            params.set('offset', String(this.offsetValue));
        }

        return params.toString();
    }

    /**
     * Format filter value based on operator
     */
    private formatFilterValue(operator: FilterOperator, value: unknown): string {
        if (operator === 'in' && Array.isArray(value)) {
            return `(${value.map(String).join(',')})`;
        }
        if (value === null) {
            return 'null';
        }
        if (typeof value === 'boolean') {
            return String(value);
        }
        return String(value);
    }

    /**
     * Execute SELECT query
     */
    async execute(): Promise<AeroDBResponse<T[]>> {
        const queryString = this.buildQueryString();
        const url = `${this.baseUrl}/rest/v1/${this.collection}?${queryString}`;

        const headers: Record<string, string> = {};
        if (this.schema !== 'public') {
            headers['Accept-Profile'] = this.schema;
        }

        const result = await this.fetch<T[]>(url, { method: 'GET', headers });

        if (this.isSingle && result.data) {
            // Return single item or null
            const singleData = result.data[0] ?? null;
            return {
                data: singleData ? [singleData] : null,
                error: result.error,
            };
        }

        return {
            data: result.data,
            error: result.error,
        };
    }

    /**
     * Insert rows
     */
    async insert(
        data: Partial<T> | Partial<T>[]
    ): Promise<AeroDBResponse<T[]>> {
        const url = `${this.baseUrl}/rest/v1/${this.collection}`;

        const headers: Record<string, string> = {
            Prefer: 'return=representation',
        };
        if (this.schema !== 'public') {
            headers['Content-Profile'] = this.schema;
        }

        const result = await this.fetch<T[]>(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(data),
        });

        return {
            data: result.data,
            error: result.error,
        };
    }

    /**
     * Upsert rows (insert or update on conflict)
     */
    async upsert(
        data: Partial<T> | Partial<T>[],
        options: { onConflict?: string } = {}
    ): Promise<AeroDBResponse<T[]>> {
        const url = `${this.baseUrl}/rest/v1/${this.collection}`;

        const headers: Record<string, string> = {
            Prefer: 'return=representation,resolution=merge-duplicates',
        };
        if (this.schema !== 'public') {
            headers['Content-Profile'] = this.schema;
        }
        if (options.onConflict) {
            headers['on-conflict'] = options.onConflict;
        }

        const result = await this.fetch<T[]>(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(data),
        });

        return {
            data: result.data,
            error: result.error,
        };
    }

    /**
     * Update rows matching filters
     */
    async update(data: Partial<T>): Promise<AeroDBResponse<T[]>> {
        const queryString = this.buildQueryString();
        const url = `${this.baseUrl}/rest/v1/${this.collection}?${queryString}`;

        const headers: Record<string, string> = {
            Prefer: 'return=representation',
        };
        if (this.schema !== 'public') {
            headers['Content-Profile'] = this.schema;
        }

        const result = await this.fetch<T[]>(url, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(data),
        });

        return {
            data: result.data,
            error: result.error,
        };
    }

    /**
     * Delete rows matching filters
     */
    async delete(): Promise<AeroDBResponse<T[]>> {
        const queryString = this.buildQueryString();
        const url = `${this.baseUrl}/rest/v1/${this.collection}?${queryString}`;

        const headers: Record<string, string> = {
            Prefer: 'return=representation',
        };
        if (this.schema !== 'public') {
            headers['Content-Profile'] = this.schema;
        }

        const result = await this.fetch<T[]>(url, {
            method: 'DELETE',
            headers,
        });

        return {
            data: result.data,
            error: result.error,
        };
    }
}
