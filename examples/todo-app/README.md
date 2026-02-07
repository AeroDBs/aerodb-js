# AeroDB Todo App Example

A simple todo application demonstrating core AeroDB SDK features.

## Features

- User authentication (sign up, sign in, sign out)
- CRUD operations on todos
- Real-time updates when todos change
- TypeScript types for todos

## Setup

1. Start your AeroDB server
2. Update the configuration in `src/config.ts`
3. Run the app:

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

### Authentication

```typescript
// Sign up
async function signUp(email: string, password: string) {
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw error;
  return data.user;
}

// Sign in
async function signIn(email: string, password: string) {
  const { data, error } = await client.auth.signIn({ email, password });
  if (error) throw error;
  return data.session;
}

// Sign out
async function signOut() {
  await client.auth.signOut();
}

// Get current user
async function getCurrentUser() {
  const { data } = await client.auth.getUser();
  return data;
}
```

### Todo CRUD Operations

```typescript
interface Todo {
  id: string;
  user_id: string;
  title: string;
  completed: boolean;
  created_at: string;
}

// List todos for current user
async function listTodos(): Promise<Todo[]> {
  const { data, error } = await client
    .from<Todo>('todos')
    .select('*')
    .order('created_at', { ascending: false })
    .execute();

  if (error) throw error;
  return data ?? [];
}

// Create a new todo
async function createTodo(title: string): Promise<Todo> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await client
    .from<Todo>('todos')
    .insert({
      title,
      completed: false,
      user_id: user.id,
    })
    .execute();

  if (error) throw error;
  return data![0];
}

// Update a todo
async function updateTodo(id: string, updates: Partial<Todo>): Promise<Todo> {
  const { data, error } = await client
    .from<Todo>('todos')
    .eq('id', id)
    .update(updates)
    .execute();

  if (error) throw error;
  return data![0];
}

// Toggle todo completion
async function toggleTodo(id: string, completed: boolean): Promise<Todo> {
  return updateTodo(id, { completed });
}

// Delete a todo
async function deleteTodo(id: string): Promise<void> {
  const { error } = await client
    .from<Todo>('todos')
    .eq('id', id)
    .delete()
    .execute();

  if (error) throw error;
}
```

### Real-time Subscriptions

```typescript
// Subscribe to todo changes
function subscribeTodos(onUpdate: (todos: Todo[]) => void) {
  const channel = client
    .channel('todos')
    .on('INSERT', (payload) => {
      console.log('New todo:', payload.new);
      refreshTodos();
    })
    .on('UPDATE', (payload) => {
      console.log('Todo updated:', payload.new);
      refreshTodos();
    })
    .on('DELETE', (payload) => {
      console.log('Todo deleted:', payload.old);
      refreshTodos();
    })
    .subscribe();

  async function refreshTodos() {
    const todos = await listTodos();
    onUpdate(todos);
  }

  // Return unsubscribe function
  return () => channel.unsubscribe();
}
```

### Complete Example

```typescript
async function main() {
  // Sign in
  await signIn('user@example.com', 'password123');

  // Subscribe to changes
  const unsubscribe = subscribeTodos((todos) => {
    console.log('Todos updated:', todos.length);
  });

  // Create some todos
  await createTodo('Learn AeroDB');
  await createTodo('Build an app');
  await createTodo('Deploy to production');

  // List todos
  const todos = await listTodos();
  console.log('My todos:', todos);

  // Toggle first todo
  if (todos[0]) {
    await toggleTodo(todos[0].id, true);
  }

  // Clean up
  unsubscribe();
  await signOut();
}
```

## Database Schema

```sql
CREATE TABLE todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);

-- Enable RLS
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- Users can only see their own todos
CREATE POLICY "Users can view own todos"
  ON todos FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own todos
CREATE POLICY "Users can create own todos"
  ON todos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own todos
CREATE POLICY "Users can update own todos"
  ON todos FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own todos
CREATE POLICY "Users can delete own todos"
  ON todos FOR DELETE
  USING (auth.uid() = user_id);
```
