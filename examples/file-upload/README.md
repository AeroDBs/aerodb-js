# AeroDB File Upload Example

Demonstrates file storage operations including upload, download, and signed URLs.

## Features

- File upload with progress
- Signed URL generation
- Public and private buckets
- Image handling
- File listing and deletion

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

### Bucket Operations

```typescript
// List all buckets
async function listBuckets() {
  const { data, error } = await client.storage.listBuckets();
  if (error) throw error;
  return data ?? [];
}

// Create a new bucket
async function createBucket(name: string, isPublic = false) {
  const { error } = await client.storage.createBucket(name, {
    public: isPublic,
  });
  if (error) throw error;
}
```

### File Upload

```typescript
// Simple upload
async function uploadFile(bucket: string, path: string, file: File) {
  const { data, error } = await client.storage
    .from(bucket)
    .upload(path, file, {
      contentType: file.type,
      upsert: true, // overwrite if exists
    });

  if (error) throw error;
  return data;
}

// Upload with custom cache control
async function uploadWithCaching(bucket: string, path: string, file: File) {
  const { data, error } = await client.storage
    .from(bucket)
    .upload(path, file, {
      contentType: file.type,
      cacheControl: '3600', // 1 hour
    });

  if (error) throw error;
  return data;
}

// Upload from ArrayBuffer
async function uploadBuffer(bucket: string, path: string, buffer: ArrayBuffer) {
  const { data, error } = await client.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType: 'application/octet-stream',
    });

  if (error) throw error;
  return data;
}
```

### File Download

```typescript
// Download as blob
async function downloadFile(bucket: string, path: string): Promise<Blob> {
  const { data, error } = await client.storage
    .from(bucket)
    .download(path);

  if (error) throw error;
  return data!;
}

// Download and display image
async function displayImage(bucket: string, path: string, imgElement: HTMLImageElement) {
  const blob = await downloadFile(bucket, path);
  imgElement.src = URL.createObjectURL(blob);
}

// Download and save as file (browser)
async function saveFile(bucket: string, path: string, filename: string) {
  const blob = await downloadFile(bucket, path);
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}
```

### Signed URLs

```typescript
// Generate a signed URL for temporary access
async function getSignedUrl(bucket: string, path: string, expiresIn = 3600) {
  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) throw error;
  return data!.signedUrl;
}

// Get public URL (for public buckets only)
function getPublicUrl(bucket: string, path: string) {
  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// Share a file temporarily
async function shareFile(bucket: string, path: string) {
  // URL valid for 1 hour
  const url = await getSignedUrl(bucket, path, 3600);
  console.log('Share this link:', url);
  return url;
}
```

### File Management

```typescript
// List files in a bucket
async function listFiles(bucket: string, folder = '') {
  const { data, error } = await client.storage
    .from(bucket)
    .list(folder, {
      limit: 100,
      offset: 0,
    });

  if (error) throw error;
  return data ?? [];
}

// Delete a file
async function deleteFile(bucket: string, path: string) {
  const { error } = await client.storage.from(bucket).remove(path);
  if (error) throw error;
}

// Delete multiple files
async function deleteFiles(bucket: string, paths: string[]) {
  const { error } = await client.storage.from(bucket).remove(paths);
  if (error) throw error;
}
```

### Complete Example: Profile Avatar Upload

```typescript
interface UserProfile {
  id: string;
  email: string;
  avatar_url: string | null;
}

async function uploadAvatar(userId: string, file: File): Promise<string> {
  const bucket = 'avatars';
  const extension = file.name.split('.').pop();
  const path = `${userId}/avatar.${extension}`;

  // Upload the file
  await uploadFile(bucket, path, file);

  // Get public URL
  const url = getPublicUrl(bucket, path);

  // Update user profile
  await client
    .from<UserProfile>('profiles')
    .eq('id', userId)
    .update({ avatar_url: url })
    .execute();

  return url;
}

async function deleteAvatar(userId: string) {
  const bucket = 'avatars';

  // List user's files
  const files = await listFiles(bucket, `${userId}/`);

  // Delete all
  if (files.length > 0) {
    await deleteFiles(
      bucket,
      files.map((f) => `${userId}/${f.name}`)
    );
  }

  // Update profile
  await client
    .from<UserProfile>('profiles')
    .eq('id', userId)
    .update({ avatar_url: null })
    .execute();
}

// Usage
async function main() {
  await client.auth.signIn({
    email: 'user@example.com',
    password: 'password123',
  });

  const { data: user } = await client.auth.getUser();

  // Upload avatar from file input
  const input = document.getElementById('avatar-input') as HTMLInputElement;
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (file) {
      const url = await uploadAvatar(user!.id, file);
      console.log('Avatar uploaded:', url);
    }
  });
}
```

## Storage Bucket Setup

```bash
# Create buckets via CLI or dashboard
aerodb storage create-bucket avatars --public
aerodb storage create-bucket documents --private
```

Or via SQL:

```sql
-- Create a public bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Create a private bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false);

-- RLS policies for avatars bucket
CREATE POLICY "Avatar images are public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
```
