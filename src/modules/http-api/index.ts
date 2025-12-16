/**
 * HTTP API Layer
 *
 * Handles HTTP requests and responses for the image-hospital service.
 */

import * as http from 'http';
import * as crypto from 'crypto';
import { createMetadataStore, MetadataStore, MetadataStoreConfig } from '../metadata-store';
import {
  uploadImage,
  UploadDependencies,
  UploadRequest,
  UploadValidationError,
  BlobStorage as UploadBlobStorage,
  BlobStorageSaveOptions,
  TokenService,
} from '../upload-orchestration';
import {
  accessImage,
  ImageAccessDependencies,
  BlobStorage as AccessBlobStorage,
} from '../image-access-orchestration';
import { generateToken } from '../token-service';

type CombinedBlobStorage = UploadBlobStorage & AccessBlobStorage;

export interface HttpServerConfig {
  port?: number;
  metadataStoreConfig?: MetadataStoreConfig;
}

class InMemoryBlobStorage implements CombinedBlobStorage {
  private store = new Map<string, { data: Buffer; contentType?: string }>();

  async save(data: Buffer, options: BlobStorageSaveOptions): Promise<string> {
    const id =
      typeof crypto.randomUUID === 'function'
        ? `mem:${crypto.randomUUID()}`
        : `mem:${crypto.randomBytes(16).toString('hex')}`;

    this.store.set(id, { data, contentType: options.contentType });
    return id;
  }

  async get(blobRef: string): Promise<Buffer> {
    const entry = this.store.get(blobRef);
    if (!entry) {
      throw new Error('Blob not found');
    }
    return entry.data;
  }

  getContentType(blobRef: string): string | undefined {
    return this.store.get(blobRef)?.contentType;
  }
}

export class HttpServer {
  private server: http.Server;
  private metadataStore: MetadataStore;
  private port: number;
  private uploadDeps: UploadDependencies;
  private imageAccessDeps: ImageAccessDependencies;

  constructor(config: HttpServerConfig = {}) {
    this.port = config.port || parseInt(process.env.PORT || '3000');

    // Initialize metadata store - fail fast if initialization fails
    this.metadataStore = createMetadataStore(config.metadataStoreConfig);

    // Initialize shared blob storage implementation (in-memory)
    const blobStorage: CombinedBlobStorage = new InMemoryBlobStorage();

    // Initialize upload orchestration dependencies
    const tokenService: TokenService = {
      generateToken,
    };

    this.uploadDeps = {
      blobStorage,
      metadataStore: this.metadataStore,
      tokenService,
    };

    // Initialize image access orchestration dependencies
    this.imageAccessDeps = {
      metadataStore: this.metadataStore,
      blobStorage,
    };

    this.server = http.createServer(this.handleRequest.bind(this));
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    // Set CORS headers for development
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    const url = req.url || '/';
    const path = url.split('?', 1)[0];

    // Health check endpoint
    if (req.method === 'GET' && path === '/health') {
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    // Upload endpoint
    if (req.method === 'POST' && (path === '/upload' || path === '/upload/')) {
      this.handleUpload(req, res);
      return;
    }

    // Image access endpoint: GET /image/:token
    if (req.method === 'GET' && path.startsWith('/image/')) {
      this.handleImage(req, res);
      return;
    }

    // 404 for all other routes
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }

  private handleImage(req: http.IncomingMessage, res: http.ServerResponse): void {
    const url = req.url || '/';
    const path = url.split('?', 1)[0];
    const prefix = '/image/';

    const token = path.startsWith(prefix) ? path.slice(prefix.length) : '';
    if (!token) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    (async () => {
      try {
        const result = await accessImage(token, this.imageAccessDeps);

        if (!result.allowed) {
          // Deny access consistently as 404
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Not found' }));
          return;
        }

        // Successful access: return the image bytes
        // Try to use the original content type if available, otherwise default
        let contentType = 'application/octet-stream';
        if (this.uploadDeps.blobStorage instanceof InMemoryBlobStorage) {
          const ct = this.uploadDeps.blobStorage.getContentType(result.metadata.blobRef);
          if (ct) {
            contentType = ct;
          }
        }

        // Override JSON content type for this response
        res.setHeader('Content-Type', contentType);
        res.writeHead(200);
        res.end(result.blob);
      } catch {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    })();
  }

  private handleUpload(req: http.IncomingMessage, res: http.ServerResponse): void {
    const contentType = req.headers['content-type'];

    if (!contentType || !contentType.startsWith('multipart/form-data')) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Content-Type must be multipart/form-data' }));
      return;
    }

    const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
    if (!boundaryMatch) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Missing multipart boundary' }));
      return;
    }

    const boundary = boundaryMatch[1];

    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    req.on('end', async () => {
      try {
        const body = Buffer.concat(chunks);
        const uploadReq = this.parseMultipartSingleFile(body, boundary);

        const result = await uploadImage(uploadReq, this.uploadDeps);

        const host = req.headers.host || `localhost:${this.port}`;
        const protoHeader = req.headers['x-forwarded-proto'];
        const proto =
          (Array.isArray(protoHeader) ? protoHeader[0] : protoHeader) ||
          (this.port === 443 ? 'https' : 'http');

        const url = `${proto}://${host}/image/${result.token}`;

        res.writeHead(200);
        res.end(
          JSON.stringify({
            url,
            expiresAtEpochMs: result.expiresAtEpochMs,
          }),
        );
      } catch (error) {
        if (error instanceof UploadValidationError) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: error.message }));
          return;
        }

        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });

    req.on('error', () => {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Internal server error' }));
    });
  }

  private parseMultipartSingleFile(body: Buffer, boundary: string): UploadRequest {
    // Work with a binary string so indices align with buffer positions
    const bodyStr = body.toString('binary');
    const boundaryMarker = `--${boundary}`;
    const boundaryEndMarker = `--${boundary}--`;

    const firstBoundaryIndex = bodyStr.indexOf(boundaryMarker);
    if (firstBoundaryIndex === -1) {
      throw new UploadValidationError('Invalid multipart/form-data format');
    }

    // Start of the first part (after boundary + CRLF)
    const partStart = firstBoundaryIndex + boundaryMarker.length + 2; // skip \r\n

    const endBoundaryIndex = bodyStr.indexOf(boundaryEndMarker, partStart);
    if (endBoundaryIndex === -1) {
      throw new UploadValidationError('Invalid multipart/form-data format');
    }

    const partStr = bodyStr.slice(partStart, endBoundaryIndex);
    const headerEndIndex = partStr.indexOf('\r\n\r\n');
    if (headerEndIndex === -1) {
      throw new UploadValidationError('Invalid multipart/form-data headers');
    }

    const headersStr = partStr.slice(0, headerEndIndex);
    const headerLines = headersStr.split('\r\n').filter(Boolean);

    const dispositionLine = headerLines.find((line) =>
      line.toLowerCase().startsWith('content-disposition'),
    );
    if (!dispositionLine) {
      throw new UploadValidationError('Missing Content-Disposition header');
    }

    const nameMatch = dispositionLine.match(/name="([^"]+)"/i);
    const filenameMatch = dispositionLine.match(/filename="([^"]*)"/i);
    const fieldName = nameMatch?.[1];
    const filename = filenameMatch?.[1] || undefined;

    if (!fieldName || fieldName !== 'file') {
      throw new UploadValidationError('Expected file field named "file"');
    }

    const contentTypeLine = headerLines.find((line) =>
      line.toLowerCase().startsWith('content-type'),
    );
    const contentTypeMatch = contentTypeLine?.match(/content-type:\s*([^\r\n]+)/i);
    const contentType = contentTypeMatch?.[1]?.trim();

    if (!contentType) {
      throw new UploadValidationError('Missing file content type');
    }

    // File data starts after headers (\r\n\r\n) and goes up to just before the CRLF preceding the next boundary
    const fileDataStartInStr = partStart + headerEndIndex + 4; // +4 for \r\n\r\n
    // There should be a trailing \r\n before the ending boundary
    const fileDataEndInStr = endBoundaryIndex - 2; // strip \r\n before boundary

    if (fileDataEndInStr <= fileDataStartInStr) {
      throw new UploadValidationError('Empty file data');
    }

    const fileData = body.slice(fileDataStartInStr, fileDataEndInStr);

    return {
      data: fileData,
      contentType,
      filename,
    };
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, () => {
        console.log(`✓ Server started on port ${this.port}`);
        console.log(`✓ Health check available at http://localhost:${this.port}/health`);
        resolve();
      });

      this.server.on('error', (error) => {
        reject(error);
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(async () => {
        await this.metadataStore.close();
        console.log('Server stopped');
        resolve();
      });
    });
  }

  getMetadataStore(): MetadataStore {
    return this.metadataStore;
  }
}

/**
 * Create and start an HTTP server
 */
export async function createHttpServer(config?: HttpServerConfig): Promise<HttpServer> {
  const server = new HttpServer(config);

  // Initialize metadata store by attempting a simple operation
  // This ensures the store is ready before the server starts
  try {
    // Trigger schema initialization by attempting a get operation
    // This will fail fast if the database connection fails
    await server.getMetadataStore().get('__init_check__');
  } catch (error) {
    let errorMessage: string;
    if (error instanceof Error) {
      errorMessage = error.message;
      if (error.stack) {
        errorMessage += `\n${error.stack}`;
      }
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String((error as any).message);
    } else {
      errorMessage = String(error);
    }
    throw new Error(`Failed to initialize metadata store: ${errorMessage}`);
  }

  await server.start();
  return server;
}
