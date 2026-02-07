/**
 * RealtimeClient - WebSocket connection manager
 *
 * Manages WebSocket connection lifecycle with auto-reconnection.
 * Uses lazy connection - connects on first subscribe.
 */

import type { StorageAdapter } from '../lib/helpers';
import { REALTIME_CONFIG } from '../lib/constants';
import { RealtimeChannel } from './RealtimeChannel';
import type { ConnectionState, RealtimePayload } from './types';

export class RealtimeClient {
    private wsUrl: string;
    private apiKey: string | undefined;
    private storage: StorageAdapter;
    private ws: WebSocket | null = null;
    private channels: Map<string, RealtimeChannel> = new Map();
    private connectionState: ConnectionState = 'DISCONNECTED';
    private reconnectAttempts: number = 0;
    private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    private messageQueue: object[] = [];

    constructor(
        wsUrl: string,
        apiKey: string | undefined,
        storage: StorageAdapter
    ) {
        this.wsUrl = wsUrl;
        this.apiKey = apiKey;
        this.storage = storage;
    }

    /**
     * Get current connection state
     */
    getConnectionState(): ConnectionState {
        return this.connectionState;
    }

    /**
     * Create or get a channel
     */
    channel(name: string): RealtimeChannel {
        if (this.channels.has(name)) {
            return this.channels.get(name)!;
        }

        const channel = new RealtimeChannel(
            name,
            this.sendMessage.bind(this),
            this.handleChannelSubscribe.bind(this),
            this.handleChannelUnsubscribe.bind(this)
        );

        this.channels.set(name, channel);
        return channel;
    }

    /**
     * Connect to WebSocket server
     */
    connect(): void {
        if (this.connectionState === 'CONNECTED' || this.connectionState === 'CONNECTING') {
            return;
        }

        this.connectionState = 'CONNECTING';

        // Build WebSocket URL with auth
        let url = this.wsUrl;
        const params = new URLSearchParams();

        if (this.apiKey) {
            params.set('apikey', this.apiKey);
        }

        const accessToken = this.storage.getItem('aerodb.auth.token');
        if (accessToken) {
            params.set('token', accessToken);
        }

        const queryString = params.toString();
        if (queryString) {
            url += (url.includes('?') ? '&' : '?') + queryString;
        }

        try {
            this.ws = new WebSocket(url);
            this.setupWebSocket();
        } catch {
            this.handleDisconnect();
        }
    }

    /**
     * Disconnect from WebSocket server
     */
    disconnect(): void {
        this.stopHeartbeat();
        this.stopReconnect();

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.connectionState = 'DISCONNECTED';
        this.channels.clear();
        this.messageQueue = [];
    }

    /**
     * Setup WebSocket event handlers
     */
    private setupWebSocket(): void {
        if (!this.ws) return;

        this.ws.onopen = () => {
            this.connectionState = 'CONNECTED';
            this.reconnectAttempts = 0;
            this.startHeartbeat();
            this.flushMessageQueue();
            this.resubscribeChannels();
        };

        this.ws.onclose = () => {
            this.handleDisconnect();
        };

        this.ws.onerror = () => {
            // Error is followed by close, so we just log
        };

        this.ws.onmessage = (event) => {
            this.handleMessage(event.data);
        };
    }

    /**
     * Handle WebSocket message
     */
    private handleMessage(data: string): void {
        try {
            const message = JSON.parse(data) as {
                type: string;
                channel?: string;
                event?: RealtimePayload;
                payload?: RealtimePayload;
            };

            if (message.type === 'event' && message.channel) {
                const channel = this.channels.get(message.channel);
                if (channel && message.payload) {
                    channel.dispatch(message.payload);
                }
            }
            // Handle other message types (heartbeat responses, errors) silently
        } catch {
            // Ignore parse errors
        }
    }

    /**
     * Handle disconnect
     */
    private handleDisconnect(): void {
        this.stopHeartbeat();
        this.ws = null;

        if (this.connectionState !== 'DISCONNECTED') {
            this.connectionState = 'RECONNECTING';
            this.scheduleReconnect();
        }
    }

    /**
     * Schedule reconnection with exponential backoff
     */
    private scheduleReconnect(): void {
        if (this.reconnectTimeout) return;

        const delay = Math.min(
            REALTIME_CONFIG.RECONNECT_DELAY_MS * Math.pow(REALTIME_CONFIG.RECONNECT_BACKOFF_MULTIPLIER, this.reconnectAttempts),
            REALTIME_CONFIG.MAX_RECONNECT_DELAY_MS
        );

        this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            this.reconnectAttempts++;
            this.connect();
        }, delay);
    }

    /**
     * Stop reconnection attempts
     */
    private stopReconnect(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }

    /**
     * Start heartbeat timer
     */
    private startHeartbeat(): void {
        this.stopHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            this.sendMessage({ type: 'heartbeat' });
        }, REALTIME_CONFIG.HEARTBEAT_INTERVAL_MS);
    }

    /**
     * Stop heartbeat timer
     */
    private stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * Send a message over WebSocket
     */
    private sendMessage(message: object): void {
        if (this.connectionState !== 'CONNECTED' || !this.ws) {
            this.messageQueue.push(message);
            return;
        }

        try {
            this.ws.send(JSON.stringify(message));
        } catch {
            this.messageQueue.push(message);
        }
    }

    /**
     * Flush queued messages
     */
    private flushMessageQueue(): void {
        const queue = [...this.messageQueue];
        this.messageQueue = [];

        for (const message of queue) {
            this.sendMessage(message);
        }
    }

    /**
     * Resubscribe all channels after reconnect
     */
    private resubscribeChannels(): void {
        for (const channel of this.channels.values()) {
            if (channel.isSubscribed()) {
                this.sendMessage({
                    type: 'subscribe',
                    channel: channel.getName(),
                });
            }
        }
    }

    /**
     * Handle channel subscribe - connect if not connected
     */
    private handleChannelSubscribe(_channel: RealtimeChannel): void {
        if (this.connectionState === 'DISCONNECTED') {
            this.connect();
        }
    }

    /**
     * Handle channel unsubscribe - disconnect if no channels left
     */
    private handleChannelUnsubscribe(channel: RealtimeChannel): void {
        this.channels.delete(channel.getName());

        // Disconnect if no subscribed channels
        const hasSubscribed = Array.from(this.channels.values()).some((c) => c.isSubscribed());
        if (!hasSubscribed && this.channels.size === 0) {
            this.disconnect();
        }
    }
}
