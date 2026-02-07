# Getting Started with @aerodb/client

The official JavaScript/TypeScript SDK for AeroDB - a strict, deterministic, self-hostable database with BaaS capabilities.

## Prerequisites

- Node.js 16+ or modern browser
- TypeScript 5+ (recommended but optional)
- An AeroDB instance (self-hosted or managed)

## Installation

```bash
npm install @aerodb/client
# or
yarn add @aerodb/client
# or
pnpm add @aerodb/client
```

##

 Quick Start

### 1. Initialize the Client

```typescript
import { AeroDBClient } from '@aerodb/client';

const client = new AeroDBClient({
  url: 'https://your-project.aerodb.com',
  key: 'your-api-key', // Optional if using email/password auth
});
```

### 2. Authenticate

```typescript
// Sign up new user
const { data, error } = await client.auth.signUp({
  email: 'user@example.com',
  password: 'securepassword123',
});

// Or sign in existing user
const { data, error } = await client.auth.signIn({
  email: 'user@example.com',
  password: 'securepassword123',
});

if (error) {
  console.error('Authentication failed:', error.message);
} else {
  console.log('Logged in as:', data.user.email);
}
```

### 3. Query Data

```typescript
// Fetch all users
const { data: users } = await client
  .from('users')
  .select('*')
  .execute();

// Fetch with filters
const { data: admins } = await client
  .from('users')
  .select('id, name, email')
  .eq('role', 'admin')
  .order('created_at', { ascending: false })
  .limit(10)
  .execute();

console.log('Admin users:', admins);
```

### 4. Insert & Update Data

```typescript
// Insert
const { data: newPost } = await client
  .from('posts')
  .insert({
    title: 'Hello World',
    content: 'My first AeroDB post',
    author_id: 'user-123',
  });

// Update
await client
  .from('posts')
  .eq('id', newPost.id)
  .update({ published: true });

// Delete
await client
  .from('posts')
  .eq('id', newPost.id)
  .delete();
```

### 5. Real-time Subscriptions

```typescript
// Subscribe to database changes
const channel = client.channel('posts')
  .on('INSERT', (payload) => {
    console.log('New post:', payload.new);
  })
  .on('UPDATE', (payload) => {
    console.log('Post updated:', payload.new);
  })
  .on('DELETE', (payload) => {
    console.log('Post deleted:', payload.old);
  })
  .subscribe();

// Cleanup
// channel.unsubscribe();
```

### 6. File Storage

```typescript
// Upload file
const file = document.querySelector('input[type="file"]').files[0];
const { data: uploadedFile } = await client.storage
  .from('avatars')
  .upload(`users/${userId}/avatar.png`, file);

// Get public URL
const url = client.storage
  .from('avatars')
  .getPublicUrl(`users/${userId}/avatar.png`);

// Download file
const { data: blob } = await client.storage
  .from('avatars')
  .download(`users/${userId}/avatar.png`);
```

### 7. Serverless Functions

```typescript
const { data, error } = await client.functions.invoke('send-email', {
  body: {
    to: 'user@example.com',
    subject: 'Welcome!',
    text: 'Thanks for signing up',
  },
});
```

## TypeScript Support

Full type safety with generics:

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  created_at: string;
}

// Type-safe queries
const { data } = await client
  .from<User>('users')
  .eq('role', 'admin') // ✅ TypeScript knows 'role' is a valid field
  .execute();

// data is User[] | null, fully typed!
```

## Error Handling

All methods return `{ data, error }`:

```typescript
const { data, error } = await client.from('users').select('*').execute();

if (error) {
  // Handle error - no exception thrown
  console.error(`Error ${error.status}: ${error.message}`);
  return;
}

// Safely use data
console.log(data);
```

## Common Patterns

### Paginated Lists

```typescript
const page = 1;
const perPage = 20;

const { data: users } = await client
  .from('users')
  .select('*')
  .order('created_at', { ascending: false })
  .offset((page - 1) * perPage)
  .limit(perPage)
  .execute();
```

### Search

```typescript
const { data: results } = await client
  .from('posts')
  .select('*')
  .ilike('title', '%search term%')
  .execute();
```

### Joins (via nested selects)

```typescript
const { data: posts } = await client
  .from('posts')
  .select('*, author:users(id, name)')
  .execute();

// Returns: [{ id, title, author: { id, name } }, ...]
```

### Auth State Listener

```typescript
client.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    console.log('User logged in:', session);
  } else if (event === 'SIGNED_OUT') {
    console.log('User logged out');
  }
});
```

## Next Steps

- [Architecture](./ARCHITECTURE.md) - Learn how the SDK is structured
- [API Reference](./API_REFERENCE.md) - Complete API documentation
- [Authentication Guide](./AUTHENTICATION.md) - Auth flows and best practices
- [Database Guide](./DATABASE.md) - Advanced querying
- [Real-time Guide](./REALTIME.md) - WebSocket subscriptions
- [Storage Guide](./STORAGE.md) - File uploads and management
- [Best Practices](./BEST_PRACTICES.md) - Patterns and anti-patterns
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues

## Community & Support

- **GitHub**: [aerodb/aerodb-js](https://github.com/aerodb/aerodb-js)
- **Discord**: [Join our community](https://discord.gg/aerodb)
- **Documentation**: [docs.aerodb.com](https://docs.aerodb.com)
- **Issues**: [Report bugs](https://github.com/aerodb/aerodb-js/issues)

## License

MIT - See [LICENSE](../LICENSE) for details
