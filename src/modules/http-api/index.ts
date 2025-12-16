/**
 * HTTP API Layer
 * 
 * Handles HTTP requests and responses for the image-hospital service.
 */

import * as http from 'http';
import { createMetadataStore, MetadataStore, MetadataStoreConfig } from '../metadata-store';

export interface HttpServerConfig {
  port?: number;
  metadataStoreConfig?: MetadataStoreConfig;
}

export class HttpServer {
  private server: http.Server;
  private metadataStore: MetadataStore;
  private port: number;

  constructor(config: HttpServerConfig = {}) {
    this.port = config.port || parseInt(process.env.PORT || '3000');
    
    // Initialize metadata store - fail fast if initialization fails
    this.metadataStore = createMetadataStore(config.metadataStoreConfig);
    
    this.server = http.createServer(this.handleRequest.bind(this));
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    // Set CORS headers for development
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    // Handle health check endpoint
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    // 404 for all other routes
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
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
      errorMessage = String(error.message);
    } else {
      errorMessage = String(error);
    }
    throw new Error(`Failed to initialize metadata store: ${errorMessage}`);
  }
  
  await server.start();
  return server;
}
