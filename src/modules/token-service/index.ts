/**
 * Token Service
 * 
 * Generates cryptographically strong, opaque, unguessable tokens for image URLs.
 * 
 * Tokens are:
 * - Opaque (no embedded meaning)
 * - High entropy (48 bits = 6 bytes)
 * - URL-safe (alphanumeric only: A-Z, a-z, 0-9)
 * - Deterministic only in length/format, not value
 */

import * as crypto from 'crypto';

/**
 * Alphanumeric character set (A-Z, a-z, 0-9)
 */
const ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Generate a cryptographically strong, opaque token.
 * 
 * Uses 8 bytes of entropy, encoded as 8-character alphanumeric string.
 * This provides 62^8 = ~218 trillion possible combinations.
 * 
 * @returns A URL-safe alphanumeric token string (8 characters)
 */
export function generateToken(): string {
  // Generate 8 bytes of cryptographically secure random data
  const randomBytes = crypto.randomBytes(8);
  
  // Map each byte to an alphanumeric character
  let token = '';
  for (let i = 0; i < 8; i++) {
    // Use modulo 62 to get an index into the alphanumeric alphabet
    const index = randomBytes[i] % 62;
    token += ALPHANUMERIC[index];
  }
  
  return token;
}
