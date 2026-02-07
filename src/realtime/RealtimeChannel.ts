/**
 * RealtimeChannel - Subscription management for a single channel
 *
 * Handles event subscriptions and dispatches events to handlers.
 */

import type { RealtimeEventType, RealtimeHandler, RealtimePayload } from './types';

export class RealtimeChannel {
    private name: string;
    private handlers: Map<RealtimeEventType, Set<RealtimeHandler>> = new Map();
    private subscribed: boolean = false;
    private sendMessage: (message: object) => void;
    private onSubscribe: (channel: RealtimeChannel) => void;
    private onUnsubscribe: (channel: RealtimeChannel) => void;

    constructor(
        name: string,
        sendMessage: (message: object) => void,
        onSubscribe: (channel: RealtimeChannel) => void,
        onUnsubscribe: (channel: RealtimeChannel) => void
    ) {
        this.name = name;
        this.sendMessage = sendMessage;
        this.onSubscribe = onSubscribe;
        this.onUnsubscribe = onUnsubscribe;
    }

    /**
     * Get the channel name
     */
    getName(): string {
        return this.name;
    }

    /**
     * Check if subscribed
     */
    isSubscribed(): boolean {
        return this.subscribed;
    }

    /**
     * Register an event handler
     */
    on<T = Record<string, unknown>>(
        event: RealtimeEventType,
        callback: RealtimeHandler<T>
    ): this {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, new Set());
        }
        this.handlers.get(event)!.add(callback as RealtimeHandler);
        return this;
    }

    /**
     * Remove an event handler
     */
    off(event: RealtimeEventType, callback?: RealtimeHandler): this {
        if (!callback) {
            // Remove all handlers for this event
            this.handlers.delete(event);
        } else {
            const eventHandlers = this.handlers.get(event);
            if (eventHandlers) {
                eventHandlers.delete(callback);
            }
        }
        return this;
    }

    /**
     * Subscribe to the channel
     */
    subscribe(): this {
        if (this.subscribed) {
            return this;
        }

        this.sendMessage({
            type: 'subscribe',
            channel: this.name,
        });

        this.subscribed = true;
        this.onSubscribe(this);
        return this;
    }

    /**
     * Unsubscribe from the channel
     */
    unsubscribe(): void {
        if (!this.subscribed) {
            return;
        }

        this.sendMessage({
            type: 'unsubscribe',
            channel: this.name,
        });

        this.subscribed = false;
        this.handlers.clear();
        this.onUnsubscribe(this);
    }

    /**
     * Dispatch an event to handlers
     * Called by RealtimeClient when an event is received
     */
    dispatch(payload: RealtimePayload): void {
        // Call specific event handlers
        const eventHandlers = this.handlers.get(payload.type);
        if (eventHandlers) {
            for (const handler of eventHandlers) {
                try {
                    handler(payload);
                } catch {
                    // Ignore handler errors
                }
            }
        }

        // Call wildcard handlers
        const wildcardHandlers = this.handlers.get('*');
        if (wildcardHandlers) {
            for (const handler of wildcardHandlers) {
                try {
                    handler(payload);
                } catch {
                    // Ignore handler errors
                }
            }
        }
    }
}
