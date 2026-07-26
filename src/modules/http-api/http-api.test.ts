/**
 * API-level tests for the HTTP layer.
 *
 * Unlike the orchestration module tests (which exercise business logic with
 * mocked dependencies), these tests spin up a real HttpServer with a real
 * local blob storage directory and the real Postgres test database, then
 * issue real HTTP requests — covering the product's key functionality
 * end-to-end through the same code path a real client hits.
 */

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { HttpServer, createHttpServer } from './index';

const TEST_PORT = 39871;
const BASE_URL = `http://localhost:${TEST_PORT}`;

const testDbConfig = {
  database: process.env.PG_TEST_DATABASE || 'image_hospital_test',
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432'),
  user: process.env.PG_USER || process.env.USER || 'postgres',
  password: process.env.PG_PASSWORD || '',
};

// A minimal valid JPEG (smallest possible well-formed file: SOI + EOI markers).
const TINY_JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);

function uploadFile(data: Buffer, filename: string, contentType: string): Promise<Response> {
  const formData = new FormData();
  formData.append('file', new Blob([data], { type: contentType }), filename);
  return fetch(`${BASE_URL}/upload`, { method: 'POST', body: formData });
}

describe('HTTP API', () => {
  let server: HttpServer;
  let blobDir: string;

  beforeAll(async () => {
    blobDir = await fs.mkdtemp(path.join(os.tmpdir(), 'image-hospital-http-test-'));
    server = await createHttpServer({
      port: TEST_PORT,
      metadataStoreConfig: testDbConfig,
      blobStorageConfig: { storage: 'local', local: { directory: blobDir } },
    });
  });

  afterAll(async () => {
    await server.stop();
    await fs.rm(blobDir, { recursive: true, force: true });
  });

  describe('GET /health', () => {
    it('returns ok', async () => {
      const res = await fetch(`${BASE_URL}/health`);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ status: 'ok' });
    });
  });

  describe('POST /upload', () => {
    it('accepts a valid image and returns a token URL with expiry', async () => {
      const before = Date.now();
      const res = await uploadFile(TINY_JPEG, 'photo.jpg', 'image/jpeg');
      const after = Date.now();

      expect(res.status).toBe(200);
      const body = (await res.json()) as { url: string; expiresAtEpochMs: number };
      expect(body.url).toMatch(/^\/image\/[A-Za-z0-9_-]+$/);
      // URLs expire exactly 60s after creation (see image-access-orchestration).
      expect(body.expiresAtEpochMs).toBeGreaterThanOrEqual(before + 60_000);
      expect(body.expiresAtEpochMs).toBeLessThanOrEqual(after + 60_000);
    });

    it('rejects unsupported file types', async () => {
      const res = await uploadFile(Buffer.from('not an image'), 'notes.txt', 'text/plain');
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toMatch(/unsupported/i);
    });

    it('rejects a request with no file field', async () => {
      const res = await fetch(`${BASE_URL}/upload`, {
        method: 'POST',
        body: new FormData(),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /image/:token', () => {
    it('returns the uploaded bytes with the original content type', async () => {
      const uploadRes = await uploadFile(TINY_JPEG, 'photo.jpg', 'image/jpeg');
      const { url } = (await uploadRes.json()) as { url: string };

      const imageRes = await fetch(`${BASE_URL}${url}`);
      expect(imageRes.status).toBe(200);
      expect(imageRes.headers.get('content-type')).toBe('image/jpeg');
      const bytes = Buffer.from(await imageRes.arrayBuffer());
      expect(bytes.equals(TINY_JPEG)).toBe(true);
    });

    it('redirects to an error page for an unknown token', async () => {
      const res = await fetch(`${BASE_URL}/image/does-not-exist`, { redirect: 'manual' });
      expect(res.status).toBe(302);
      expect(res.headers.get('location')).toMatch(/^\/\?error=/);
    });

    it('denies access to an expired token (deny-by-default)', async () => {
      // Simulate a token whose 60s window has definitively passed, bypassing
      // the need to actually wait 60+ seconds in the test.
      const metadataStore = server.getMetadataStore();
      const expiredToken = 'expired-test-token';
      await metadataStore.put(expiredToken, 'fs:does-not-matter', Date.now() - 10_000);

      const res = await fetch(`${BASE_URL}/image/${expiredToken}`, { redirect: 'manual' });
      expect(res.status).toBe(302);
      expect(res.headers.get('location')).toMatch(/^\/\?error=/);
    });
  });
});
