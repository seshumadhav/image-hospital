# Configuration

The application can be configured via `config/config.json` file.

## Configuration File

**Location**: `config/config.json`

This file is **not** committed to git (it's in `.gitignore`) so you can safely store sensitive information like database passwords.

## Setup

1. Copy the example config file:
   ```bash
   cp config/config.example.json config/config.json
   ```

2. Edit `config/config.json` with your settings

3. Restart the server to apply changes

## Configuration Structure

```json
{
  "server": {
    "port": 3000
  },
  "database": {
    "host": "localhost",
    "port": 5432,
    "database": "image_hospital",
    "user": "postgres",
    "password": "your_password_here",
    "connectionString": ""
  },
  "blobStorage": {
    "storage": "local",
    "local": {
      "directory": "./blobs"
    },
    "s3": {
      "bucket": "",
      "region": "us-east-1",
      "accessKeyId": "",
      "secretAccessKey": ""
    }
  }
}
```

## Configuration Options

### Server

- `port`: Server port (default: 3000)

### Database

- `host`: PostgreSQL host (default: localhost)
- `port`: PostgreSQL port (default: 5432)
- `database`: Database name (default: image_hospital)
- `user`: Database user (default: postgres)
- `password`: Database password
- `connectionString`: Full PostgreSQL connection string (optional, overrides other settings)

### Blob Storage

- `storage`: Storage backend(s) - `"local"`, `"s3"`, or `"local,s3"` for dual storage
- `local.directory`: Directory for local filesystem storage (default: ./blobs)
- `s3.bucket`: S3 bucket name (for S3 storage)
- `s3.region`: AWS region (default: us-east-1)
- `s3.accessKeyId`: AWS access key ID
- `s3.secretAccessKey`: AWS secret access key

### Supported File Types

- `supportedFileTypes`: Comma-separated list of supported image file types (default: "jpeg,jpg,png,webp")
  - Examples: `"jpeg,jpg,png"`, `"png,webp"`, `"jpeg,png"`
  - Supported extensions: `jpeg`, `jpg`, `png`, `gif`, `webp`

## Environment Variables Override

Environment variables can override config file values (useful for deployment):

- `PORT` - Server port
- `PG_HOST` - Database host
- `PG_PORT` - Database port
- `PG_DATABASE` - Database name
- `PG_USER` - Database user
- `PG_PASSWORD` - Database password
- `DATABASE_URL` - Full database connection string
- `BLOB_STORAGE` - Storage backend(s): `local`, `s3`, or `local,s3`
- `BLOB_STORAGE_DIR` - Local storage directory
- `S3_BUCKET` - S3 bucket name
- `S3_REGION` - AWS region
- `S3_ACCESS_KEY_ID` - AWS access key
- `S3_SECRET_ACCESS_KEY` - AWS secret key
- `SUPPORTED_FILE_TYPES` - Supported file types (e.g., "jpeg,jpg,png,webp")

## Examples

### Local Filesystem Storage

```json
{
  "blobStorage": {
    "storage": "local",
    "local": {
      "directory": "/var/www/image-hospital/blobs"
    }
  }
}
```

### S3 Storage (when implemented)

```json
{
  "blobStorage": {
    "storage": "s3",
    "s3": {
      "bucket": "my-image-bucket",
      "region": "us-east-1",
      "accessKeyId": "AKIA...",
      "secretAccessKey": "secret..."
    }
  }
}
```

### Dual Storage (local + S3)

```json
{
  "blobStorage": {
    "storage": "local,s3",
    "local": {
      "directory": "./blobs"
    },
    "s3": {
      "bucket": "my-image-bucket",
      "region": "us-east-1",
      "accessKeyId": "AKIA...",
      "secretAccessKey": "secret..."
    }
  }
}
```

## Deployment

On EC2 or production server:

1. Create `config/config.json` with production settings
2. Set sensitive values (passwords, keys) in the config file
3. Restart the server: `pm2 restart image-hospital-api`

Changes take effect immediately on server restart.

