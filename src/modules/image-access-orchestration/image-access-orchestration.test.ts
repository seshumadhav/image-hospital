/**
 * Unit tests for Image Access Orchestration Module
 *
 * Tests cover:
 * - Valid token before expiry → allowed
 * - Expired token → denied
 * - Missing token → denied
 * - Boundary conditions around expiry (+/- 5s tolerance)
 * - Blob storage is NOT called when access is denied
 */

import { MetadataStore, TokenMetadata } from '../metadata-store';
import {
  AccessResult,
  BlobStorage,
  ImageAccessDependencies,
  accessImage,
  isTokenExpired,
} from './index';

describe('isTokenExpired', () => {
  const T = 1_000_000;
  const tolerance = 5_000;

  it('should return false well before expiry', () => {
    expect(isTokenExpired(T - 30_000, T)).toBe(false);
  });

  it('should return false exactly at expiry', () => {
    expect(isTokenExpired(T, T)).toBe(false);
  });

  it('should return false within tolerance after expiry', () => {
    expect(isTokenExpired(T + tolerance - 1, T)).toBe(false);
  });

  it('should return true beyond tolerance after expiry', () => {
    expect(isTokenExpired(T + tolerance + 1, T)).toBe(true);
  });
});

describe('accessImage', () => {
  const NOW = 1_000_000;

  const createMetadata = (overrides: Partial<TokenMetadata> = {}): TokenMetadata => ({
    blobRef: 'blob-ref-123',
    expiresAtEpochMs: NOW + 60_000,
    ...overrides,
  });

  const createDeps = (metadata: TokenMetadata | null, now: number = NOW) => {
    const metadataStore: MetadataStore = {
      put: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(metadata),
      close: jest.fn().mockResolvedValue(undefined),
    };

    const blobStorage: BlobStorage = {
      get: jest.fn().mockResolvedValue(Buffer.from('image-bytes')),
    };

    const deps: ImageAccessDependencies = {
      metadataStore,
      blobStorage,
      now: () => now,
    };

    return { metadataStore, blobStorage, deps };
  };

  it('should allow access for a valid token before expiry', async () => {
    const metadata = createMetadata({ expiresAtEpochMs: NOW + 60_000 });
    const { metadataStore, blobStorage, deps } = createDeps(metadata, NOW + 10_000);

    const result = (await accessImage('valid-token', deps)) as AccessResult;

    expect(metadataStore.get).toHaveBeenCalledTimes(1);
    expect(metadataStore.get).toHaveBeenCalledWith('valid-token');
    expect(blobStorage.get).toHaveBeenCalledTimes(1);
    expect(blobStorage.get).toHaveBeenCalledWith('blob-ref-123');

    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.blob.toString()).toBe('image-bytes');
      expect(result.metadata.blobRef).toBe('blob-ref-123');
      expect(result.metadata.expiresAtEpochMs).toBe(metadata.expiresAtEpochMs);
      expect(result.metadata.token).toBe('valid-token');
    }
  });

  it('should deny access when metadata is missing', async () => {
    const { metadataStore, blobStorage, deps } = createDeps(null, NOW);

    const result = await accessImage('missing-token', deps);

    expect(metadataStore.get).toHaveBeenCalledTimes(1);
    expect(metadataStore.get).toHaveBeenCalledWith('missing-token');
    expect(blobStorage.get).not.toHaveBeenCalled();

    expect(result).toEqual({ allowed: false, reason: 'missing' });
  });

  it('should deny access when token is expired', async () => {
    const expiresAt = NOW - 60_000;
    const metadata = createMetadata({ expiresAtEpochMs: expiresAt });
    const { metadataStore, blobStorage, deps } = createDeps(metadata, NOW + 60_000 + 6_000);

    const result = await accessImage('expired-token', deps);

    expect(metadataStore.get).toHaveBeenCalledTimes(1);
    expect(metadataStore.get).toHaveBeenCalledWith('expired-token');
    expect(blobStorage.get).not.toHaveBeenCalled();

    expect(result).toEqual({ allowed: false, reason: 'expired' });
  });

  it('should respect tolerance window around expiry', async () => {
    const expiresAt = NOW + 10_000;
    const metadata = createMetadata({ expiresAtEpochMs: expiresAt });

    // Within tolerance: should still be allowed
    const withinToleranceNow = expiresAt + 4_000; // < +5000
    const { metadataStore, blobStorage, deps } = createDeps(metadata, withinToleranceNow);

    const resultWithin = await accessImage('token-tolerance', deps);
    expect(resultWithin.allowed).toBe(true);
    expect(blobStorage.get).toHaveBeenCalledTimes(1);

    // Beyond tolerance: should be denied
    const beyondToleranceNow = expiresAt + 6_000; // > +5000
    const { metadataStore: metadataStore2, blobStorage: blobStorage2, deps: deps2 } = createDeps(
      metadata,
      beyondToleranceNow,
    );

    const resultBeyond = await accessImage('token-tolerance', deps2);
    expect(resultBeyond).toEqual({ allowed: false, reason: 'expired' });
    expect(blobStorage2.get).not.toHaveBeenCalled();
  });

  it('should deny access for invalid/empty token', async () => {
    const metadata = createMetadata();
    const { metadataStore, blobStorage, deps } = createDeps(metadata, NOW);

    const resultEmpty = await accessImage('', deps);
    const resultWhitespace = await accessImage('   ', deps);

    // Metadata store and blob storage should not be called
    expect(metadataStore.get).not.toHaveBeenCalled();
    expect(blobStorage.get).not.toHaveBeenCalled();

    expect(resultEmpty).toEqual({ allowed: false, reason: 'invalid' });
    expect(resultWhitespace).toEqual({ allowed: false, reason: 'invalid' });
  });
});

