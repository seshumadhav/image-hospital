/**
 * Upload Orchestration Module
 *
 * Coordinates the image upload process:
 * 1. Validates input (type and size)
 * 2. Stores the image via Blob Storage Interface
 * 3. Generates a token via Token Service
 * 4. Computes expiresAtEpochMs = now + 60 seconds
 * 5. Persists metadata via Metadata Store Interface
 * 6. Returns { token, blobRef, expiresAtEpochMs }
 *
 * This module is intentionally HTTP-agnostic and async.
 */

import { MetadataStore } from '../metadata-store';

export interface BlobStorageSaveOptions {
  contentType?: string;
  filename?: string;
}

/**
 * Minimal Blob Storage Interface abstraction used by this module.
 * The actual implementation (e.g., local filesystem) is provided by the caller.
 */
export interface BlobStorage {
  save(data: Buffer, options: BlobStorageSaveOptions): Promise<string>;
}

/**
 * Minimal Token Service abstraction used by this module.
 * The actual implementation is provided by the caller.
 */
export interface TokenService {
  generateToken(): string | Promise<string>;
}

export interface UploadRequest {
  /** Raw image bytes */
  data: Buffer;
  /** MIME type of the image (e.g., image/jpeg, image/png) */
  contentType: string;
  /** Optional original filename */
  filename?: string;
}

export interface UploadResult {
  token: string;
  blobRef: string;
  expiresAtEpochMs: number;
}

export interface UploadDependencies {
  blobStorage: BlobStorage;
  metadataStore: MetadataStore;
  tokenService: TokenService;
  /**
   * Optional clock function for testability.
   * Defaults to Date.now().
   */
  now?: () => number;
}

/** Supported image MIME types */
const SUPPORTED_IMAGE_TYPES = new Set<string>([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

/** Maximum allowed image size in bytes (e.g., 5 MiB) */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** URL expiry duration in milliseconds (60 seconds) */
const EXPIRY_DURATION_MS = 60_000;

export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadValidationError';
  }
}

function validateUploadInput(input: UploadRequest): void {
  if (!input || !(input.data instanceof Buffer)) {
    throw new UploadValidationError('Invalid image data');
  }

  if (input.data.length === 0) {
    throw new UploadValidationError('Image data is empty');
  }

  if (input.data.length > MAX_IMAGE_BYTES) {
    throw new UploadValidationError('Image exceeds maximum allowed size');
  }

  if (!input.contentType || typeof input.contentType !== 'string') {
    throw new UploadValidationError('contentType is required');
  }

  if (!SUPPORTED_IMAGE_TYPES.has(input.contentType)) {
    throw new UploadValidationError(`Unsupported image contentType: ${input.contentType}`);
  }
}

/**
 * Orchestrate an image upload.
 *
 * This function is async and side-effectful only through the injected dependencies:
 * - blobStorage
 * - metadataStore
 * - tokenService
 */
export async function uploadImage(
  input: UploadRequest,
  deps: UploadDependencies,
): Promise<UploadResult> {
  // 1. Validate input
  validateUploadInput(input);

  const { blobStorage, metadataStore, tokenService } = deps;
  const nowFn = deps.now ?? Date.now;

  // 2. Store image via Blob Storage Interface
  const blobRef = await blobStorage.save(input.data, {
    contentType: input.contentType,
    filename: input.filename,
  });

  // 3. Generate a new token via Token Service
  const token = await Promise.resolve(tokenService.generateToken());

  // 4. Compute expiresAtEpochMs = now + 60 seconds
  const nowMs = nowFn();
  const expiresAtEpochMs = nowMs + EXPIRY_DURATION_MS;

  // 5. Persist metadata
  await metadataStore.put(token, blobRef, expiresAtEpochMs);

  // 6. Return result
  return {
    token,
    blobRef,
    expiresAtEpochMs,
  };
}

/**
 * Upload Orchestration Module
 * 
 * Orchestrates the image upload process:
 * - Receives uploaded image data
 * - Stores image via Blob Storage Interface
 * - Creates metadata via Metadata Store Interface
 * - Generates token via Token Service
 * - Returns unique URL
 * 
 * TODO: Implement upload orchestration logic
 * TODO: Coordinate between blob storage, metadata store, and token service
 * TODO: Generate unique URL with token
 * TODO: Handle upload errors
 */

// TODO: Import Blob Storage Interface
// TODO: Import Metadata Store Interface
// TODO: Import Token Service

// TODO: Export upload orchestration function

