# @aerodb/client Architecture

## Package Overview

The AeroDB JavaScript SDK is a modular, type-safe client library that provides a unified interface to all AeroDB services: authentication, database queries, real-time subscriptions, file storage, and serverless functions.

## Design Principles

1. **No Exceptions** - All methods return `{ data, error }` tuples
2. **Type Safety** - First-class TypeScript support with generics
3. **Fluent API** - Method chaining for query building
4. **Zero Dependencies** - Uses native fetch and WebSocket
5. **Tree-Shakeable** - Only bundle what you use

## Package Structure

```
@aerodb/client/
├── src/
│   ├── index.ts                 # Main exports
│   ├──AeroDBClient.ts          # Root client
│   ├── auth/
│   │   ├── AuthClient.ts       # Authentication
│   │   └── types.ts
│   ├── database/
│   │   ├── QueryBuilder.ts     # Fluent query API
│   │   ├── PostgrestClient.ts  # REST wrapper
│   │   └── types.ts
│   ├── realtime/
│   │   ├── RealtimeClient.ts   # WebSocket manager
│   │   ├── RealtimeChannel.ts  # Channel subscriptions
│   │   └── types.ts
│   ├── storage/
│   │   ├── StorageClient.ts    # File operations
│   │   ├── StorageBucket.ts    # Bucket interface
│   │   └── types.ts
│   ├── functions/
│   │   ├── FunctionsClient.ts  # Edge functions
│   │   └── types.ts
│   ├── lib/
│   │   ├── fetch.ts            # HTTP utilities
│   │   ├── constants.ts
│   │   └── helpers.ts
│   └── types/
│       └── index.ts            # Global types
└── tests/                       # Vitest tests
```

## Core Classes

### AeroDBClient

Entry point that composes all sub-clients:

```typescript
export class AeroDBClient {
  auth: AuthClient;
  private db: PostgrestClient;
  realtime: RealtimeClient;
  storage: StorageClient;
  functions: FunctionsClient;
  
  constructor(options: AeroDBClientOptions) {
    this.auth = new AuthClient(options);
    this.db = new PostgrestClient(options);
    this.realtime = new RealtimeClient(options);
    this.storage = new StorageClient(options);
    this.functions = new FunctionsClient(options);
  }
  
  // Convenience method
  from<T>(table: string) {
    return this.db.from<T>(table);
  }
  
  channel(name: string) {
    return this.realtime.channel(name);
  }
}
```

### QueryBuilder

Fluent API for building PostgREST-compatible queries:

```typescript
client.from('users')
  .select('id, name, email')
  .eq('role', 'admin')
  .gt('age', 18)
  .order('created_at', { ascending: false })
  .limit(10)
  .execute()
```

**Operators supported**: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `like`, `ilike`, `in`, `is`

### RealtimeChannel

WebSocket-based pub/sub:

```typescript
client.channel('posts')
  .on('INSERT', handler)
  .on('UPDATE', handler)
  .on('DELETE', handler)
  .subscribe()
```

## Type System

```typescript
// Response envelope
interface AeroDBResponse<T> {
  data: T | null;
  error: AeroDBError | null;
}

// Error format
interface AeroDBError {
  message: string;
  status?: number;
  code?: string;
}

// Generic query result
const { data } = await client.from<User>('users').execute();
// data: User[] | null
```

## HTTP Communication

All HTTP requests use:
- **Method**: Based on operation (GET, POST, PATCH, DELETE)
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Base URL**: `{url}/rest/v1/{table}` for database
- **Query Params**: Filters converted to PostgREST format

Example: `.eq('role', 'admin')` → `?role=eq.admin`

## WebSocket Protocol

Real-time uses WebSocket at `{realtimeUrl || url}/realtime`:

```json
// Subscribe
{ "type": "subscribe", "channel": "posts" }

// Event received
{
  "type": "event",
  "channel": "posts",
  "payload": {
    "type": "INSERT",
    "new": { "id": 1, "title": "Hello" }
  }
}

// Unsubscribe
{ "type": "unsubscribe", "channel": "posts" }
```

## Authentication Flow

1. User calls `client.auth.signIn(email, password)`
2. SDK sends POST to `/auth/login`
3. Response contains `access_token` and `refresh_token`
4. Tokens stored in `localStorage`
5. All subsequent requests include `Authorization: Bearer <access_token>`
6. SDK auto-refreshes on 401 responses

## Module Boundaries

| Module | Responsibility | Dependencies |
|--------|---------------|--------------|
| `AeroDBClient` | Entry point, composes sub-clients | All modules |
| `AuthClient` | Sign up, sign in, session management | `lib/fetch` |
| `PostgrestClient` | REST API wrapper | `QueryBuilder`, `lib/fetch` |
| `QueryBuilder` | Fluent query interface | None |
| `RealtimeClient` | WebSocket connection manager | `RealtimeChannel` |
| `RealtimeChannel` | Pub/sub for database changes | None |
| `StorageClient` | File upload/download | `StorageBucket`, `lib/fetch` |
| `FunctionsClient` | Edge function invocation | `lib/fetch` |

## Build & Distribution

- **Bundler**: tsup
- **Formats**: ESM (`.js`), CJS (`.cjs`), TypeScript (`.d.ts`)
- **Entry Points**:
  - `import { AeroDBClient } from '@aerodb/client'` (ESM)
  - `const { AeroDBClient } = require('@aerodb/client')` (CJS)
- **Bundle Size**: ~12KB minified + gzipped

## Testing Strategy

- **Unit Tests**: Vitest for all modules
- **Integration Tests**: Against local AeroDB instance
- **Type Tests**: TypeScript strict mode compilation
- **E2E Tests**: Real-world scenarios in examples/

## Browser Compatibility

| Feature | Support |
|---------|---------|
| Fetch API | Modern browsers + Node 18+ |
| WebSockets | All browsers + Node |
| LocalStorage | Browsers only (Node: custom storage adapter) |
| FormData | All environments |

For Node.js environments without `localStorage`, provide custom storage:

```typescript
const client = new AeroDBClient({
  url: '...',
  storage: {
    getItem: (key) => myCache.get(key),
    setItem: (key, value) => myCache.set(key, value),
    removeItem: (key) => myCache.delete(key),
  },
});
```

## Performance Considerations

1. **Connection Pooling**: Fetch reuses HTTP/2 connections
2. **Lazy Initialization**: Sub-clients created on-demand
3. **Query Batching**: Not implemented (future consideration)
4. **Caching**: None (delegated to user via SWR/React Query)

## Security

- **HTTPS Only**: Enforced in production
- **Token Storage**: LocalStorage (XSS risk - document alternatives)
- **CORS**: Handled by AeroDB server
- **Content Security Policy**: No inline scripts or evals

## Future Enhancements

- [ ] Offline support with local cache
- [ ] Request retry with exponential backoff
- [ ] Query batching for bulk operations
- [ ] Streaming uploads for large files
- [ ] Connection health monitoring
