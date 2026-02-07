# Examples - @aerodb/client

Real-world usage examples for common scenarios.

## Table of Contents

- [Authentication & User Management](#authentication--user-management)
- [CRUD Operations](#crud-operations)
- [Real-time Subscriptions](#real-time-subscriptions)
- [File Storage](#file-storage)
- [Advanced Queries](#advanced-queries)
- [Full Applications](#full-applications)

---

## Authentication & User Management

### Basic Sign Up Flow

```typescript
import { AeroDBClient } from '@aerodb/client';

const client = new AeroDBClient({
  url: 'https://api.aerodb.com',
});

// Sign up
const { data: signUpData, error: signUpError } = await client.auth.signUp({
  email: 'user@example.com',
  password: 'securepassword123',
});

if (signUpError) {
  console.error('Sign up failed:', signUpError.message);
  return;
}

console.log('Welcome!', signUpData.user.email);
```

### Persistent Auth Session

```typescript
// Check for existing session on app start
const { data: user, error } = await client.auth.getUser();

if (user) {
  console.log('Already logged in:', user.email);
} else {
  // Show login page
}

// Listen for auth changes (e.g., logout in another tab)
client.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    // Redirect to login
    window.location.href = '/login';
  }
});
```

---

## CRUD Operations

### Blog Post Management

```typescript
interface Post {
  id: string;
  title: string;
  content: string;
  author_id: string;
  published: boolean;
  created_at: string;
}

// Create
const { data: newPost } = await client
  .from<Post>('posts')
  .insert({
    title: 'Getting Started with AeroDB',
    content: 'This is my first post...',
    author_id: userId,
    published: false,
  });

// Read
const { data: posts } = await client
  .from<Post>('posts')
  .select('*')
  .eq('author_id', userId)
  .order('created_at', { ascending: false })
  .limit(10)
  .execute();

// Update
await client
  .from<Post>('posts')
  .eq('id', postId)
  .update({ published: true });

// Delete
await client
  .from<Post>('posts')
  .eq('id', postId)
  .delete();
```

### Batch Operations

```typescript
// Insert multiple rows
const newPosts = [
  { title: 'Post 1', content: '...', author_id: userId },
  { title: 'Post 2', content: '...', author_id: userId },
  { title: 'Post 3', content: '...', author_id: userId },
];

const { data } = await client
  .from('posts')
  .insert(newPosts);

console.log(`Inserted ${data.length} posts`);
```

---

## Real-time Subscriptions

### Live Comment Feed

```typescript
interface Comment {
  id: string;
  post_id: string;
  author: string;
  text: string;
  created_at: string;
}

// Subscribe to new comments on a post
const channel = client.channel(`comments:post:${postId}`)
  .on('INSERT', (payload) => {
    const newComment = payload.new as Comment;
    
    // Add to UI
    addCommentToDOM(newComment);
    
    // Show notification
    showNotification(`New comment from ${newComment.author}`);
  })
  .subscribe();

// Cleanup when leaving page
window.addEventListener('beforeunload', () => {
  channel.unsubscribe();
});
```

### Live User Presence

```typescript
// Track who's currently viewing a document
const presenceChannel = client.channel(`presence:doc:${docId}`)
  .on('INSERT', (payload) => {
    const viewer = payload.new;
    updatePresenceList(viewer, 'joined');
  })
  .on('DELETE', (payload) => {
    const viewer = payload.old;
    updatePresenceList(viewer, 'left');
  })
  .subscribe();

// Announce this user
await client.from('presence').insert({
  user_id: currentUserId,
  doc_id: docId,
  timestamp: new Date().toISOString(),
});

// Remove on exit
window.addEventListener('beforeunload', async () => {
  await client.from('presence')
    .eq('user_id', currentUserId)
    .eq('doc_id', docId)
    .delete();
});
```

---

## File Storage

### Avatar Upload with Preview

```typescript
const fileInput = document.querySelector<HTMLInputElement>('#avatar-input')!;
const preview = document.querySelector<HTMLImageElement>('#avatar-preview')!;

fileInput.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  
  // Show preview
  preview.src = URL.createObjectURL(file);
  
  // Upload
  const path = `users/${userId}/avatar.${file.name.split('.').pop()}`;
  const { data, error } = await client.storage
    .from('avatars')
    .upload(path, file);
  
  if (error) {
    alert('Upload failed: ' + error.message);
    return;
  }
  
  // Get public URL
  const publicUrl = client.storage.from('avatars').getPublicUrl(path);
  
  // Update user profile
  await client.from('users').eq('id', userId).update({
    avatar_url: publicUrl,
  });
});
```

### Bulk File Upload with Progress

```typescript
async function uploadFiles(files: FileList) {
  const total = files.length;
  let completed = 0;
  
  for (const file of Array.from(files)) {
    const path = `uploads/${Date.now()}-${file.name}`;
    
    const { data, error } = await client.storage
      .from('documents')
      .upload(path, file);
    
    if (error) {
      console.error(`Failed to upload ${file.name}:`, error.message);
      continue;
    }
    
    completed++;
    updateProgressBar((completed / total) * 100);
  }
  
  console.log(`Uploaded ${completed}/${total} files`);
}
```

---

## Advanced Queries

### Search with Pagination

```typescript
async function searchPosts(query: string, page: number = 1) {
  const perPage = 20;
  
  const { data: posts, error } = await client
    .from('posts')
    .select('id, title, content, created_at, author:users(name)')
    .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
    .eq('published', true)
    .order('created_at', { ascending: false })
    .offset((page - 1) * perPage)
    .limit(perPage)
    .execute();
  
  return { posts, error };
}
```

### Complex Filtering

```typescript
// Get active users who joined in the last 30 days
// and have made at least 5 posts
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const { data: activeUsers } = await client
  .from('users')
  .select('*, posts(count)')
  .eq('status', 'active')
  .gte('created_at', thirtyDaysAgo.toISOString())
  .execute();

const qualifiedUsers = activeUsers?.filter(
  user => user.posts[0].count >= 5
);
```

---

## Full Applications

### Chat Application

```typescript
class ChatApp {
  private client: AeroDBClient;
  private roomId: string;
  private channel: RealtimeChannel;
  
  constructor(roomId: string) {
    this.client = new AeroDBClient({ url: process.env.AERODB_URL! });
    this.roomId = roomId;
  }
  
  async init() {
    // Subscribe to new messages
    this.channel = this.client.channel(`messages:room:${this.roomId}`)
      .on('INSERT', (payload) => {
        this.displayMessage(payload.new);
      })
      .subscribe();
    
    // Load message history
    const { data: messages } = await this.client
      .from('messages')
      .select('*, author:users(name, avatar_url)')
      .eq('room_id', this.roomId)
      .order('created_at', { ascending: true })
      .limit(100)
      .execute();
    
    messages?.forEach(msg => this.displayMessage(msg));
  }
  
  async sendMessage(text: string) {
    const { data } = await this.client.from('messages').insert({
      room_id: this.roomId,
      author_id: this.getCurrentUserId(),
      text,
      created_at: new Date().toISOString(),
    });
  }
  
  displayMessage(msg: any) {
    // Add to DOM
  }
  
  getCurrentUserId() {
    // Get from auth state
    return 'user-123';
  }
  
  cleanup() {
    this.channel.unsubscribe();
  }
}

// Usage
const chat = new ChatApp('room-abc');
await chat.init();
```

### Todo App with Offline Support

```typescript
import { AeroDBClient } from '@aerodb/client';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  user_id: string;
}

class TodoApp {
  private client: AeroDBClient;
  private cache: Map<string, Todo> = new Map();
  
  constructor() {
    this.client = new AeroDBClient({ url: process.env.AERODB_URL! });
  }
  
  async loadTodos() {
    const { data, error } = await this.client
      .from<Todo>('todos')
      .select('*')
      .order('created_at', { ascending: false })
      .execute();
    
    if (data) {
      data.forEach(todo => this.cache.set(todo.id, todo));
    }
    
    return Array.from(this.cache.values());
  }
  
  async addTodo(text: string) {
    const tempId = `temp-${Date.now()}`;
    const todo: Todo = {
      id: tempId,
      text,
      completed: false,
      user_id: await this.getUserId(),
    };
    
    // Optimistic update
    this.cache.set(tempId, todo);
    this.render();
    
    // Sync to server
    const { data, error } = await this.client
      .from('todos')
      .insert(todo);
    
    if (data && data[0]) {
      this.cache.delete(tempId);
      this.cache.set(data[0].id, data[0]);
      this.render();
    }
  }
  
  async toggleTodo(id: string) {
    const todo = this.cache.get(id);
    if (!todo) return;
    
    // Optimistic update
    todo.completed = !todo.completed;
    this.render();
    
    // Sync
    await this.client
      .from('todos')
      .eq('id', id)
      .update({ completed: todo.completed });
  }
  
  render() {
    // Update DOM
  }
  
  async getUserId() {
    const { data } = await this.client.auth.getUser();
    return data?.id || '';
  }
}
```

## More Examples

For more examples, see:
- [GitHub Examples Directory](https://github.com/aerodb/aerodb-js/tree/main/examples)
- [AeroDB Documentation](https://docs.aerodb.com/examples)
- [Community Recipes](https://github.com/aerodb/community-recipes)
