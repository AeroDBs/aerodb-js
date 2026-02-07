/**
 * QueryBuilder Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryBuilder } from '../../src/database/QueryBuilder';
import type { AeroFetch } from '../../src/lib/fetch';

// Mock fetch
const createMockFetch = (): AeroFetch => {
    return vi.fn().mockResolvedValue({
        data: [{ id: '1', name: 'Test' }],
        error: null,
        status: 200,
    });
};

describe('QueryBuilder', () => {
    let mockFetch: AeroFetch;

    beforeEach(() => {
        mockFetch = createMockFetch();
    });

    describe('select', () => {
        it('builds query with select fields', async () => {
            const qb = new QueryBuilder('users', 'https://api.test.com', mockFetch);
            await qb.select('id, name, email').execute();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('select=id%2C+name%2C+email'),
                expect.any(Object)
            );
        });

        it('uses * for default select', async () => {
            const qb = new QueryBuilder('users', 'https://api.test.com', mockFetch);
            await qb.execute();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('select=*'),
                expect.any(Object)
            );
        });
    });

    describe('filters', () => {
        it('builds eq filter', async () => {
            const qb = new QueryBuilder<{ role: string }>('users', 'https://api.test.com', mockFetch);
            await qb.eq('role', 'admin').execute();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('role=eq.admin'),
                expect.any(Object)
            );
        });

        it('builds neq filter', async () => {
            const qb = new QueryBuilder<{ status: string }>('users', 'https://api.test.com', mockFetch);
            await qb.neq('status', 'deleted').execute();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('status=neq.deleted'),
                expect.any(Object)
            );
        });

        it('builds gt filter', async () => {
            const qb = new QueryBuilder<{ age: number }>('users', 'https://api.test.com', mockFetch);
            await qb.gt('age', 18).execute();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('age=gt.18'),
                expect.any(Object)
            );
        });

        it('builds gte filter', async () => {
            const qb = new QueryBuilder<{ score: number }>('users', 'https://api.test.com', mockFetch);
            await qb.gte('score', 100).execute();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('score=gte.100'),
                expect.any(Object)
            );
        });

        it('builds lt filter', async () => {
            const qb = new QueryBuilder<{ price: number }>('products', 'https://api.test.com', mockFetch);
            await qb.lt('price', 50).execute();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('price=lt.50'),
                expect.any(Object)
            );
        });

        it('builds lte filter', async () => {
            const qb = new QueryBuilder<{ quantity: number }>('products', 'https://api.test.com', mockFetch);
            await qb.lte('quantity', 10).execute();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('quantity=lte.10'),
                expect.any(Object)
            );
        });

        it('builds like filter', async () => {
            const qb = new QueryBuilder<{ name: string }>('users', 'https://api.test.com', mockFetch);
            await qb.like('name', '%john%').execute();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('name=like.%25john%25'),
                expect.any(Object)
            );
        });

        it('builds in filter', async () => {
            const qb = new QueryBuilder<{ status: string }>('orders', 'https://api.test.com', mockFetch);
            await qb.in('status', ['pending', 'processing']).execute();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('status=in.'),
                expect.any(Object)
            );
        });

        it('combines multiple filters', async () => {
            const qb = new QueryBuilder<{ role: string; age: number }>('users', 'https://api.test.com', mockFetch);
            await qb.eq('role', 'admin').gt('age', 21).execute();

            const callUrl = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
            expect(callUrl).toContain('role=eq.admin');
            expect(callUrl).toContain('age=gt.21');
        });
    });

    describe('ordering', () => {
        it('builds order ascending', async () => {
            const qb = new QueryBuilder<{ created_at: string }>('posts', 'https://api.test.com', mockFetch);
            await qb.order('created_at', { ascending: true }).execute();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('order=created_at.asc'),
                expect.any(Object)
            );
        });

        it('builds order descending', async () => {
            const qb = new QueryBuilder<{ updated_at: string }>('posts', 'https://api.test.com', mockFetch);
            await qb.order('updated_at', { ascending: false }).execute();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('order=updated_at.desc'),
                expect.any(Object)
            );
        });
    });

    describe('pagination', () => {
        it('builds limit', async () => {
            const qb = new QueryBuilder('users', 'https://api.test.com', mockFetch);
            await qb.limit(10).execute();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('limit=10'),
                expect.any(Object)
            );
        });

        it('builds offset', async () => {
            const qb = new QueryBuilder('users', 'https://api.test.com', mockFetch);
            await qb.offset(20).execute();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('offset=20'),
                expect.any(Object)
            );
        });

        it('builds limit and offset together', async () => {
            const qb = new QueryBuilder('users', 'https://api.test.com', mockFetch);
            await qb.limit(10).offset(20).execute();

            const callUrl = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
            expect(callUrl).toContain('limit=10');
            expect(callUrl).toContain('offset=20');
        });
    });

    describe('single', () => {
        it('sets limit to 1', async () => {
            const qb = new QueryBuilder('users', 'https://api.test.com', mockFetch);
            await qb.single().execute();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('limit=1'),
                expect.any(Object)
            );
        });
    });

    describe('complex queries', () => {
        it('builds complete query with all options', async () => {
            const qb = new QueryBuilder<{ role: string; age: number; name: string; created_at: string }>(
                'users',
                'https://api.test.com',
                mockFetch
            );
            await qb
                .select('id, name, email')
                .eq('role', 'admin')
                .gt('age', 18)
                .order('created_at', { ascending: false })
                .limit(10)
                .offset(0)
                .execute();

            const callUrl = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
            expect(callUrl).toContain('select=id%2C+name%2C+email');
            expect(callUrl).toContain('role=eq.admin');
            expect(callUrl).toContain('age=gt.18');
            expect(callUrl).toContain('order=created_at.desc');
            expect(callUrl).toContain('limit=10');
        });
    });

    describe('CRUD operations', () => {
        it('calls POST for insert', async () => {
            const qb = new QueryBuilder('users', 'https://api.test.com', mockFetch);
            await qb.insert({ name: 'John', email: 'john@example.com' });

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.test.com/rest/v1/users',
                expect.objectContaining({ method: 'POST' })
            );
        });

        it('calls PATCH for update', async () => {
            const qb = new QueryBuilder<{ id: string }>('users', 'https://api.test.com', mockFetch);
            await qb.eq('id', '123').update({ name: 'Jane' });

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ method: 'PATCH' })
            );
        });

        it('calls DELETE for delete', async () => {
            const qb = new QueryBuilder<{ id: string }>('users', 'https://api.test.com', mockFetch);
            await qb.eq('id', '123').delete();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ method: 'DELETE' })
            );
        });
    });

    describe('error handling', () => {
        it('returns error from API response', async () => {
            mockFetch = vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Not found', status: 404 },
                status: 404,
            });

            const qb = new QueryBuilder('users', 'https://api.test.com', mockFetch);
            const result = await qb.execute();

            expect(result.data).toBeNull();
            expect(result.error).toEqual({ message: 'Not found', status: 404 });
        });
    });
});
