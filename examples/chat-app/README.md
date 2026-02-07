# AeroDB Realtime Chat Example

A real-time chat application demonstrating presence tracking and broadcast messaging.

## Features

- User authentication
- Real-time message delivery
- User presence (online/offline status)
- Multiple chat rooms
- Typing indicators

## Setup

```bash
npm install
npm run dev
```

## Code Walkthrough

### Initialize Client

```typescript
import { AeroDBClient } from '@aerodb/client';

const client = new AeroDBClient({
  url: 'http://localhost:8080',
  key: 'your-api-key',
});
```

### Message Types

```typescript
interface Message {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  name: string;
}

interface PresenceState {
  userId: string;
  username: string;
  online: boolean;
  lastSeen: string;
}
```

### Chat Room Management

```typescript
class ChatRoom {
  private channel: ReturnType<typeof client.channel>;
  private onlineUsers: Map<string, PresenceState> = new Map();

  constructor(
    private roomId: string,
    private currentUser: User
  ) {}

  // Join the room
  async join() {
    this.channel = client.channel(`room:${this.roomId}`, {
      presence: {
        key: this.currentUser.id,
      },
    });

    // Listen for new messages
    this.channel.on('broadcast', { event: 'message' }, (payload) => {
      this.onMessage(payload.payload as Message);
    });

    // Listen for typing indicators
    this.channel.on('broadcast', { event: 'typing' }, (payload) => {
      this.onTyping(payload.payload.userId, payload.payload.isTyping);
    });

    // Track presence
    this.channel
      .on('presence', { event: 'sync' }, () => {
        const state = this.channel.presenceState();
        this.onlineUsers.clear();
        Object.values(state).forEach((presences: any[]) => {
          presences.forEach((p) => this.onlineUsers.set(p.userId, p));
        });
        this.onPresenceChange([...this.onlineUsers.values()]);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        newPresences.forEach((p: PresenceState) => {
          this.onlineUsers.set(p.userId, p);
        });
        this.onPresenceChange([...this.onlineUsers.values()]);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        leftPresences.forEach((p: PresenceState) => {
          this.onlineUsers.delete(p.userId);
        });
        this.onPresenceChange([...this.onlineUsers.values()]);
      });

    // Subscribe and track presence
    await this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await this.channel.track({
          userId: this.currentUser.id,
          username: this.currentUser.name,
          online: true,
          lastSeen: new Date().toISOString(),
        });
      }
    });
  }

  // Send a message
  async sendMessage(content: string) {
    // Persist to database
    const { data, error } = await client
      .from<Message>('messages')
      .insert({
        room_id: this.roomId,
        user_id: this.currentUser.id,
        content,
      })
      .execute();

    if (error) throw error;

    // Broadcast to room
    await this.channel.send({
      type: 'broadcast',
      event: 'message',
      payload: data![0],
    });
  }

  // Send typing indicator
  async setTyping(isTyping: boolean) {
    await this.channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        userId: this.currentUser.id,
        isTyping,
      },
    });
  }

  // Load message history
  async loadHistory(limit = 50): Promise<Message[]> {
    const { data, error } = await client
      .from<Message>('messages')
      .select('*')
      .eq('room_id', this.roomId)
      .order('created_at', { ascending: false })
      .limit(limit)
      .execute();

    if (error) throw error;
    return (data ?? []).reverse();
  }

  // Leave the room
  async leave() {
    await this.channel.untrack();
    await this.channel.unsubscribe();
  }

  // Override these in your app
  onMessage(message: Message) {
    console.log('New message:', message);
  }

  onTyping(userId: string, isTyping: boolean) {
    console.log(userId, isTyping ? 'is typing...' : 'stopped typing');
  }

  onPresenceChange(users: PresenceState[]) {
    console.log('Online users:', users.map((u) => u.username));
  }
}
```

### Using the Chat Room

```typescript
async function main() {
  // Sign in
  const { data } = await client.auth.signIn({
    email: 'user@example.com',
    password: 'password123',
  });

  const currentUser = {
    id: data!.user.id,
    email: data!.user.email,
    name: data!.user.email.split('@')[0],
  };

  // Create and join a room
  const room = new ChatRoom('general', currentUser);

  // Override handlers
  room.onMessage = (msg) => {
    console.log(`[${msg.user_id}]: ${msg.content}`);
  };

  room.onPresenceChange = (users) => {
    console.log(`${users.length} users online`);
  };

  // Join the room
  await room.join();

  // Load history
  const history = await room.loadHistory();
  console.log('Previous messages:', history.length);

  // Send a message
  await room.sendMessage('Hello everyone!');

  // Show typing indicator
  await room.setTyping(true);
  // ... user is typing ...
  await room.setTyping(false);

  // Leave room on exit
  process.on('SIGINT', async () => {
    await room.leave();
    await client.auth.signOut();
    process.exit(0);
  });
}

main();
```

## Database Schema

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX messages_room_idx ON messages(room_id, created_at);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Anyone can read messages
CREATE POLICY "Messages are public"
  ON messages FOR SELECT
  USING (true);

-- Authenticated users can insert
CREATE POLICY "Authenticated users can send messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```
