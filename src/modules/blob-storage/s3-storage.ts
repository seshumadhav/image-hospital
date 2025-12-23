/**
 * S3 Blob Storage Implementation
 * 
 * Future implementation for storing blobs in AWS S3.
 * 
 * TODO: Implement S3 storage
 * - Use AWS SDK v3 (@aws-sdk/client-s3)
 * - Store blobs in configured S3 bucket
 * - Generate unique S3 keys
 * - Handle S3 errors gracefully
 * - Support content type metadata
 */

export interface S3BlobStorageConfig {
  bucket: string;
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

// Placeholder for future S3 implementation
// export class S3BlobStorage implements BlobStorage { ... }
// export function createS3BlobStorage(config: S3BlobStorageConfig): BlobStorage { ... }

