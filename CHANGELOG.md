# Changelog

All notable changes to the AeroDB JavaScript SDK will be documented in this file.

## [1.0.0] - 2026-02-08

### Added
- Initial release of the AeroDB JavaScript/TypeScript SDK
- **Authentication** (`client.auth`)
  - `signUp()` - Register new users
  - `signIn()` - Email/password login
  - `signOut()` - Logout and clear session
  - `getUser()` - Get current user
  - `refreshSession()` - Refresh access token
  - `onAuthStateChange()` - Listen for auth events
- **Database** (`client.from()`)
  - Full query builder with filters: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `like`, `ilike`, `in`, `is`
  - `select()`, `insert()`, `update()`, `delete()` operations
  - `order()`, `limit()`, `range()` modifiers
  - Full TypeScript generics support
- **Storage** (`client.storage`)
  - `listBuckets()` - List all buckets
  - `createBucket()` - Create new bucket
  - Bucket operations: `upload()`, `download()`, `remove()`, `list()`
  - `createSignedUrl()` - Generate temporary URLs
  - `getPublicUrl()` - Get public URL for public buckets
- **Realtime** (`client.channel()`)
  - Database change subscriptions (INSERT, UPDATE, DELETE)
  - Broadcast messaging
  - Presence tracking
- **Functions** (`client.functions`)
  - `invoke()` - Call serverless functions
  - `list()` - List available functions
- **Utilities**
  - `withRetry()` - Automatic retry with exponential backoff
  - Full TypeScript types for all APIs

### Documentation
- Comprehensive README with API reference
- Example apps: todo-app, chat-app, file-upload
- Type definitions for TypeScript users

## [Unreleased]

### Planned Features
- Request caching layer
- Offline support with sync
- React/Vue hooks packages
- Connection pooling
