/**
 * PostgrestClient - Database operations wrapper
 *
 * Creates QueryBuilder instances for collections.
 */

import type { AeroFetch } from '../lib/fetch';
import { QueryBuilder } from './QueryBuilder';

export class PostgrestClient {
    private baseUrl: string;
    private fetch: AeroFetch;
    private schema: string;

    constructor(baseUrl: string, fetch: AeroFetch, schema: string = 'public') {
        this.baseUrl = baseUrl;
        this.fetch = fetch;
        this.schema = schema;
    }

    /**
     * Create a query builder for a collection
     */
    from<T = Record<string, unknown>>(collection: string): QueryBuilder<T> {
        return new QueryBuilder<T>(collection, this.baseUrl, this.fetch, this.schema);
    }
}
