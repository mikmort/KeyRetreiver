import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';
import { BlobStorageService } from '../services/blobStorageService';
import { BlobStorageConfig, ApiResponse, BlobUploadRequest, BlobDownloadResponse, BlobOperationResult, BlobListItem } from '../types';
import { Logger } from '../services/logger';
import { v4 as uuidv4 } from 'uuid';

// CORS headers for React app
const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Will be configured based on environment
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
};

// Get Blob Storage configuration from Azure Key Vault or environment
async function getBlobStorageConfig(context: InvocationContext): Promise<BlobStorageConfig> {
    const logger = new Logger(context);
    
    try {
        // Try Key Vault first (production)
        const keyVaultUrl = process.env.KEY_VAULT_URL;
        if (keyVaultUrl) {
            logger.info('Attempting to retrieve blob storage config from Key Vault');
            const credential = new DefaultAzureCredential();
            const client = new SecretClient(keyVaultUrl, credential);
            
            try {
                const connectionStringSecret = await client.getSecret('azure-storage-connection-string');
                const containerName = process.env.AZURE_BLOB_CONTAINER_NAME || 'documents';
                
                if (connectionStringSecret.value) {
                    return {
                        connectionString: connectionStringSecret.value,
                        containerName: containerName
                    };
                }
            } catch (keyVaultError) {
                logger.warn('Failed to retrieve from Key Vault, falling back to environment variables', {
                    error: keyVaultError.message
                });
            }
        }

        // Fallback to environment variables (development or Key Vault failure)
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
        const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
        const containerName = process.env.AZURE_BLOB_CONTAINER_NAME || 'documents';

        if (connectionString) {
            return {
                connectionString: connectionString,
                containerName: containerName
            };
        } else if (accountName && accountKey) {
            return {
                accountName: accountName,
                accountKey: accountKey,
                containerName: containerName
            };
        } else if (accountName) {
            // Use managed identity
            return {
                accountName: accountName,
                containerName: containerName
            };
        }

        throw new Error('No blob storage configuration found in Key Vault or environment variables');
    } catch (error) {
        logger.error('Failed to get blob storage configuration', { error: error.message });
        throw error;
    }
}

export async function blobProxy(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const requestId = uuidv4();
    const logger = new Logger(context);
    const startTime = Date.now();

    logger.info('Blob proxy request received', { requestId, method: request.method, url: request.url });

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return {
            status: 200,
            headers: corsHeaders
        };
    }

    try {
        // Get blob storage configuration
        const config = await getBlobStorageConfig(context);
        const blobService = new BlobStorageService(config);

        // Parse URL to get blob name and operation
        const url = new URL(request.url);
        const pathParts = url.pathname.split('/').filter(part => part && part !== 'api' && part !== 'blob');
        
        let operation = 'list';  // default operation
        let blobName = '';

        if (pathParts.length >= 1) {
            if (pathParts[0] === 'upload' || pathParts[0] === 'download' || pathParts[0] === 'delete' || pathParts[0] === 'list') {
                operation = pathParts[0];
                if (pathParts.length >= 2) {
                    blobName = pathParts.slice(1).join('/'); // Handle nested paths
                }
            } else {
                // Direct blob name access
                blobName = pathParts.join('/');
                operation = request.method === 'GET' ? 'download' : 
                           request.method === 'POST' || request.method === 'PUT' ? 'upload' : 
                           request.method === 'DELETE' ? 'delete' : 'list';
            }
        }

        logger.info('Blob operation determined', { requestId, operation, blobName });

        let result: any;
        const elapsedMs = Date.now() - startTime;

        switch (operation) {
            case 'upload':
                if (!blobName) {
                    return {
                        status: 400,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: false,
                            error: 'Blob name is required for upload operation'
                        } as ApiResponse)
                    };
                }

                const uploadData = await request.text();
                const contentType = request.headers.get('content-type') || 'text/plain';
                
                // Parse metadata from headers (x-metadata-*)
                const metadata: { [key: string]: string } = {};
                for (const [key, value] of request.headers) {
                    if (key.startsWith('x-metadata-')) {
                        const metadataKey = key.substring('x-metadata-'.length);
                        metadata[metadataKey] = value;
                    }
                }

                const uploadRequest: BlobUploadRequest = {
                    blobName: blobName,
                    content: uploadData,
                    contentType: contentType,
                    metadata: Object.keys(metadata).length > 0 ? metadata : undefined
                };

                result = await blobService.uploadBlob(uploadRequest);
                logger.info('Blob uploaded successfully', { 
                    requestId, 
                    blobName, 
                    elapsedMs,
                    contentLength: uploadData.length
                });
                break;

            case 'download':
                if (!blobName) {
                    return {
                        status: 400,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: false,
                            error: 'Blob name is required for download operation'
                        } as ApiResponse)
                    };
                }

                result = await blobService.downloadBlob(blobName);
                logger.info('Blob downloaded successfully', { 
                    requestId, 
                    blobName, 
                    elapsedMs,
                    contentLength: result.contentLength
                });
                break;

            case 'delete':
                if (!blobName) {
                    return {
                        status: 400,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: false,
                            error: 'Blob name is required for delete operation'
                        } as ApiResponse)
                    };
                }

                result = await blobService.deleteBlob(blobName);
                logger.info('Blob deleted successfully', { requestId, blobName, elapsedMs });
                break;

            case 'list':
                const prefix = url.searchParams.get('prefix') || undefined;
                result = await blobService.listBlobs(prefix);
                logger.info('Blobs listed successfully', { 
                    requestId, 
                    elapsedMs,
                    count: result.length,
                    prefix: prefix || 'none'
                });
                break;

            default:
                return {
                    status: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        success: false,
                        error: `Unsupported operation: ${operation}`
                    } as ApiResponse)
                };
        }

        // Return success response
        return {
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                data: result
            } as ApiResponse)
        };

    } catch (error) {
        const elapsedMs = Date.now() - startTime;
        logger.error('Blob proxy error', { 
            requestId, 
            elapsedMs,
            error: error.message,
            stack: error.stack
        });

        // Handle specific error types
        if (error.message.includes('not found')) {
            return {
                status: 404,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: false,
                    error: 'Blob not found'
                } as ApiResponse)
            };
        }

        if (error.message.includes('configuration')) {
            return {
                status: 500,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: false,
                    error: 'Blob storage configuration error'
                } as ApiResponse)
            };
        }

        return {
            status: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                success: false,
                error: 'Internal server error'
            } as ApiResponse)
        };
    }
}

app.http('blobProxy', {
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'blob/{*path}',
    handler: blobProxy
});