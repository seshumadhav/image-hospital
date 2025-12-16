/**
 * Unit tests for Upload Orchestration Module
 *
 * Tests cover:
 * - Correct call order: blob storage -> token -> metadata store
 * - Correct expiry computation: now + 60 seconds
 * - New token per call
 * - Validation failures for invalid images
 */

import { MetadataStore } from '../metadata-store';
import {
  BlobStorage,
  TokenService,
  UploadDependencies,
  UploadRequest,
  UploadValidationError,
  uploadImage,
} from './index';

describe('uploadImage', () => {
  const FIXED_NOW = 1_000_000;

  const createMocks = () => {
    const blobStorage: BlobStorage = {
      save: jest.fn().mockResolvedValue('blob-ref-123'),
    };

    const metadataStore: MetadataStore = {
      put: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(null),
      close: jest.fn().mockResolvedValue(undefined),
    };

    const tokenService: TokenService = {
      generateToken: jest.fn().mockReturnValue('token-abc'),
    };

    const deps: UploadDependencies = {
      blobStorage,
      metadataStore,
      tokenService,
      now: () => FIXED_NOW,
    };

    return { blobStorage, metadataStore, tokenService, deps };
  };

  const createValidRequest = (overrides: Partial<UploadRequest> = {}): UploadRequest => {
    return {
      data: Buffer.alloc(1024, 0x01),
      contentType: 'image/jpeg',
      filename: 'test.jpg',
      ...overrides,
    };
  };

  it('should orchestrate upload: validate, store, generate token, persist metadata, and return result', async () => {
    const { blobStorage, metadataStore, tokenService, deps } = createMocks();
    const request = createValidRequest();

    const result = await uploadImage(request, deps);

    // Blob storage was called with correct arguments
    expect(blobStorage.save).toHaveBeenCalledTimes(1);
    expect(blobStorage.save).toHaveBeenCalledWith(request.data, {
      contentType: request.contentType,
      filename: request.filename,
    });

    // Token was generated once
    expect(tokenService.generateToken).toHaveBeenCalledTimes(1);

    // Metadata store was called with correct token, blobRef, and expiry
    const expectedExpiresAt = FIXED_NOW + 60_000;
    expect(metadataStore.put).toHaveBeenCalledTimes(1);
    expect(metadataStore.put).toHaveBeenCalledWith('token-abc', 'blob-ref-123', expectedExpiresAt);

    // Result matches expected structure
    expect(result).toEqual({
      token: 'token-abc',
      blobRef: 'blob-ref-123',
      expiresAtEpochMs: expectedExpiresAt,
    });
  });

  it('should call dependencies in correct order: blob storage -> token -> metadata', async () => {
    const { blobStorage, metadataStore, tokenService, deps } = createMocks();
    const request = createValidRequest();

    await uploadImage(request, deps);

    const saveOrder = (blobStorage.save as jest.Mock).mock.invocationCallOrder[0];
    const tokenOrder = (tokenService.generateToken as jest.Mock).mock.invocationCallOrder[0];
    const putOrder = (metadataStore.put as jest.Mock).mock.invocationCallOrder[0];

    expect(saveOrder).toBeLessThan(tokenOrder);
    expect(tokenOrder).toBeLessThan(putOrder);
  });

  it('should compute expiresAtEpochMs as now + 60 seconds', async () => {
    const { metadataStore, deps } = createMocks();
    const request = createValidRequest();

    await uploadImage(request, deps);

    const expectedExpiresAt = FIXED_NOW + 60_000;
    expect(metadataStore.put).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expectedExpiresAt,
    );
  });

  it('should generate a new token for each upload', async () => {
    const { metadataStore, tokenService, deps } = createMocks();
    (tokenService.generateToken as jest.Mock)
      .mockReturnValueOnce('token-1')
      .mockReturnValueOnce('token-2');

    const request1 = createValidRequest({ filename: 'one.jpg' });
    const request2 = createValidRequest({ filename: 'two.jpg' });

    const result1 = await uploadImage(request1, deps);
    const result2 = await uploadImage(request2, deps);

    expect(result1.token).toBe('token-1');
    expect(result2.token).toBe('token-2');

    expect(metadataStore.put).toHaveBeenNthCalledWith(
      1,
      'token-1',
      'blob-ref-123',
      FIXED_NOW + 60_000,
    );
    expect(metadataStore.put).toHaveBeenNthCalledWith(
      2,
      'token-2',
      'blob-ref-123',
      FIXED_NOW + 60_000,
    );
  });

  it('should fail fast on unsupported contentType', async () => {
    const { blobStorage, metadataStore, tokenService, deps } = createMocks();
    const request = createValidRequest({ contentType: 'application/octet-stream' });

    await expect(uploadImage(request, deps)).rejects.toBeInstanceOf(UploadValidationError);

    expect(blobStorage.save).not.toHaveBeenCalled();
    expect(tokenService.generateToken).not.toHaveBeenCalled();
    expect(metadataStore.put).not.toHaveBeenCalled();
  });

  it('should fail fast on oversized image', async () => {
    const { blobStorage, metadataStore, tokenService, deps } = createMocks();
    const oversizedData = Buffer.alloc(6 * 1024 * 1024, 0x01); // 6 MiB
    const request = createValidRequest({ data: oversizedData });

    await expect(uploadImage(request, deps)).rejects.toBeInstanceOf(UploadValidationError);

    expect(blobStorage.save).not.toHaveBeenCalled();
    expect(tokenService.generateToken).not.toHaveBeenCalled();
    expect(metadataStore.put).not.toHaveBeenCalled();
  });

  it('should fail fast on empty image data', async () => {
    const { blobStorage, metadataStore, tokenService, deps } = createMocks();
    const request = createValidRequest({ data: Buffer.alloc(0) });

    await expect(uploadImage(request, deps)).rejects.toBeInstanceOf(UploadValidationError);

    expect(blobStorage.save).not.toHaveBeenCalled();
    expect(tokenService.generateToken).not.toHaveBeenCalled();
    expect(metadataStore.put).not.toHaveBeenCalled();
  });

  it('should fail fast when contentType is missing', async () => {
    const { blobStorage, metadataStore, tokenService, deps } = createMocks();
    const request = createValidRequest({ contentType: '' as unknown as string });

    await expect(uploadImage(request, deps)).rejects.toBeInstanceOf(UploadValidationError);

    expect(blobStorage.save).not.toHaveBeenCalled();
    expect(tokenService.generateToken).not.toHaveBeenCalled();
    expect(metadataStore.put).not.toHaveBeenCalled();
  });
});


