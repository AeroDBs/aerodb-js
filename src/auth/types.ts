/**
 * Auth module type definitions
 */

import type { User, Session, AeroDBError } from '../types';

/**
 * Sign up request payload
 */
export interface SignUpCredentials {
    email: string;
    password: string;
    options?: {
        data?: Record<string, unknown>;
        emailRedirectTo?: string;
    };
}

/**
 * Sign in request payload
 */
export interface SignInCredentials {
    email: string;
    password: string;
}

/**
 * Auth response with user and session
 */
export interface AuthResponse {
    data: {
        user: User;
        session: Session;
    } | null;
    error: AeroDBError | null;
}

/**
 * Auth state change event types
 */
export type AuthChangeEvent =
    | 'SIGNED_IN'
    | 'SIGNED_OUT'
    | 'TOKEN_REFRESHED'
    | 'USER_UPDATED';

/**
 * Auth state change callback
 */
export type AuthStateChangeCallback = (
    event: AuthChangeEvent,
    session: Session | null
) => void;

/**
 * Password update request
 */
export interface UpdatePasswordCredentials {
    currentPassword: string;
    newPassword: string;
}
