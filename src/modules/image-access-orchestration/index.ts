/**
 * Image Access Orchestration Module
 *
 * Orchestrates image access requests:
 * 1. Looks up token metadata via Metadata Store
 * 2. Applies expiration rules with clock skew tolerance
 * 3. If allowed, retrieves image via Blob Storage Interface
 * 4. Returns either:
 *    - success with blob
 *    - access denied (expired/invalid/missing)
 *
 * This module is HTTP-agnostic and async.
 */

import { MetadataStore, TokenMetadata } from '../metadata-store';

/**
 * Minimal Blob Storage Interface abstraction used by this module.
 * The actual implementation (e.g., local filesystem) is provided by the caller.
 */
export interface BlobStorage {
  get(blobRef: string): Promise<Buffer>;
}

export type AccessDeniedReason = 'missing' | 'expired' | 'invalid';

export interface AccessSuccessResult {
  allowed: true;
  blob: Buffer;
  metadata: TokenMetadata & { token: string };
}

export interface AccessDeniedResult {
  allowed: false;
  reason: AccessDeniedReason;
}

export type AccessResult = AccessSuccessResult | AccessDeniedResult;

export interface ImageAccessDependencies {
  metadataStore: MetadataStore;
  blobStorage: BlobStorage;
  /**
   * Optional clock function for testability.
   * Defaults to Date.now().
   */
  now?: () => number;
}

/** Clock skew tolerance: ±5 seconds (in milliseconds) */
const CLOCK_SKEW_TOLERANCE_MS = 5_000;

/**
 * Centralized expiration check with clock skew tolerance.
 *
 * Rules:
 * - URLs expire exactly 60 seconds after creation (expiresAtEpochMs).
 * - Clock skew of ±5 seconds is acceptable.
 * - If there is any ambiguity, access must be denied.
 *
 * We treat tokens as expired when now is definitively past
 * the expiration time plus tolerance.
 */
export function isTokenExpired(nowMs: number, expiresAtEpochMs: number): boolean {
  // Allow a small tolerance window after the nominal expiration time
  // to account for clock skew between nodes.
  // Beyond that, the token is definitively expired.
  return nowMs > expiresAtEpochMs + CLOCK_SKEW_TOLERANCE_MS;
}

/**
 * Orchestrate image access for a given token.
 *
 * @param token - The opaque token identifying the image URL
 * @param deps - Dependencies (metadata store, blob storage, optional clock)
 * @returns AccessResult indicating success with blob or access denied
 */
export async function accessImage(
  token: string,
  deps: ImageAccessDependencies,
): Promise<AccessResult> {
  const { metadataStore, blobStorage } = deps;
  const nowFn = deps.now ?? Date.now;

  if (!token || typeof token !== 'string' || token.trim() === '') {
    return { allowed: false, reason: 'invalid' };
  }

  // 1. Look up token metadata
  const metadata = await metadataStore.get(token);

  // 2. If metadata is missing → deny access
  if (!metadata) {
    return { allowed: false, reason: 'missing' };
  }

  // 3. Expiration check (with central time comparison)
  const nowMs = nowFn();
  if (isTokenExpired(nowMs, metadata.expiresAtEpochMs)) {
    // When in doubt (beyond tolerance), deny access
    return { allowed: false, reason: 'expired' };
  }

  // 4. Retrieve blob via Blob Storage Interface
  const blob = await blobStorage.get(metadata.blobRef);

  // 5. Return success with blob
  return {
    allowed: true,
    blob,
    metadata: {
      token,
      blobRef: metadata.blobRef,
      expiresAtEpochMs: metadata.expiresAtEpochMs,
    },
  };
}

