# Azure Blob Storage Proxy Function

## Deployment Information

**StorageProxy Function App**: 
- **URL**: https://storageproxy-c6g8bvbcdqc7duam.canadacentral-01.azurewebsites.net
- **Purpose**: Blob storage operations (upload, download, delete, list)
- **API Base**: https://storageproxy-c6g8bvbcdqc7duam.canadacentral-01.azurewebsites.net/api/blob

**Note**: This is different from the MortonGroupAICred function app which handles OpenAI credentials.

## Overview

The Azure Blob Storage proxy function (`/api/blob/{*path}`) provides secure access to Azure Blob Storage operations for React applications. It supports creating, updating, downloading, deleting, and listing blobs without exposing storage credentials to the client.

## Function Details

- **Route**: `GET|POST|PUT|DELETE /api/blob/{*path}`
- **Authentication**: Anonymous (but with CORS restrictions)
- **Location**: `src/functions/blobProxy.ts`
- **Service**: `src/services/blobStorageService.ts`

## Supported Operations

### 1. Upload/Create Blob
- **Method**: `POST` or `PUT`
- **URL**: `/api/blob/upload/{blobName}` or `/api/blob/{blobName}`
- **Body**: Raw content to upload
- **Headers**: 
  - `Content-Type`: MIME type of the content (e.g., `text/plain`, `application/json`)
  - `x-metadata-{key}`: Custom metadata (e.g., `x-metadata-author: john`)

**Example**:
```bash
curl -X POST "https://storageproxy-c6g8bvbcdqc7duam.canadacentral-01.azurewebsites.net/api/blob/upload/documents/file.txt" \
  -H "Content-Type: text/plain" \
  -H "x-metadata-author: john" \
  -d "Hello, this is the file content!"
```

### 2. Download Blob
- **Method**: `GET`
- **URL**: `/api/blob/download/{blobName}` or `/api/blob/{blobName}`

**Example**:
```bash
curl "https://storageproxy-c6g8bvbcdqc7duam.canadacentral-01.azurewebsites.net/api/blob/download/documents/file.txt"
```

### 3. Delete Blob
- **Method**: `DELETE`
- **URL**: `/api/blob/delete/{blobName}` or `/api/blob/{blobName}`

**Example**:
```bash
curl -X DELETE "https://storageproxy-c6g8bvbcdqc7duam.canadacentral-01.azurewebsites.net/api/blob/delete/documents/file.txt"
```

### 4. List Blobs
- **Method**: `GET`
- **URL**: `/api/blob/list?prefix={prefix}` (prefix is optional)

**Example**:
```bash
# List all blobs
curl "https://storageproxy-c6g8bvbcdqc7duam.canadacentral-01.azurewebsites.net/api/blob/list"

# List blobs with prefix
curl "https://storageproxy-c6g8bvbcdqc7duam.canadacentral-01.azurewebsites.net/api/blob/list?prefix=documents/"
```

## Environment Variables

### Required Settings

#### Option 1: Connection String (Recommended for Development)
```
AZURE_STORAGE_CONNECTION_STRING = DefaultEndpointsProtocol=https;AccountName=yourstorageaccount;AccountKey=yourkey;EndpointSuffix=core.windows.net
```

#### Option 2: Account Name and Key
```
AZURE_STORAGE_ACCOUNT_NAME = yourstorageaccount
AZURE_STORAGE_ACCOUNT_KEY = your-account-key
```

#### Option 3: Managed Identity (Recommended for Production)
```
AZURE_STORAGE_ACCOUNT_NAME = yourstorageaccount
# No key needed - uses Function App's managed identity
```

### Additional Settings
```
AZURE_BLOB_CONTAINER_NAME = documents  # Default container name
ALLOWED_ORIGINS = http://localhost:3000,https://your-react-app.com  # CORS origins
```

### Key Vault Integration (Production)
If using Key Vault, the proxy will attempt to retrieve:
- Secret name: `azure-storage-connection-string`

Configure Key Vault:
```
KEY_VAULT_URL = https://your-keyvault.vault.azure.net/
```

## React/TypeScript Client Usage

### Installation
No additional packages required if you're already using `fetch`.

### Basic Usage
```typescript
import { useBlobStorage } from './path-to-blob-client';

function MyComponent() {
    const { uploadBlob, downloadBlob, deleteBlob, listBlobs, loading, error } = useBlobStorage();

    const handleUpload = async () => {
        const result = await uploadBlob(
            'documents/my-file.txt',
            'Hello World!',
            'text/plain',
            { author: 'john', category: 'docs' }
        );
        
        if (result) {
            console.log('Upload successful:', result);
        }
    };

    const handleDownload = async () => {
        const result = await downloadBlob('documents/my-file.txt');
        if (result) {
            console.log('Content:', result.content);
        }
    };

    // ... rest of component
}
```

### Environment Configuration
Set your Azure Function URL:
```bash
# .env file in your React app
REACT_APP_AZURE_FUNCTION_URL=https://storageproxy-c6g8bvbcdqc7duam.canadacentral-01.azurewebsites.net
```

## Response Format

### Success Response
```typescript
{
  "success": true,
  "data": {
    // Operation-specific data
  }
}
```

### Upload/Update Response
```typescript
{
  "success": true,
  "data": {
    "blobName": "documents/file.txt",
    "success": true,
    "etag": "\"0x8D9...\""",
    "lastModified": "2023-08-24T16:10:00.000Z",
    "url": "https://account.blob.core.windows.net/container/documents/file.txt"
  }
}
```

### Download Response
```typescript
{
  "success": true,
  "data": {
    "blobName": "documents/file.txt",
    "content": "Hello World!",
    "contentType": "text/plain",
    "contentLength": 12,
    "lastModified": "2023-08-24T16:10:00.000Z",
    "etag": "\"0x8D9...\"",
    "metadata": {
      "author": "john",
      "category": "docs"
    }
  }
}
```

### List Response
```typescript
{
  "success": true,
  "data": [
    {
      "name": "documents/file1.txt",
      "contentLength": 12,
      "lastModified": "2023-08-24T16:10:00.000Z",
      "etag": "\"0x8D9...\"",
      "contentType": "text/plain"
    },
    // ... more blobs
  ]
}
```

### Error Response
```typescript
{
  "success": false,
  "error": "Blob not found"
}
```

## Security Features

1. **Credential Protection**: Storage credentials never leave the Azure Function
2. **CORS Validation**: Only allowed origins can make requests
3. **Container Isolation**: All operations are scoped to a single container
4. **Error Sanitization**: Sensitive information is not exposed in error messages
5. **Structured Logging**: Operations are logged without exposing sensitive data

## Monitoring and Diagnostics

### Diagnostics Endpoint
Access `/api/diagnostics` to see blob storage configuration status:
- `AZURE_STORAGE_CONNECTION_STRING`: SET/NOT SET
- `AZURE_STORAGE_ACCOUNT_NAME`: SET/NOT SET  
- `AZURE_STORAGE_ACCOUNT_KEY`: SET/NOT SET
- `AZURE_BLOB_CONTAINER_NAME`: Current container name

### Log Fields
The proxy logs structured information for monitoring:
- Request ID for tracing
- Operation type (upload, download, delete, list)
- Blob name
- Performance metrics (elapsed time, content length)
- Error details (without sensitive data)

## Deployment

### Azure Function App Configuration

1. **Add Application Settings** in Azure Portal:
```
AZURE_STORAGE_CONNECTION_STRING = your-connection-string
AZURE_BLOB_CONTAINER_NAME = documents
ALLOWED_ORIGINS = https://your-react-app.com
```

2. **Enable Managed Identity** (for production with managed identity):
   - Enable System-assigned managed identity in Function App
   - Grant "Storage Blob Data Contributor" role to the Function App on the Storage Account

3. **Configure Key Vault** (optional, for production):
   - Store connection string as secret named `azure-storage-connection-string`
   - Grant Function App "Key Vault Secrets User" role

### Container Setup
Ensure your blob storage container exists:
```bash
# Using Azure CLI
az storage container create --name documents --account-name yourstorageaccount
```

## Error Handling

### Common Error Scenarios

| Error | Status | Description |
|-------|--------|-------------|
| `Origin not allowed` | 403 | CORS validation failed |
| `Blob name is required` | 400 | Missing blob name in request |
| `Blob not found` | 404 | Requested blob doesn't exist |
| `Blob storage configuration error` | 500 | Invalid or missing storage credentials |
| `Internal server error` | 500 | Generic server error |

### Retry Logic
The client should implement retry logic for:
- Network timeouts
- Temporary service unavailability (5xx errors)
- Rate limiting (if implemented)

## Performance Considerations

- **File Size**: Suitable for documents and text files (< 100MB recommended)
- **Concurrency**: Multiple operations can run in parallel
- **Caching**: Consider implementing client-side caching for frequently accessed content
- **Streaming**: For large files, consider implementing streaming uploads/downloads

## Testing

### Local Testing
1. Set environment variables in `local.settings.json`
2. Run the Azure Function locally
3. Use the React client or curl to test operations

### Production Testing
- Verify CORS configuration with your React app
- Test all CRUD operations
- Monitor function logs for errors
- Validate container permissions

## Limitations

- Operations are limited to a single configured container
- No built-in authentication beyond CORS
- File size limits depend on Azure Function timeout (5-10 minutes)
- No built-in versioning or backup functionality