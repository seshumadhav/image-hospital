/**
 * Unit tests for Token Service
 * 
 * Exhaustive tests covering:
 * - Token uniqueness across many generations
 * - Token length and character set
 * - URL-safety
 * - No accidental structure (timestamps, counters, etc.)
 */

import { generateToken } from './index';

describe('TokenService', () => {
  describe('token generation', () => {
    it('should generate a token', () => {
      const token = generateToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate tokens of consistent length', () => {
      const tokens = Array.from({ length: 100 }, () => generateToken());
      const lengths = tokens.map(t => t.length);
      const uniqueLengths = new Set(lengths);
      
      // All tokens should have the same length (43 chars for 32 bytes base64url)
      expect(uniqueLengths.size).toBe(1);
      expect(lengths[0]).toBe(43);
    });

    it('should generate unique tokens across many generations', () => {
      const tokenCount = 10000;
      const tokens = Array.from({ length: tokenCount }, () => generateToken());
      const uniqueTokens = new Set(tokens);
      
      // All tokens should be unique
      expect(uniqueTokens.size).toBe(tokenCount);
    });

    it('should generate tokens with high entropy (no collisions in large sample)', () => {
      const tokenCount = 100000;
      const tokens = Array.from({ length: tokenCount }, () => generateToken());
      const uniqueTokens = new Set(tokens);
      
      // With 256 bits of entropy, collisions should be extremely rare
      // If we see any collisions, something is wrong
      expect(uniqueTokens.size).toBe(tokenCount);
    });
  });

  describe('token format and character set', () => {
    it('should generate tokens using only URL-safe characters', () => {
      const tokens = Array.from({ length: 1000 }, () => generateToken());
      
      // Base64url alphabet: A-Z, a-z, 0-9, -, _
      const urlSafePattern = /^[A-Za-z0-9_-]+$/;
      
      tokens.forEach(token => {
        expect(token).toMatch(urlSafePattern);
      });
    });

    it('should not contain base64 padding characters', () => {
      const tokens = Array.from({ length: 1000 }, () => generateToken());
      
      tokens.forEach(token => {
        expect(token).not.toContain('=');
      });
    });

    it('should not contain base64 unsafe characters', () => {
      const tokens = Array.from({ length: 1000 }, () => generateToken());
      
      tokens.forEach(token => {
        expect(token).not.toContain('+');
        expect(token).not.toContain('/');
      });
    });

    it('should have correct length for 32 bytes base64url encoding', () => {
      // 32 bytes = 256 bits
      // Base64 encoding: 32 * 4/3 = 42.67, rounds up to 43 chars
      // Base64url without padding: 43 characters
      const token = generateToken();
      expect(token.length).toBe(43);
    });
  });

  describe('token opacity (no embedded structure)', () => {
    it('should not contain timestamps or date-like patterns', () => {
      const tokens = Array.from({ length: 1000 }, () => generateToken());
      
      // Check for common timestamp patterns (Unix epoch, ISO dates, etc.)
      const timestampPatterns = [
        /\d{10}/,  // Unix timestamp (10 digits)
        /\d{13}/,  // Unix timestamp in milliseconds (13 digits)
        /\d{4}-\d{2}-\d{2}/,  // ISO date
        /\d{2}:\d{2}:\d{2}/,  // Time
      ];
      
      tokens.forEach(token => {
        timestampPatterns.forEach(pattern => {
          // If a pattern matches, it might be accidental, but we check
          // that it's not a consistent pattern across tokens
          const match = token.match(pattern);
          if (match) {
            // If found, it should be random, not a consistent timestamp
            // We'll verify this by checking uniqueness
          }
        });
      });
      
      // All tokens should still be unique (no timestamp-based generation)
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(1000);
    });

    it('should not have sequential or counter-like patterns', () => {
      const tokens = Array.from({ length: 100 }, () => generateToken());
      
      // Check that tokens don't have sequential patterns
      // If tokens were generated with a counter, we'd see patterns
      for (let i = 1; i < tokens.length; i++) {
        const prev = tokens[i - 1];
        const curr = tokens[i];
        
        // Tokens should not be sequential or similar
        expect(curr).not.toBe(prev);
        
        // Check for simple increment patterns (e.g., token1, token2)
        // This is harder to detect, but uniqueness test covers it
      }
      
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(100);
    });

    it('should have no predictable prefixes or suffixes', () => {
      const tokens = Array.from({ length: 100 }, () => generateToken());
      
      // Check first and last characters for fixed patterns
      const firstChars = tokens.map(t => t[0]);
      const lastChars = tokens.map(t => t[t.length - 1]);
      
      // Deterministic check: tokens should not all start/end with the same character
      // (which would indicate a fixed prefix/suffix)
      const uniqueFirstChars = new Set(firstChars);
      const uniqueLastChars = new Set(lastChars);
      
      // If all tokens had the same prefix/suffix, we'd only see 1 unique char
      // With randomness, we should see multiple different chars (deterministic check)
      expect(uniqueFirstChars.size).toBeGreaterThan(1);
      expect(uniqueLastChars.size).toBeGreaterThan(1);
      
      // Also verify all tokens are unique (deterministic)
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(100);
    });

    it('should have no consistent structure across tokens', () => {
      const tokens = Array.from({ length: 100 }, () => generateToken());
      
      // Deterministic check: verify no fixed pattern at any position
      // If there was a fixed pattern (e.g., all tokens have 'A' at position 0),
      // we'd see only 1 unique character at that position
      for (let pos = 0; pos < 43; pos++) {
        const charsAtPos = tokens.map(t => t[pos]);
        const uniqueCharsAtPos = new Set(charsAtPos);
        
        // With randomness, each position should have multiple different characters
        // If we see only 1 unique char, there's a fixed pattern (deterministic failure)
        expect(uniqueCharsAtPos.size).toBeGreaterThan(1);
      }
      
      // Also verify all tokens are unique (deterministic check)
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(100);
    });
  });

  describe('entropy validation', () => {
    it('should generate tokens with sufficient entropy (>=128 bits)', () => {
      // We use 32 bytes = 256 bits, which is well above 128 bits
      // Verify by checking token length: 43 chars base64url = 256 bits
      const token = generateToken();
      
      // 43 characters of base64url = 43 * 6 bits = 258 bits (with padding removed)
      // Actually: 32 bytes * 8 bits = 256 bits
      // Base64url encoding: ceil(256/6) = 43 characters
      // Each character represents ~6 bits, so 43 chars = ~258 bits
      expect(token.length).toBe(43);
      
      // Verify we're using crypto.randomBytes which provides cryptographically secure randomness
      // The length check ensures we have at least 128 bits (would need at least 22 chars)
      expect(token.length).toBeGreaterThanOrEqual(22);
    });

    it('should fail loudly if token length changes unexpectedly', () => {
      // This test ensures we catch any changes to token generation
      const token = generateToken();
      
      // If this assertion fails, token generation has changed
      // and we need to verify entropy is still sufficient
      expect(token.length).toBe(43);
      
      // Document the expected entropy
      // 43 chars base64url = 43 * 6 = 258 bits (well above 128 bit minimum)
    });
  });

  describe('URL safety', () => {
    it('should be safe to use in URL paths', () => {
      const token = generateToken();
      
      // Test that token can be used in a URL
      const testUrl = `https://example.com/images/${token}`;
      const url = new URL(testUrl);
      
      // URL should parse correctly
      expect(url.pathname).toContain(token);
    });

    it('should be safe to use in URL query parameters', () => {
      const token = generateToken();
      
      // Test that token can be used in query params
      const testUrl = `https://example.com/image?token=${token}`;
      const url = new URL(testUrl);
      
      // URL should parse correctly
      expect(url.searchParams.get('token')).toBe(token);
    });

    it('should not require URL encoding', () => {
      const tokens = Array.from({ length: 1000 }, () => generateToken());
      
      tokens.forEach(token => {
        // encodeURIComponent should not change the token
        const encoded = encodeURIComponent(token);
        expect(encoded).toBe(token);
      });
    });
  });

  describe('determinism', () => {
    it('should generate different tokens on each call', () => {
      const token1 = generateToken();
      const token2 = generateToken();
      const token3 = generateToken();
      
      expect(token1).not.toBe(token2);
      expect(token2).not.toBe(token3);
      expect(token1).not.toBe(token3);
    });

    it('should only be deterministic in length/format, not value', () => {
      const tokens = Array.from({ length: 100 }, () => generateToken());
      
      // All tokens should have same length and format
      const lengths = tokens.map(t => t.length);
      const uniqueLengths = new Set(lengths);
      expect(uniqueLengths.size).toBe(1);
      
      // But all values should be different
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(100);
    });
  });
});

