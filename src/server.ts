/**
 * Server entry point for image-hospital service
 */

import { createHttpServer } from './modules/http-api';

async function main() {
  console.log('Starting image-hospital server...');
  
  const server = await createHttpServer({
    port: parseInt(process.env.PORT || '3000'),
    metadataStoreConfig: {
      host: process.env.PG_HOST || 'localhost',
      port: parseInt(process.env.PG_PORT || '5432'),
      database: process.env.PG_DATABASE || 'image_hospital',
      user: process.env.PG_USER || process.env.USER || 'postgres',
      password: process.env.PG_PASSWORD || '',
      connectionString: process.env.DATABASE_URL,
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

