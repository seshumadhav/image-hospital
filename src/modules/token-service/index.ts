/**
 * Token Service
 * 
 * Generates cryptographically strong, opaque, unguessable tokens for image URLs.
 * 
 * Tokens are:
 * - Opaque (no embedded meaning)
 * - High entropy (256 bits = 32 bytes)
 * - URL-safe (base64url encoding)
 * - Deterministic only in length/format, not value
 */

import * as crypto from 'crypto';

/**
 * Generate a cryptographically strong, opaque token.
 * 
 * Uses 32 bytes (256 bits) of entropy, encoded as base64url for URL-safety.
 * This provides well above the minimum 128 bits required.
 * 
 * @returns A URL-safe token string (43 characters in base64url encoding)
 */
export function generateToken(): string {
  // Generate 32 bytes (256 bits) of cryptographically secure random data
  const randomBytes = crypto.randomBytes(32);
  
  // Encode as base64url (URL-safe variant of base64)
  // Replaces '+' with '-', '/' with '_', and removes padding '='
  return randomBytes
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
