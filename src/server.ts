/**
 * Server entry point for image-hospital service
 */

import { createHttpServer } from './modules/http-api';
import { loadConfig } from './config';

async function main() {
  console.log('Starting image-hospital server...');
  
  // Load configuration from config.json (environment variables override file values)
  const config = loadConfig();
  
  const server = await createHttpServer({
    port: config.server.port,
    metadataStoreConfig: {
      host: config.database.host,
      port: config.database.port,
      database: config.database.database,
      user: config.database.user,
      password: config.database.password,
      connectionString: config.database.connectionString,
    },
    blobStorageConfig: {
      storage: config.blobStorage.storage,
      local: config.blobStorage.local,
      s3: config.blobStorage.s3,
    },
  });

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

