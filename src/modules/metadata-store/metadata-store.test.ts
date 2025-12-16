/**
 * Unit tests for MetadataStore
 */

import { PostgresMetadataStore, createPostgresMetadataStore } from './postgres-store';
import { MetadataStore, TokenMetadata, createMetadataStore } from './index';

describe('PostgresMetadataStore', () => {
  // Use a test database - can be configured via environment variables
  // Defaults to localhost with test database name
  const testConfig = {
    database: process.env.PG_TEST_DATABASE || 'image_hospital_test',
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || '',
  };

  let store: PostgresMetadataStore;

  beforeEach(async () => {
    store = new PostgresMetadataStore(testConfig);
    // Wait for schema initialization to complete
    await (store as any).schemaInitialized;
    // Note: Test data cleanup happens via unique tokens per test
    // In a production test setup, you might want to use transactions that rollback
  });

  afterEach(async () => {
    if (store) {
      await store.close();
    }
  });

  describe('put and get', () => {
    it('should store and retrieve token metadata', async () => {
      const token = 'test-token-123';
      const blobRef = 'blob-ref-456';
      const expiresAtEpochMs = Date.now() + 60000; // 1 minute from now

      await store.put(token, blobRef, expiresAtEpochMs);
      const result = await store.get(token);

      expect(result).not.toBeNull();
      expect(result!.blobRef).toBe(blobRef);
      expect(result!.expiresAtEpochMs).toBe(expiresAtEpochMs);
    });

    it('should return null for non-existent token', async () => {
      const result = await store.get('non-existent-token');
      
      expect(result).toBeNull();
    });

    it('should overwrite existing token metadata', async () => {
      const token = 'test-token-123';
      const blobRef1 = 'blob-ref-456';
      const expiresAtEpochMs1 = Date.now() + 60000;
      
      const blobRef2 = 'blob-ref-789';
      const expiresAtEpochMs2 = Date.now() + 120000;

      await store.put(token, blobRef1, expiresAtEpochMs1);
      await store.put(token, blobRef2, expiresAtEpochMs2);
      
      const result = await store.get(token);

      expect(result).not.toBeNull();
      expect(result!.blobRef).toBe(blobRef2);
      expect(result!.expiresAtEpochMs).toBe(expiresAtEpochMs2);
    });

    it('should handle multiple tokens', async () => {
      const token1 = 'token-1';
      const blobRef1 = 'blob-1';
      const expiresAtEpochMs1 = Date.now() + 60000;

      const token2 = 'token-2';
      const blobRef2 = 'blob-2';
      const expiresAtEpochMs2 = Date.now() + 120000;

      await store.put(token1, blobRef1, expiresAtEpochMs1);
      await store.put(token2, blobRef2, expiresAtEpochMs2);

      const result1 = await store.get(token1);
      const result2 = await store.get(token2);

      expect(result1).not.toBeNull();
      expect(result1!.blobRef).toBe(blobRef1);
      expect(result1!.expiresAtEpochMs).toBe(expiresAtEpochMs1);

      expect(result2).not.toBeNull();
      expect(result2!.blobRef).toBe(blobRef2);
      expect(result2!.expiresAtEpochMs).toBe(expiresAtEpochMs2);
    });
  });

  describe('persistence across restart', () => {
    it('should persist data when store is closed and reopened', async () => {
      const token = 'persistent-token';
      const blobRef = 'persistent-blob-ref';
      const expiresAtEpochMs = Date.now() + 60000;

      // Create store, write data, close it
      const store1 = new PostgresMetadataStore(testConfig);
      await (store1 as any).schemaInitialized;
      await store1.put(token, blobRef, expiresAtEpochMs);
      await store1.close();

      // Reopen store and verify data persists
      const store2 = new PostgresMetadataStore(testConfig);
      await (store2 as any).schemaInitialized;
      const result = await store2.get(token);

      expect(result).not.toBeNull();
      expect(result!.blobRef).toBe(blobRef);
      expect(result!.expiresAtEpochMs).toBe(expiresAtEpochMs);

      await store2.close();
    });

    it('should persist multiple tokens across restart', async () => {
      const token1 = 'persistent-token-1';
      const blobRef1 = 'blob-1';
      const expiresAtEpochMs1 = Date.now() + 60000;

      const token2 = 'persistent-token-2';
      const blobRef2 = 'blob-2';
      const expiresAtEpochMs2 = Date.now() + 120000;

      // Create store, write data, close it
      const store1 = new PostgresMetadataStore(testConfig);
      await (store1 as any).schemaInitialized;
      await store1.put(token1, blobRef1, expiresAtEpochMs1);
      await store1.put(token2, blobRef2, expiresAtEpochMs2);
      await store1.close();

      // Reopen store and verify all data persists
      const store2 = new PostgresMetadataStore(testConfig);
      await (store2 as any).schemaInitialized;
      const result1 = await store2.get(token1);
      const result2 = await store2.get(token2);

      expect(result1).not.toBeNull();
      expect(result1!.blobRef).toBe(blobRef1);
      expect(result1!.expiresAtEpochMs).toBe(expiresAtEpochMs1);

      expect(result2).not.toBeNull();
      expect(result2!.blobRef).toBe(blobRef2);
      expect(result2!.expiresAtEpochMs).toBe(expiresAtEpochMs2);

      await store2.close();
    });
  });
});

describe('DB-agnostic MetadataStore interface', () => {
  const testConfig = {
    database: process.env.PG_TEST_DATABASE || 'image_hospital_test',
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || '',
  };

  it('should create store using factory function without exposing DB implementation', async () => {
    // Using the factory function, consumers don't need to know about PostgreSQL
    const store = createMetadataStore(testConfig);
    
    // Verify it implements the MetadataStore interface
    expect(store).toHaveProperty('put');
    expect(store).toHaveProperty('get');
    expect(typeof store.put).toBe('function');
    expect(typeof store.get).toBe('function');

    // Test that it works
    const token = 'factory-test-token';
    const blobRef = 'factory-blob-ref';
    const expiresAtEpochMs = Date.now() + 60000;

    await store.put(token, blobRef, expiresAtEpochMs);
    const result = await store.get(token);

    expect(result).not.toBeNull();
    expect(result!.blobRef).toBe(blobRef);
    expect(result!.expiresAtEpochMs).toBe(expiresAtEpochMs);

    // Cleanup: close the store
    await store.close();
  });
});
