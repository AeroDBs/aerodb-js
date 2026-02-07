/**
 * AuthClient Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthClient } from '../../src/auth/AuthClient';
import type { AeroFetch } from '../../src/lib/fetch';
import type { StorageAdapter } from '../../src/lib/helpers';

// Mock storage adapter
const createMockStorage = (): StorageAdapter => {
    const store = new Map<string, string>();
    return {
        getItem: vi.fn((key: string) => store.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => store.set(key, value)),
        removeItem: vi.fn((key: string) => store.delete(key)),
    };
};

// Mock fetch
const createMockFetch = (): AeroFetch => {
    return vi.fn().mockResolvedValue({
        data: null,
        error: null,
        status: 200,
    });
};

describe('AuthClient', () => {
    let mockFetch: AeroFetch;
    let mockStorage: StorageAdapter;
    let authClient: AuthClient;

    beforeEach(() => {
        mockFetch = createMockFetch();
        mockStorage = createMockStorage();
        authClient = new AuthClient('https://api.test.com', mockFetch, mockStorage);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('signUp', () => {
        it('sends signup request and stores tokens', async () => {
            (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                data: {
                    user: { id: '123', email: 'test@example.com' },
                    access_token: 'access-token-123',
                    refresh_token: 'refresh-token-123',
                    expires_in: 3600,
                },
                error: null,
                status: 200,
            });

            const result = await authClient.signUp({
                email: 'test@example.com',
                password: 'password123',
            });

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.test.com/auth/signup',
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('test@example.com'),
                })
            );

            expect(result.data).not.toBeNull();
            expect(result.data?.user.email).toBe('test@example.com');
            expect(result.data?.session.access_token).toBe('access-token-123');
            expect(mockStorage.setItem).toHaveBeenCalledWith('aerodb.auth.token', 'access-token-123');
            expect(mockStorage.setItem).toHaveBeenCalledWith('aerodb.auth.refresh_token', 'refresh-token-123');
        });

        it('returns error on signup failure', async () => {
            (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                data: null,
                error: { message: 'Email already exists', status: 409 },
                status: 409,
            });

            const result = await authClient.signUp({
                email: 'existing@example.com',
                password: 'password123',
            });

            expect(result.data).toBeNull();
            expect(result.error?.message).toBe('Email already exists');
        });
    });

    describe('signIn', () => {
        it('sends login request and stores tokens', async () => {
            (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                data: {
                    user: { id: '123', email: 'test@example.com' },
                    access_token: 'access-token-456',
                    refresh_token: 'refresh-token-456',
                    expires_in: 3600,
                },
                error: null,
                status: 200,
            });

            const result = await authClient.signIn({
                email: 'test@example.com',
                password: 'password123',
            });

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.test.com/auth/login',
                expect.objectContaining({
                    method: 'POST',
                })
            );

            expect(result.data?.session.access_token).toBe('access-token-456');
            expect(mockStorage.setItem).toHaveBeenCalledWith('aerodb.auth.token', 'access-token-456');
        });

        it('returns error on invalid credentials', async () => {
            (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                data: null,
                error: { message: 'Invalid credentials', status: 401 },
                status: 401,
            });

            const result = await authClient.signIn({
                email: 'test@example.com',
                password: 'wrong-password',
            });

            expect(result.data).toBeNull();
            expect(result.error?.message).toBe('Invalid credentials');
        });
    });

    describe('signOut', () => {
        it('sends logout request and clears tokens', async () => {
            // Setup: simulate logged in state
            mockStorage.setItem('aerodb.auth.token', 'access-token');
            mockStorage.setItem('aerodb.auth.refresh_token', 'refresh-token');

            const result = await authClient.signOut();

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.test.com/auth/logout',
                expect.objectContaining({
                    method: 'POST',
                })
            );

            expect(result.error).toBeNull();
            expect(mockStorage.removeItem).toHaveBeenCalledWith('aerodb.auth.token');
            expect(mockStorage.removeItem).toHaveBeenCalledWith('aerodb.auth.refresh_token');
        });
    });

    describe('getUser', () => {
        it('returns error when not authenticated', async () => {
            const result = await authClient.getUser();

            expect(result.data).toBeNull();
            expect(result.error?.code).toBe('NOT_AUTHENTICATED');
        });

        it('fetches user when authenticated', async () => {
            // Setup: simulate logged in state
            mockStorage.setItem('aerodb.auth.token', 'access-token');
            (mockStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('access-token');

            // Reinitialize to pick up stored token
            authClient = new AuthClient('https://api.test.com', mockFetch, mockStorage);

            (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                data: { id: '123', email: 'test@example.com' },
                error: null,
                status: 200,
            });

            const result = await authClient.getUser();

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.test.com/auth/user',
                expect.objectContaining({ method: 'GET' })
            );
            expect(result.data?.email).toBe('test@example.com');
        });
    });

    describe('refreshSession', () => {
        it('returns error when no refresh token', async () => {
            const result = await authClient.refreshSession();

            expect(result.data).toBeNull();
            expect(result.error?.code).toBe('NO_REFRESH_TOKEN');
        });

        it('refreshes and stores new tokens', async () => {
            mockStorage.setItem('aerodb.auth.refresh_token', 'old-refresh-token');
            (mockStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('old-refresh-token');

            (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                data: {
                    access_token: 'new-access-token',
                    refresh_token: 'new-refresh-token',
                    expires_in: 3600,
                },
                error: null,
                status: 200,
            });

            const result = await authClient.refreshSession();

            expect(result.data?.access_token).toBe('new-access-token');
            expect(mockStorage.setItem).toHaveBeenCalledWith('aerodb.auth.token', 'new-access-token');
        });
    });

    describe('onAuthStateChange', () => {
        it('registers callback and calls with current state', async () => {
            const callback = vi.fn();

            // Simulate logged in state
            mockStorage.setItem('aerodb.auth.token', 'token');
            mockStorage.setItem('aerodb.auth.refresh_token', 'refresh');
            (mockStorage.getItem as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
                if (key === 'aerodb.auth.token') return 'token';
                if (key === 'aerodb.auth.refresh_token') return 'refresh';
                return null;
            });

            authClient = new AuthClient('https://api.test.com', mockFetch, mockStorage);
            const { unsubscribe } = authClient.onAuthStateChange(callback);

            expect(callback).toHaveBeenCalledWith('SIGNED_IN', expect.any(Object));

            unsubscribe();
        });

        it('allows unsubscribe', () => {
            const callback = vi.fn();
            const { unsubscribe } = authClient.onAuthStateChange(callback);

            unsubscribe();
            // Callback should not be called again after unsubscribe
            // (tested by not throwing when cleanup is attempted)
        });
    });
});
