/**
 * Configuration Loader
 * 
 * Loads configuration from config.json file.
 * Environment variables can override config file values.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ServerConfig {
  port: number;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  connectionString?: string;
}

export interface BlobStorageConfig {
  storage: string;
  local?: {
    directory?: string;
  };
  s3?: {
    bucket?: string;
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  };
}

export interface AppConfig {
  server: ServerConfig;
  database: DatabaseConfig;
  blobStorage: BlobStorageConfig;
  supportedFileTypes: string;
}

/**
 * Load configuration from config.json file.
 * Environment variables override config file values.
 */
export function loadConfig(): AppConfig {
  const configPath = path.join(process.cwd(), 'config', 'config.json');
  
  let fileConfig: Partial<AppConfig> = {};
  
  // Try to load config file
  try {
    if (fs.existsSync(configPath)) {
      const fileContent = fs.readFileSync(configPath, 'utf-8');
      fileConfig = JSON.parse(fileContent);
      console.log(`✓ Loaded configuration from ${configPath}`);
    } else {
      console.warn(`⚠ Config file not found at ${configPath}, using defaults and environment variables`);
    }
  } catch (error) {
    console.error(`⚠ Failed to load config file: ${error}`);
    console.warn('⚠ Using defaults and environment variables');
  }

  // Merge config file with environment variables (env vars take precedence)
  const config: AppConfig = {
    server: {
      port: parseInt(
        process.env.PORT || 
        String(fileConfig.server?.port) || 
        '3000'
      ),
    },
    database: {
      host: process.env.PG_HOST || fileConfig.database?.host || 'localhost',
      port: parseInt(
        process.env.PG_PORT || 
        String(fileConfig.database?.port) || 
        '5432'
      ),
      database: process.env.PG_DATABASE || fileConfig.database?.database || 'image_hospital',
      user: process.env.PG_USER || fileConfig.database?.user || process.env.USER || 'postgres',
      password: process.env.PG_PASSWORD || fileConfig.database?.password || '',
      connectionString: process.env.DATABASE_URL || fileConfig.database?.connectionString || '',
    },
    blobStorage: {
      storage: process.env.BLOB_STORAGE || fileConfig.blobStorage?.storage || 'local',
      local: {
        directory: process.env.BLOB_STORAGE_DIR || fileConfig.blobStorage?.local?.directory || './blobs',
      },
      s3: {
        bucket: process.env.S3_BUCKET || fileConfig.blobStorage?.s3?.bucket || '',
        region: process.env.S3_REGION || fileConfig.blobStorage?.s3?.region || 'us-east-1',
        accessKeyId: process.env.S3_ACCESS_KEY_ID || fileConfig.blobStorage?.s3?.accessKeyId || '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || fileConfig.blobStorage?.s3?.secretAccessKey || '',
      },
    },
    supportedFileTypes: process.env.SUPPORTED_FILE_TYPES || fileConfig.supportedFileTypes || 'jpeg,jpg,png,webp',
  };

  return config;
}

