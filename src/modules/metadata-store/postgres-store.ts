/**
 * PostgreSQL-based Metadata Store Implementation
 * 
 * Durable, shared metadata storage using PostgreSQL.
 * Suitable for local development and production deployments
 * when deployed behind a load balancer (shared PostgreSQL database).
 */

import { Pool, Client } from 'pg';
import { MetadataStore, TokenMetadata, MetadataStoreConfig } from './index';

// Re-export types for convenience
export type { MetadataStore, TokenMetadata };

/**
 * PostgreSQL-specific configuration.
 * This is kept separate from the main interface to maintain DB-agnosticism.
 */
export interface PostgresConfig extends MetadataStoreConfig {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  connectionString?: string;
}

export class PostgresMetadataStore implements MetadataStore {
  private pool: Pool;
  private schemaInitialized: Promise<void>;

  /**
   * @param config - PostgreSQL connection configuration
   *                 Can use connectionString or individual connection parameters
   *                 Defaults to localhost with standard PostgreSQL settings
   */
  constructor(config: PostgresConfig = {}) {
    this.pool = new Pool({
      host: config.host || process.env.PG_HOST || 'localhost',
      port: config.port || parseInt(process.env.PG_PORT || '5432'),
      database: config.database || process.env.PG_DATABASE || 'image_hospital',
      user: config.user || process.env.PG_USER || 'postgres',
      password: config.password || process.env.PG_PASSWORD || '',
      connectionString: config.connectionString || process.env.DATABASE_URL,
    });

    // Initialize schema asynchronously
    this.schemaInitialized = this.initializeSchema();
  }

  private async initializeSchema(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS token_metadata (
          token TEXT PRIMARY KEY,
          blob_ref TEXT NOT NULL,
          expires_at_epoch_ms BIGINT NOT NULL
        )
      `);
    } finally {
      client.release();
    }
  }

  async put(token: string, blobRef: string, expiresAtEpochMs: number): Promise<void> {
    // Ensure schema is initialized before proceeding
    await this.schemaInitialized;

    const query = `
      INSERT INTO token_metadata (token, blob_ref, expires_at_epoch_ms)
      VALUES ($1, $2, $3)
      ON CONFLICT (token) DO UPDATE SET
        blob_ref = EXCLUDED.blob_ref,
        expires_at_epoch_ms = EXCLUDED.expires_at_epoch_ms
    `;

    await this.pool.query(query, [token, blobRef, expiresAtEpochMs]);
  }

  async get(token: string): Promise<TokenMetadata | null> {
    // Ensure schema is initialized before proceeding
    await this.schemaInitialized;

    const query = `
      SELECT blob_ref, expires_at_epoch_ms
      FROM token_metadata
      WHERE token = $1
    `;

    const result = await this.pool.query(query, [token]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      blobRef: row.blob_ref,
      expiresAtEpochMs: parseInt(row.expires_at_epoch_ms),
    };
  }

  /**
   * Close the database connection pool.
   * Should be called when the store is no longer needed.
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}

/**
 * Factory function to create a PostgreSQL-based MetadataStore.
 * This is the default implementation.
 * 
 * @param config - PostgreSQL connection configuration
 * @returns A MetadataStore instance backed by PostgreSQL
 */
export function createPostgresMetadataStore(config?: PostgresConfig): MetadataStore {
  return new PostgresMetadataStore(config);
}

