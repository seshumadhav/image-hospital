/**
 * Blob Storage Interface
 * 
 * Abstract interface for blob storage operations.
 * Storage-agnostic design supporting local filesystem, S3, or dual storage.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { createDualBlobStorage } from './dual-storage';

export interface BlobStorageSaveOptions {
  contentType?: string;
  filename?: string;
}

/**
 * Unified Blob Storage Interface
 * 
 * All blob storage implementations must implement this interface.
 * This allows the system to be storage-agnostic.
 */
export interface BlobStorage {
  /**
   * Save a blob and return a reference to it.
   * @param data - The blob data to store
   * @param options - Storage options (content type, filename hint)
   * @returns A blob reference string that can be used to retrieve the blob
   */
  save(data: Buffer, options?: BlobStorageSaveOptions): Promise<string>;

  /**
   * Retrieve a blob by its reference.
   * @param blobRef - The blob reference returned by save()
   * @returns The blob data as a Buffer
   * @throws Error if blob is not found
   */
  get(blobRef: string): Promise<Buffer>;

  /**
   * Get the content type of a blob (optional).
   * @param blobRef - The blob reference
   * @returns Content type string or undefined if not available
   */
  getContentType?(blobRef: string): Promise<string | undefined>;
}

/**
 * Blob Storage Configuration
 * 
 * Configuration for creating blob storage instances.
 * 
 * Simple configuration using 'storage' parameter:
 * - 'local' - Local filesystem only
 * - 's3' - S3 only
 * - 'local,s3' or 's3,local' - Dual storage (both)
 */
export interface BlobStorageConfig {
  /**
   * Storage backend(s) to use.
   * Can be a single backend or comma-separated list for dual storage.
   * Examples: 'local', 's3', 'local,s3', 's3,local'
   * Default: 'local'
   */
  storage?: string;

  /**
   * Local filesystem configuration
   */
  local?: {
    /**
     * Base directory for storing blobs
     * Default: './blobs' (relative to process.cwd())
     */
    directory?: string;
  };

  /**
   * S3 configuration
   */
  s3?: {
    bucket?: string;
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  };
}

/**
 * Parse storage string into array of storage backends.
 * 
 * @param storage - Storage string like 'local', 's3', 'local,s3', etc.
 * @returns Array of storage backend names
 */
function parseStorageString(storage: string): string[] {
  return storage
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(s => s.length > 0);
}

/**
 * Create a blob storage instance based on configuration.
 * 
 * @param config - Blob storage configuration
 * @returns A BlobStorage instance
 */
export function createBlobStorage(config?: BlobStorageConfig): BlobStorage {
  // Get storage string from config or environment variable
  const storageStr = config?.storage || process.env.BLOB_STORAGE || 'local';
  const storageBackends = parseStorageString(storageStr);

  // Validate storage backends
  const validBackends = ['local', 's3'];
  const invalidBackends = storageBackends.filter(b => !validBackends.includes(b));
  if (invalidBackends.length > 0) {
    throw new Error(`Invalid storage backend(s): ${invalidBackends.join(', ')}. Valid options: ${validBackends.join(', ')}`);
  }

  // Single storage backend
  if (storageBackends.length === 1) {
    const backend = storageBackends[0];
    switch (backend) {
      case 'local':
        return createLocalFilesystemBlobStorage(config?.local);
      case 's3':
        // Future: return createS3BlobStorage(config?.s3);
        throw new Error('S3 storage not yet implemented. Use "local" for now.');
      default:
        throw new Error(`Unknown storage backend: ${backend}`);
    }
  }

  // Dual storage (multiple backends)
  if (storageBackends.length === 2) {
    // Check if both local and s3 are specified
    const hasLocal = storageBackends.includes('local');
    const hasS3 = storageBackends.includes('s3');

    if (hasLocal && hasS3) {
      return createDualBlobStorage(config);
    }

    throw new Error(`Invalid dual storage combination: ${storageBackends.join(', ')}. Only "local,s3" or "s3,local" are supported.`);
  }

  // More than 2 backends not supported yet
  if (storageBackends.length > 2) {
    throw new Error(`Too many storage backends specified: ${storageBackends.join(', ')}. Maximum 2 backends supported (local and s3).`);
  }

  // Fallback (shouldn't reach here)
  return createLocalFilesystemBlobStorage(config?.local);
}

/**
 * Local Filesystem Blob Storage Implementation
 */
export class LocalFilesystemBlobStorage implements BlobStorage {
  private readonly baseDirectory: string;
  private readonly contentTypeMap = new Map<string, string>();

  constructor(config?: { directory?: string }) {
    this.baseDirectory = config?.directory || process.env.BLOB_STORAGE_DIR || path.join(process.cwd(), 'blobs');
  }

  /**
   * Ensure the storage directory exists.
   */
  private async ensureDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.baseDirectory, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create blob storage directory: ${error}`);
    }
  }

  /**
   * Generate a unique blob reference.
   * Format: fs:<uuid> or fs:<random-hex>
   */
  private generateBlobRef(): string {
    const id = typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : crypto.randomBytes(16).toString('hex');
    return `fs:${id}`;
  }

  /**
   * Get the file path for a blob reference.
   */
  private getFilePath(blobRef: string): string {
    if (!blobRef.startsWith('fs:')) {
      throw new Error(`Invalid blob reference format: ${blobRef}`);
    }
    const id = blobRef.substring(3); // Remove 'fs:' prefix
    return path.join(this.baseDirectory, id);
  }

  async save(data: Buffer, options?: BlobStorageSaveOptions): Promise<string> {
    await this.ensureDirectory();

    const blobRef = this.generateBlobRef();
    const filePath = this.getFilePath(blobRef);

    try {
      await fs.writeFile(filePath, data);
      
      // Store content type mapping
      if (options?.contentType) {
        this.contentTypeMap.set(blobRef, options.contentType);
      }

      return blobRef;
    } catch (error) {
      throw new Error(`Failed to save blob: ${error}`);
    }
  }

  async get(blobRef: string): Promise<Buffer> {
    const filePath = this.getFilePath(blobRef);

    try {
      const data = await fs.readFile(filePath);
      return data;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Blob not found: ${blobRef}`);
      }
      throw new Error(`Failed to read blob: ${error}`);
    }
  }

  async getContentType(blobRef: string): Promise<string | undefined> {
    return this.contentTypeMap.get(blobRef);
  }
}

/**
 * Factory function to create a local filesystem blob storage instance.
 * 
 * @param config - Local filesystem configuration
 * @returns A LocalFilesystemBlobStorage instance
 */
export function createLocalFilesystemBlobStorage(config?: { directory?: string }): BlobStorage {
  return new LocalFilesystemBlobStorage(config);
}
