# API Reference - @aerodb/client

Complete API documentation for the AeroDB JavaScript/TypeScript SDK.

## Table of Contents

- [AeroDBClient](#aerodbclient)
- [Authentication](#authentication)
- [Database](#database)
- [Real-time](#real-time)
- [Storage](#storage)
- [Functions](#functions)
- [Types](#types)

---

## AeroDBClient

Main entry point for the SDK.

### Constructor

```typescript
new AeroDBClient(options: AeroDBClientOptions)
```

**Options:**
```typescript
interface AeroDBClientOptions {
  url: string;              // Required: Base API URL
  key?: string;             // API key (optional if using email/password)
  schema?: string;          // Database schema (default: 'public')
  headers?: Record<string, string>;  // Custom HTTP headers
  realtime?: { url: string };        // Override WebSocket URL
}
```

**Example:**
```typescript
const client = new AeroDBClient({
  url: 'https://api.aerodb.com',
  key: 'aero_abc123...',
});
```

### Properties

- `auth: AuthClient` - Authentication methods
- `storage: StorageClient` - File upload/download
- `functions: FunctionsClient` - Serverless functions
- `realtime: RealtimeClient` - WebSocket client

### Methods

#### `from<T>(table: string): QueryBuilder<T>`

Create a query builder for a table.

```typescript
const users = await client.from<User>('users').select('*').execute();
```

#### `channel(name: string): RealtimeChannel`

Create a real-time channel subscription.

```typescript
client.channel('posts').on('INSERT', handler).subscribe();
```

---

## Authentication

### `auth.signUp(options)`

Create a new user account.

```typescript
const { data, error} = await client.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
});
```

**Returns:** `AeroDBResponse<{ user: User; session: Session }>`

### `auth.signIn(options)`

Sign in an existing user.

```typescript
const { data, error } = await client.auth.signIn({
  email: 'user@example.com',
  password: 'password123',
});
```

**Returns:** `AeroDBResponse<{ user: User; session: Session }>`

### `auth.signOut()`

Sign out the current user.

```typescript
await client.auth.signOut();
```

**Returns:** `Promise<{ error: AeroDBError | null }>`

### `auth.getUser()`

Get the currently signed-in user.

```typescript
const { data: user, error } = await client.auth.getUser();
```

**Returns:** `AeroDBResponse<User>`

### `auth.refreshSession()`

Refresh the current session.

```typescript
const { data: session, error } = await client.auth.refreshSession();
```

**Returns:** `AeroDBResponse<Session>`

### `auth.onAuthStateChange(callback)`

Listen for authentication state changes.

```typescript
client.auth.onAuthStateChange((event, session) => {
  console.log(event); // 'SIGNED_IN' | 'SIGNED_OUT'
});
```

---

## Database

### Query Builder Methods

All methods return `this` for chaining except `execute()`.

#### `select(columns: string = '*')`

Specify columns to return.

```typescript
.select('id, name, email')
.select('*')
.select('id, author:users(name)')  // Join
```

#### `eq(column, value)`

Filter where column equals value.

```typescript
.eq('status', 'active')
.eq('age', 25)
```

#### `neq(column, value)`

Filter where column does not equal value.

```typescript
.neq('role', 'guest')
```

#### `gt(column, value)` / `gte(column, value)`

Greater than / greater than or equal.

```typescript
.gt('age', 18)
.gte('score', 100)
```

#### `lt(column, value)` / `lte(column, value)`

Less than / less than or equal.

```typescript
.lt('price', 100)
.lte('quantity', 10)
```

#### `like(column, pattern)` / `ilike(column, pattern)`

Pattern matching (case-sensitive / case-insensitive).

```typescript
.like('name', '%John%')
.ilike('email', '%@gmail.com')
```

#### `in(column, values)`

Filter where column is in list.

```typescript
.in('status', ['active', 'pending', 'archived'])
```

#### `is(column, value)`

Filter for NULL or boolean values.

```typescript
.is('deleted_at', null)
.is('is_admin', true)
```

#### `order(column, options?)`

Sort results.

```typescript
.order('created_at', { ascending: false })
.order('name')  // ascending by default
```

#### `limit(count)`

Limit number of results.

```typescript
.limit(10)
```

#### `offset(count)`

Skip a number of results.

```typescript
.offset(20)
```

#### `insert(data)`

Insert one or more rows.

```typescript
await client.from('users').insert({ name: 'John' });
await client.from('users').insert([{ name: 'Jane' }, { name: 'Bob' }]);
```

**Returns:** `Promise<AeroDBResponse<T[]>>`

#### `update(data)`

Update matching rows.

```typescript
await client.from('users').eq('id', '123').update({ name: 'Jane' });
```

**Returns:** `Promise<AeroDBResponse<T[]>>`

#### `delete()`

Delete matching rows.

```typescript
await client.from('users').eq('id', '123').delete();
```

**Returns:** `Promise<AeroDBResponse<void>>`

#### `execute()`

Execute the query.

```typescript
const { data, error } = await query.execute();
```

**Returns:** `Promise<AeroDBResponse<T[]>>`

---

## Real-time

### `channel(name: string): RealtimeChannel`

Create a new channel subscription.

```typescript
const channel = client.channel('posts');
```

### `RealtimeChannel.on(event, callback)`

Register event handler.

```typescript
channel.on('INSERT', (payload) => {
  console.log('New row:', payload.new);
});

channel.on('UPDATE', (payload) => {
  console.log('Updated row:', payload.new);
  console.log('Old row:', payload.old);
});

channel.on('DELETE', (payload) => {
  console.log('Deleted row:', payload.old);
});
```

**Events:** `'INSERT' | 'UPDATE' | 'DELETE'`

**Payload:**
```typescript
interface RealtimePayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  new?: Record<string, any>;
  old?: Record<string, any>;
}
```

### `RealtimeChannel.subscribe()`

Start listening for events.

```typescript
channel.subscribe();
```

### `RealimeChannel.unsubscribe()`

Stop listening and close connection.

```typescript
channel.unsubscribe();
```

---

## Storage

### `storage.from(bucket: string): StorageBucket`

Select a storage bucket.

```typescript
const bucket = client.storage.from('avatars');
```

### `StorageBucket.upload(path, file)`

Upload a file.

```typescript
const file = document.querySelector('input[type="file"]').files[0];
const { data, error } = await bucket.upload('user-123/avatar.png', file);
```

**Returns:** `AeroDBResponse<{ path: string; url: string }>`

### `StorageBucket.download(path)`

Download a file.

```typescript
const { data: blob, error } = await bucket.download('user-123/avatar.png');
```

**Returns:** `AeroDBResponse<Blob>`

### `StorageBucket.getPublicUrl(path)`

Get public URL for a file.

```typescript
const url = bucket.getPublicUrl('user-123/avatar.png');
```

**Returns:** `string`

### `StorageBucket.remove(paths)`

Delete one or more files.

```typescript
await bucket.remove('user-123/avatar.png');
await bucket.remove(['file1.png', 'file2.png']);
```

**Returns:** `AeroDBResponse<void>`

### `StorageBucket.list(path?, options?)`

List files in a path.

```typescript
const { data: files } = await bucket.list('users/', {
  limit: 100,
  offset: 0,
});
```

**Returns:** `AeroDBResponse<FileObject[]>`

---

## Functions

### `functions.invoke(name, options?)`

Invoke a serverless function.

```typescript
const { data, error } = await client.functions.invoke('send-email', {
  body: { to: 'user@example.com', subject: 'Hello' },
  headers: { 'X-Custom': 'value' },
});
```

**Options:**
```typescript
interface InvokeOptions {
  headers?: Record<string, string>;
  body?: any;
}
```

**Returns:** `AeroDBResponse<any>`

---

## Types

### `AeroDBResponse<T>`

```typescript
interface AeroDBResponse<T> {
  data: T | null;
  error: AeroDBError | null;
}
```

### `AeroDBError`

```typescript
interface AeroDBError {
  message: string;
  status?: number;
  code?: string;
}
```

### `User`

```typescript
interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}
```

### `Session`

```typescript
interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: User;
}
```

### `FileObject`

```typescript
interface FileObject {
  name: string;
  id: string;
  size: number;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
  metadata: Record<string, any>;
}
```
