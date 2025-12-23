/**
 * Dual Blob Storage Implementation
 * 
 * Stores blobs in both local filesystem and S3 simultaneously.
 * This allows for:
 * - Fast local access (filesystem)
 * - Cloud backup/durability (S3)
 * - Gradual migration from local to S3-only
 * 
 * Strategy:
 * - Write: Writes to both storages
 * - Read: Reads from local first, falls back to S3 if not found
 * - BlobRef: Uses local blobRef format (fs:...)
 */

import { BlobStorage, BlobStorageSaveOptions } from './index';
import { createLocalFilesystemBlobStorage } from './index';

export class DualBlobStorage implements BlobStorage {
  private localStorage: BlobStorage;
  private s3Storage: BlobStorage | null = null;

  constructor(
    localStorage: BlobStorage,
    s3Storage: BlobStorage | null = null
  ) {
    this.localStorage = localStorage;
    this.s3Storage = s3Storage;
  }

  async save(data: Buffer, options?: BlobStorageSaveOptions): Promise<string> {
    // Write to local storage first (primary)
    const blobRef = await this.localStorage.save(data, options);

    // Write to S3 in parallel (if available)
    if (this.s3Storage) {
      // Don't await S3 write - fire and forget for performance
      // If S3 write fails, local storage still has the data
      this.s3Storage.save(data, options).catch((error) => {
        console.warn(`Failed to write to S3 (non-fatal): ${error}`);
      });
    }

    return blobRef;
  }

  async get(blobRef: string): Promise<Buffer> {
    // Try local storage first (faster)
    try {
      return await this.localStorage.get(blobRef);
    } catch (localError) {
      // If not found locally and S3 is available, try S3
      if (this.s3Storage) {
        try {
          const data = await this.s3Storage.get(blobRef);
          // Optionally: write back to local for future reads (cache)
          // This is a performance optimization, not required
          return data;
        } catch (s3Error) {
          // Neither storage has the blob
          throw new Error(`Blob not found in local or S3: ${blobRef}`);
        }
      }
      // No S3 fallback, rethrow local error
      throw localError;
    }
  }

  async getContentType(blobRef: string): Promise<string | undefined> {
    // Try local first
    if (this.localStorage.getContentType) {
      const contentType = await this.localStorage.getContentType(blobRef);
      if (contentType) {
        return contentType;
      }
    }

    // Fallback to S3
    if (this.s3Storage?.getContentType) {
      return await this.s3Storage.getContentType(blobRef);
    }

    return undefined;
  }
}

/**
 * Create a dual storage instance (local + S3).
 * 
 * @param config - Blob storage configuration
 * @returns A DualBlobStorage instance
 */
export function createDualBlobStorage(config?: {
  local?: { directory?: string };
  s3?: { bucket?: string; region?: string; accessKeyId?: string; secretAccessKey?: string };
}): BlobStorage {
  const localStorage = createLocalFilesystemBlobStorage(config?.local);

  // S3 storage not yet implemented, so we'll create a placeholder
  // When S3 is implemented, uncomment this:
  // const s3Storage = createS3BlobStorage(config?.s3);
  // return new DualBlobStorage(localStorage, s3Storage);

  // For now, return local storage only (S3 will be added later)
  // This allows the config to work, but only uses local storage
  console.warn('Dual storage requested but S3 not yet implemented. Using local storage only.');
  return localStorage;
}

