/**
 * AuthClient - Authentication operations
 *
 * Handles user signup, signin, signout, token refresh, and auth state changes.
 * Uses Result pattern - never throws exceptions.
 */

import type { AeroFetch } from '../lib/fetch';
import type { StorageAdapter } from '../lib/helpers';
import type { User, Session, AeroDBError, AeroDBResponse } from '../types';
import type {
    SignUpCredentials,
    SignInCredentials,
    AuthResponse,
    AuthChangeEvent,
    AuthStateChangeCallback,
} from './types';
import { isBrowser } from '../lib/helpers';

const AUTH_STORAGE_KEY = 'aerodb.auth.token';
const REFRESH_STORAGE_KEY = 'aerodb.auth.refresh_token';

export class AuthClient {
    private fetch: AeroFetch;
    private storage: StorageAdapter;
    private authUrl: string;
    private listeners: Set<AuthStateChangeCallback> = new Set();
    private currentSession: Session | null = null;

    constructor(
        baseUrl: string,
        fetch: AeroFetch,
        storage: StorageAdapter
    ) {
        this.authUrl = `${baseUrl}/auth`;
        this.fetch = fetch;
        this.storage = storage;

        // Initialize session from storage
        this.initializeSession();

        // Listen for storage events (multi-tab sync in browser)
        if (isBrowser()) {
            window.addEventListener('storage', this.handleStorageEvent.bind(this));
        }
    }

    /**
     * Initialize session from storage
     */
    private initializeSession(): void {
        const token = this.storage.getItem(AUTH_STORAGE_KEY);
        const refreshToken = this.storage.getItem(REFRESH_STORAGE_KEY);

        if (token && refreshToken) {
            this.currentSession = {
                access_token: token,
                refresh_token: refreshToken,
            };
        }
    }

    /**
     * Handle storage events for multi-tab sync
     */
    private handleStorageEvent(event: StorageEvent): void {
        if (event.key === AUTH_STORAGE_KEY) {
            if (event.newValue) {
                const refreshToken = this.storage.getItem(REFRESH_STORAGE_KEY);
                this.currentSession = {
                    access_token: event.newValue,
                    refresh_token: refreshToken ?? '',
                };
                this.notifyListeners('SIGNED_IN', this.currentSession);
            } else {
                this.currentSession = null;
                this.notifyListeners('SIGNED_OUT', null);
            }
        }
    }

    /**
     * Notify all auth state listeners
     */
    private notifyListeners(event: AuthChangeEvent, session: Session | null): void {
        for (const callback of this.listeners) {
            try {
                callback(event, session);
            } catch {
                // Ignore listener errors
            }
        }
    }

    /**
     * Store session tokens
     */
    private storeSession(session: Session): void {
        this.storage.setItem(AUTH_STORAGE_KEY, session.access_token);
        this.storage.setItem(REFRESH_STORAGE_KEY, session.refresh_token);
        this.currentSession = session;
    }

    /**
     * Clear session tokens
     */
    private clearSession(): void {
        this.storage.removeItem(AUTH_STORAGE_KEY);
        this.storage.removeItem(REFRESH_STORAGE_KEY);
        this.currentSession = null;
    }

    /**
     * Sign up a new user
     */
    async signUp(credentials: SignUpCredentials): Promise<AuthResponse> {
        const result = await this.fetch<{
            user: User;
            access_token: string;
            refresh_token: string;
            expires_in: number;
        }>(`${this.authUrl}/signup`, {
            method: 'POST',
            body: JSON.stringify({
                email: credentials.email,
                password: credentials.password,
                metadata: credentials.options?.data,
            }),
        });

        if (result.error || !result.data) {
            return { data: null, error: result.error };
        }

        const session: Session = {
            access_token: result.data.access_token,
            refresh_token: result.data.refresh_token,
            expires_in: result.data.expires_in,
        };

        this.storeSession(session);
        this.notifyListeners('SIGNED_IN', session);

        return {
            data: {
                user: result.data.user,
                session,
            },
            error: null,
        };
    }

    /**
     * Sign in with email and password
     */
    async signIn(credentials: SignInCredentials): Promise<AuthResponse> {
        const result = await this.fetch<{
            user: User;
            access_token: string;
            refresh_token: string;
            expires_in: number;
        }>(`${this.authUrl}/login`, {
            method: 'POST',
            body: JSON.stringify({
                email: credentials.email,
                password: credentials.password,
            }),
        });

        if (result.error || !result.data) {
            return { data: null, error: result.error };
        }

        const session: Session = {
            access_token: result.data.access_token,
            refresh_token: result.data.refresh_token,
            expires_in: result.data.expires_in,
        };

        this.storeSession(session);
        this.notifyListeners('SIGNED_IN', session);

        return {
            data: {
                user: result.data.user,
                session,
            },
            error: null,
        };
    }

    /**
     * Sign out the current user
     */
    async signOut(): Promise<{ error: AeroDBError | null }> {
        const refreshToken = this.storage.getItem(REFRESH_STORAGE_KEY);

        if (refreshToken) {
            await this.fetch(`${this.authUrl}/logout`, {
                method: 'POST',
                body: JSON.stringify({ refresh_token: refreshToken }),
            });
        }

        this.clearSession();
        this.notifyListeners('SIGNED_OUT', null);

        return { error: null };
    }

    /**
     * Get the current authenticated user
     */
    async getUser(): Promise<AeroDBResponse<User>> {
        if (!this.currentSession) {
            return {
                data: null,
                error: { message: 'Not authenticated', code: 'NOT_AUTHENTICATED' },
            };
        }

        const result = await this.fetch<User>(`${this.authUrl}/user`, {
            method: 'GET',
        });

        return {
            data: result.data,
            error: result.error,
        };
    }

    /**
     * Get the current session
     */
    getSession(): Session | null {
        return this.currentSession;
    }

    /**
     * Refresh the access token
     */
    async refreshSession(): Promise<AeroDBResponse<Session>> {
        const refreshToken = this.storage.getItem(REFRESH_STORAGE_KEY);

        if (!refreshToken) {
            return {
                data: null,
                error: { message: 'No refresh token', code: 'NO_REFRESH_TOKEN' },
            };
        }

        const result = await this.fetch<{
            access_token: string;
            refresh_token: string;
            expires_in: number;
        }>(`${this.authUrl}/refresh`, {
            method: 'POST',
            body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (result.error || !result.data) {
            this.clearSession();
            this.notifyListeners('SIGNED_OUT', null);
            return { data: null, error: result.error };
        }

        const session: Session = {
            access_token: result.data.access_token,
            refresh_token: result.data.refresh_token,
            expires_in: result.data.expires_in,
        };

        this.storeSession(session);
        this.notifyListeners('TOKEN_REFRESHED', session);

        return { data: session, error: null };
    }

    /**
     * Subscribe to auth state changes
     */
    onAuthStateChange(callback: AuthStateChangeCallback): { unsubscribe: () => void } {
        this.listeners.add(callback);

        // Immediately call with current state
        if (this.currentSession) {
            callback('SIGNED_IN', this.currentSession);
        }

        return {
            unsubscribe: () => {
                this.listeners.delete(callback);
            },
        };
    }

    /**
     * Update user password
     */
    async updatePassword(
        currentPassword: string,
        newPassword: string
    ): Promise<{ error: AeroDBError | null }> {
        const result = await this.fetch(`${this.authUrl}/password`, {
            method: 'PUT',
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword,
            }),
        });

        return { error: result.error };
    }

    /**
     * Request password reset email
     */
    async resetPasswordForEmail(email: string): Promise<{ error: AeroDBError | null }> {
        const result = await this.fetch(`${this.authUrl}/forgot-password`, {
            method: 'POST',
            body: JSON.stringify({ email }),
        });

        return { error: result.error };
    }
}
