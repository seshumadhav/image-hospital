/**
 * Metadata Store Interface
 * 
 * Abstract interface for durable, shared metadata storage.
 * Metadata must be accessible across multiple instances
 * (for deployment behind load balancer/proxy).
 * 
 * Stores metadata about uploaded images:
 * - Token -> { blobRef, expiresAtEpochMs }
 * 
 * The interface is database-agnostic and can be implemented
 * with any durable storage backend (PostgreSQL, etc.).
 */

export interface TokenMetadata {
  blobRef: string;
  expiresAtEpochMs: number;
}

export interface MetadataStore {
  /**
   * Store token metadata.
   * @param token - Unique token identifier
   * @param blobRef - Reference to the stored blob
   * @param expiresAtEpochMs - Expiration timestamp in milliseconds since epoch
   */
  put(token: string, blobRef: string, expiresAtEpochMs: number): Promise<void>;

  /**
   * Retrieve token metadata.
   * @param token - Unique token identifier
   * @returns Token metadata or null if not found
   */
  get(token: string): Promise<TokenMetadata | null>;

  /**
   * Close the database connection.
   * Should be called when the store is no longer needed.
   */
  close(): Promise<void>;
}

/**
 * Generic configuration for metadata store.
 * Database-specific implementations can extend this with their own config types.
 */
export interface MetadataStoreConfig {
  [key: string]: unknown;
}

/**
 * Factory function to create a MetadataStore instance.
 * This abstracts away the database choice from consumers.
 * 
 * @param config - Configuration object (implementation-specific)
 * @returns A MetadataStore instance
 */
export function createMetadataStore(config?: MetadataStoreConfig): MetadataStore {
  // Default implementation uses PostgreSQL
  // Other implementations can be added here based on config
  // Import is done here to avoid circular dependencies and keep the interface clean
  const { createPostgresMetadataStore } = require('./postgres-store');
  return createPostgresMetadataStore(config);
}
