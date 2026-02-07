# @aerodb/client

Official JavaScript/TypeScript SDK for AeroDB.

## Installation

```bash
npm install @aerodb/client
# or
yarn add @aerodb/client
# or
pnpm add @aerodb/client
```

## Quick Start

```typescript
import { AeroDBClient } from '@aerodb/client';

// Initialize client
const client = new AeroDBClient({
  url: 'https://your-project.aerodb.com',
  key: 'your-api-key', // optional if using signIn
});

// Authentication
const { data, error } = await client.auth.signIn({
  email: 'user@example.com',
  password: 'password123',
});

// Database queries
const { data: users } = await client
  .from('users')
  .select('id, name, email')
  .eq('role', 'admin')
  .limit(10)
  .execute();

// Insert data
await client.from('posts').insert({
  title: 'Hello World',
  content: 'My first post',
});

// Real-time subscriptions
client.channel('messages')
  .on('INSERT', (payload) => {
    console.log('New message:', payload.new);
  })
  .subscribe();

// Storage
const { data: file } = await client.storage
  .from('avatars')
  .upload('user-123.png', fileBlob);

// Functions
const { data: result } = await client.functions.invoke('hello-world', {
  body: { name: 'John' },
});
```

## API Reference

### AeroDBClient

Main entry point. Creates authenticated connections to AeroDB.

```typescript
const client = new AeroDBClient({
  url: string;              // Required: Base URL
  key?: string;             // API key
  schema?: string;          // Database schema (default: 'public')
  headers?: Record<string, string>;
  realtime?: { url: string };
});
```

### Authentication

```typescript
// Sign up
const { data, error } = await client.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
});

// Sign in
const { data, error } = await client.auth.signIn({
  email: 'user@example.com',
  password: 'password123',
});

// Sign out
await client.auth.signOut();

// Get current user
const { data: user } = await client.auth.getUser();

// Listen for auth changes
const { unsubscribe } = client.auth.onAuthStateChange((event, session) => {
  console.log(event, session);
});
```

### Database

```typescript
// Select with filters
const { data } = await client
  .from<User>('users')
  .select('id, name, email')
  .eq('role', 'admin')
  .gt('age', 18)
  .order('created_at', { ascending: false })
  .limit(10)
  .execute();

// Insert
await client.from('users').insert({ name: 'John' });

// Update
await client.from('users').eq('id', '123').update({ name: 'Jane' });

// Delete
await client.from('users').eq('id', '123').delete();
```

**Available filters:** `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `like`, `ilike`, `in`, `is`

### Real-time

```typescript
const channel = client.channel('posts')
  .on('INSERT', (payload) => console.log('New:', payload.new))
  .on('UPDATE', (payload) => console.log('Updated:', payload.new))
  .on('DELETE', (payload) => console.log('Deleted:', payload.old))
  .subscribe();

// Unsubscribe
channel.unsubscribe();
```

### Storage

```typescript
// Upload
await client.storage.from('bucket').upload('path/file.png', file);

// Download
const { data: blob } = await client.storage.from('bucket').download('path/file.png');

// Delete
await client.storage.from('bucket').remove('path/file.png');

// List
const { data: files } = await client.storage.from('bucket').list('path/');
```

### Functions

```typescript
const { data, error } = await client.functions.invoke('my-function', {
  body: { foo: 'bar' },
});
```

## Error Handling

All methods return `{ data, error }` - no exceptions thrown.

```typescript
const { data, error } = await client.from('users').execute();

if (error) {
  console.error(error.message);
  return;
}

console.log(data);
```

## TypeScript

Full TypeScript support with generics:

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

const { data } = await client
  .from<User>('users')
  .eq('role', 'admin') // Type-safe: 'role' must be keyof User
  .execute();

// data is User[] | null
```

## Retry Utility

Automatic retry with exponential backoff for flaky requests:

```typescript
import { withRetry } from '@aerodb/client';

// Retry a function up to 3 times
const data = await withRetry(
  () => client.from('users').execute(),
  {
    maxAttempts: 3,
    initialDelay: 1000,
    onRetry: (attempt, error, delay) => {
      console.log(`Retry ${attempt} after ${delay}ms:`, error.message);
    },
  }
);
```

## Examples

See the [examples](./examples) directory for complete applications:

| Example | Features |
|---------|----------|
| [Todo App](./examples/todo-app) | Auth, CRUD, Realtime subscriptions |
| [Chat App](./examples/chat-app) | Realtime messaging, Presence tracking |
| [File Upload](./examples/file-upload) | Storage, Signed URLs, Avatar management |

## Contributing

Contributions are welcome! Please read our contributing guide before submitting a PR.

## License

MIT
