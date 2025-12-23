# Blob Storage Module

Extensible, storage-agnostic blob storage system for image-hospital.

## Architecture

The blob storage system is designed to be:
- **Storage-agnostic**: Code doesn't depend on specific storage backends
- **Extensible**: Easy to add new storage backends (S3, Azure, etc.)
- **Configurable**: Choose storage backend via configuration
- **Future-ready**: Supports dual storage (local + S3) for migration

## Current Implementation

### Local Filesystem Storage (`LocalFilesystemBlobStorage`)

- Stores images in a local directory
- Default location: `./blobs` (relative to process.cwd())
- Blob references: `fs:<uuid>`
- Content type tracking for proper HTTP responses

**Configuration:**
```typescript
{
  type: 'local',
  local: {
    directory: '/var/www/image-hospital/blobs' // Optional, defaults to ./blobs
  }
}
```

**Environment Variables:**
- `BLOB_STORAGE_TYPE=local` (default)
- `BLOB_STORAGE_DIR=/path/to/blobs` (optional)

## Future Implementations

### S3 Storage (Planned)

See `s3-storage.ts` for placeholder implementation.

**Configuration:**
```typescript
{
  type: 's3',
  s3: {
    bucket: 'my-bucket',
    region: 'us-east-1',
    accessKeyId: '...',
    secretAccessKey: '...'
  }
}
```

### Dual Storage (Planned)

See `dual-storage.ts` for placeholder implementation.

Stores in both local filesystem and S3:
- **Write**: Writes to both storages
- **Read**: Reads from local first, falls back to S3
- **Migration**: Can gradually move from local-only to S3-only

**Configuration:**
```typescript
{
  type: 'dual',
  local: { directory: './blobs' },
  s3: { bucket: '...', region: '...' }
}
```

## Usage

### Simple Configuration

Use the `storage` parameter to specify one or more backends:

```typescript
import { createBlobStorage } from './blob-storage';

// Local filesystem only (default)
const storage1 = createBlobStorage({ storage: 'local' });

// S3 only (when implemented)
const storage2 = createBlobStorage({ storage: 's3' });

// Dual storage (local + S3)
const storage3 = createBlobStorage({ storage: 'local,s3' });
```

### Basic Usage (Default: Local Filesystem)

```typescript
import { createBlobStorage } from './blob-storage';

// Uses local filesystem by default
const storage = createBlobStorage();

// Save a blob
const blobRef = await storage.save(imageBuffer, {
  contentType: 'image/jpeg'
});

// Retrieve a blob
const imageData = await storage.get(blobRef);

// Get content type (if available)
const contentType = await storage.getContentType?.(blobRef);
```

### With Custom Directory

```typescript
import { createBlobStorage } from './blob-storage';

const storage = createBlobStorage({
  storage: 'local',
  local: {
    directory: '/var/www/blobs'
  }
});
```

### Environment Variables

```bash
# Single backend
BLOB_STORAGE=local

# Dual storage
BLOB_STORAGE=local,s3

# Custom directory
BLOB_STORAGE_DIR=/var/www/blobs
```

### In HTTP Server

```typescript
import { createHttpServer } from './modules/http-api';

// Local filesystem
const server = await createHttpServer({
  blobStorageConfig: {
    storage: 'local',
    local: {
      directory: process.env.BLOB_STORAGE_DIR || './blobs'
    }
  }
});

// Dual storage (when S3 is implemented)
const server2 = await createHttpServer({
  blobStorageConfig: {
    storage: 'local,s3',
    local: { directory: './blobs' },
    s3: { bucket: 'my-bucket', region: 'us-east-1' }
  }
});
```

## Blob Reference Format

- **Local filesystem**: `fs:<uuid>` (e.g., `fs:550e8400-e29b-41d4-a716-446655440000`)
- **S3** (future): `s3:<key>` (e.g., `s3:images/abc123.jpg`)
- **Dual** (future): `dual:<local-ref>` or unified format

## Interface

All storage implementations must implement:

```typescript
interface BlobStorage {
  save(data: Buffer, options?: BlobStorageSaveOptions): Promise<string>;
  get(blobRef: string): Promise<Buffer>;
  getContentType?(blobRef: string): Promise<string | undefined>;
}
```

## Adding a New Storage Backend

1. Create a new file (e.g., `azure-storage.ts`)
2. Implement the `BlobStorage` interface
3. Add factory function: `createAzureBlobStorage(config)`
4. Update `createBlobStorage()` in `index.ts` to support new type
5. Add configuration type to `BlobStorageConfig`

## Migration Path

1. **Current**: Local filesystem only
2. **Next**: Dual storage (local + S3) - write to both, read from local
3. **Future**: S3 only - remove local filesystem dependency

This allows gradual migration without breaking changes.

