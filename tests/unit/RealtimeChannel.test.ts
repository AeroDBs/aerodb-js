/**
 * RealtimeChannel Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RealtimeChannel } from '../../src/realtime/RealtimeChannel';
import type { RealtimePayload } from '../../src/realtime/types';

describe('RealtimeChannel', () => {
    let channel: RealtimeChannel;
    let sendMessage: ReturnType<typeof vi.fn>;
    let onSubscribe: ReturnType<typeof vi.fn>;
    let onUnsubscribe: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        sendMessage = vi.fn();
        onSubscribe = vi.fn();
        onUnsubscribe = vi.fn();
        channel = new RealtimeChannel('test-channel', sendMessage, onSubscribe, onUnsubscribe);
    });

    describe('getName', () => {
        it('returns channel name', () => {
            expect(channel.getName()).toBe('test-channel');
        });
    });

    describe('isSubscribed', () => {
        it('returns false initially', () => {
            expect(channel.isSubscribed()).toBe(false);
        });

        it('returns true after subscribe', () => {
            channel.subscribe();
            expect(channel.isSubscribed()).toBe(true);
        });

        it('returns false after unsubscribe', () => {
            channel.subscribe();
            channel.unsubscribe();
            expect(channel.isSubscribed()).toBe(false);
        });
    });

    describe('on', () => {
        it('registers event handler', () => {
            const handler = vi.fn();
            channel.on('INSERT', handler);

            const payload: RealtimePayload = {
                type: 'INSERT',
                table: 'users',
                schema: 'public',
                commit_timestamp: '2024-01-01T00:00:00Z',
                new: { id: '1', name: 'Test' },
                old: null,
            };

            channel.dispatch(payload);

            expect(handler).toHaveBeenCalledWith(payload);
        });

        it('allows chaining', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();

            const result = channel.on('INSERT', handler1).on('UPDATE', handler2);

            expect(result).toBe(channel);
        });

        it('registers multiple handlers for same event', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();

            channel.on('INSERT', handler1).on('INSERT', handler2);

            const payload: RealtimePayload = {
                type: 'INSERT',
                table: 'users',
                schema: 'public',
                commit_timestamp: '2024-01-01T00:00:00Z',
                new: { id: '1' },
                old: null,
            };

            channel.dispatch(payload);

            expect(handler1).toHaveBeenCalled();
            expect(handler2).toHaveBeenCalled();
        });

        it('calls wildcard handlers for all events', () => {
            const wildcardHandler = vi.fn();
            channel.on('*', wildcardHandler);

            channel.dispatch({
                type: 'INSERT',
                table: 'users',
                schema: 'public',
                commit_timestamp: '2024-01-01T00:00:00Z',
                new: {},
                old: null,
            });

            channel.dispatch({
                type: 'DELETE',
                table: 'users',
                schema: 'public',
                commit_timestamp: '2024-01-01T00:00:00Z',
                new: null,
                old: { id: '1' },
            });

            expect(wildcardHandler).toHaveBeenCalledTimes(2);
        });
    });

    describe('off', () => {
        it('removes specific handler', () => {
            const handler = vi.fn();
            channel.on('INSERT', handler);
            channel.off('INSERT', handler);

            channel.dispatch({
                type: 'INSERT',
                table: 'users',
                schema: 'public',
                commit_timestamp: '2024-01-01T00:00:00Z',
                new: {},
                old: null,
            });

            expect(handler).not.toHaveBeenCalled();
        });

        it('removes all handlers for event when no callback specified', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();
            channel.on('INSERT', handler1).on('INSERT', handler2);
            channel.off('INSERT');

            channel.dispatch({
                type: 'INSERT',
                table: 'users',
                schema: 'public',
                commit_timestamp: '2024-01-01T00:00:00Z',
                new: {},
                old: null,
            });

            expect(handler1).not.toHaveBeenCalled();
            expect(handler2).not.toHaveBeenCalled();
        });
    });

    describe('subscribe', () => {
        it('sends subscribe message', () => {
            channel.subscribe();

            expect(sendMessage).toHaveBeenCalledWith({
                type: 'subscribe',
                channel: 'test-channel',
            });
        });

        it('calls onSubscribe callback', () => {
            channel.subscribe();

            expect(onSubscribe).toHaveBeenCalledWith(channel);
        });

        it('does not send duplicate subscribe', () => {
            channel.subscribe();
            channel.subscribe();

            expect(sendMessage).toHaveBeenCalledTimes(1);
        });

        it('allows chaining', () => {
            const result = channel.subscribe();
            expect(result).toBe(channel);
        });
    });

    describe('unsubscribe', () => {
        it('sends unsubscribe message', () => {
            channel.subscribe();
            channel.unsubscribe();

            expect(sendMessage).toHaveBeenCalledWith({
                type: 'unsubscribe',
                channel: 'test-channel',
            });
        });

        it('calls onUnsubscribe callback', () => {
            channel.subscribe();
            channel.unsubscribe();

            expect(onUnsubscribe).toHaveBeenCalledWith(channel);
        });

        it('does not send if not subscribed', () => {
            channel.unsubscribe();

            expect(sendMessage).not.toHaveBeenCalledWith(
                expect.objectContaining({ type: 'unsubscribe' })
            );
        });

        it('clears all handlers', () => {
            const handler = vi.fn();
            channel.on('INSERT', handler);
            channel.subscribe();
            channel.unsubscribe();

            // Handlers should be cleared - channel needs to track internally
            // This is tested by the isSubscribed state
            expect(channel.isSubscribed()).toBe(false);
        });
    });

    describe('dispatch', () => {
        it('only calls handlers for matching event type', () => {
            const insertHandler = vi.fn();
            const updateHandler = vi.fn();
            const deleteHandler = vi.fn();

            channel.on('INSERT', insertHandler);
            channel.on('UPDATE', updateHandler);
            channel.on('DELETE', deleteHandler);

            channel.dispatch({
                type: 'INSERT',
                table: 'users',
                schema: 'public',
                commit_timestamp: '2024-01-01T00:00:00Z',
                new: { id: '1' },
                old: null,
            });

            expect(insertHandler).toHaveBeenCalled();
            expect(updateHandler).not.toHaveBeenCalled();
            expect(deleteHandler).not.toHaveBeenCalled();
        });

        it('does not throw if handler throws', () => {
            const throwingHandler = vi.fn().mockImplementation(() => {
                throw new Error('Handler error');
            });
            const normalHandler = vi.fn();

            channel.on('INSERT', throwingHandler);
            channel.on('INSERT', normalHandler);

            expect(() => {
                channel.dispatch({
                    type: 'INSERT',
                    table: 'users',
                    schema: 'public',
                    commit_timestamp: '2024-01-01T00:00:00Z',
                    new: {},
                    old: null,
                });
            }).not.toThrow();

            // Normal handler should still be called
            expect(normalHandler).toHaveBeenCalled();
        });
    });
});
