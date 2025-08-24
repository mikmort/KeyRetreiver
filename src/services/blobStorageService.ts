import { BlobServiceClient, ContainerClient, BlobClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import { BlobStorageConfig, BlobUploadRequest, BlobDownloadResponse, BlobOperationResult, BlobListItem } from '../types';

export class BlobStorageService {
    private containerClient: ContainerClient;

    constructor(private config: BlobStorageConfig) {
        let blobServiceClient: BlobServiceClient;

        if (config.connectionString) {
            // Use connection string
            blobServiceClient = BlobServiceClient.fromConnectionString(config.connectionString);
        } else if (config.accountName && config.accountKey) {
            // Use account name and key
            const accountUrl = `https://${config.accountName}.blob.core.windows.net`;
            const sharedKeyCredential = new StorageSharedKeyCredential(config.accountName, config.accountKey);
            blobServiceClient = new BlobServiceClient(accountUrl, sharedKeyCredential);
        } else if (config.accountName) {
            // Use managed identity
            const accountUrl = `https://${config.accountName}.blob.core.windows.net`;
            const credential = new DefaultAzureCredential();
            blobServiceClient = new BlobServiceClient(accountUrl, credential);
        } else {
            throw new Error('Invalid blob storage configuration. Provide connection string, account name/key, or account name for managed identity.');
        }

        this.containerClient = blobServiceClient.getContainerClient(config.containerName);
    }

    /**
     * Create or update a blob
     */
    async uploadBlob(request: BlobUploadRequest): Promise<BlobOperationResult> {
        try {
            const blobClient = this.containerClient.getBlockBlobClient(request.blobName);
            
            const options = {
                blobHTTPHeaders: {
                    blobContentType: request.contentType || 'text/plain'
                },
                metadata: request.metadata
            };

            const uploadResponse = await blobClient.upload(request.content, request.content.length, options);
            
            return {
                blobName: request.blobName,
                success: true,
                etag: uploadResponse.etag,
                lastModified: uploadResponse.lastModified,
                url: blobClient.url
            };
        } catch (error) {
            throw new Error(`Failed to upload blob ${request.blobName}: ${error.message}`);
        }
    }

    /**
     * Download a blob
     */
    async downloadBlob(blobName: string): Promise<BlobDownloadResponse> {
        try {
            const blobClient = this.containerClient.getBlobClient(blobName);
            const downloadResponse = await blobClient.download();

            if (!downloadResponse.readableStreamBody) {
                throw new Error('No content received from blob');
            }

            // Convert stream to string
            const content = await this.streamToString(downloadResponse.readableStreamBody);

            return {
                blobName: blobName,
                content: content,
                contentType: downloadResponse.contentType || 'application/octet-stream',
                contentLength: downloadResponse.contentLength || 0,
                lastModified: downloadResponse.lastModified || new Date(),
                etag: downloadResponse.etag || '',
                metadata: downloadResponse.metadata
            };
        } catch (error) {
            if (error.statusCode === 404) {
                throw new Error(`Blob ${blobName} not found`);
            }
            throw new Error(`Failed to download blob ${blobName}: ${error.message}`);
        }
    }

    /**
     * Delete a blob
     */
    async deleteBlob(blobName: string): Promise<BlobOperationResult> {
        try {
            const blobClient = this.containerClient.getBlobClient(blobName);
            await blobClient.deleteIfExists();

            return {
                blobName: blobName,
                success: true
            };
        } catch (error) {
            throw new Error(`Failed to delete blob ${blobName}: ${error.message}`);
        }
    }

    /**
     * List blobs in the container
     */
    async listBlobs(prefix?: string): Promise<BlobListItem[]> {
        try {
            const blobs: BlobListItem[] = [];
            const listOptions = prefix ? { prefix } : {};

            for await (const blob of this.containerClient.listBlobsFlat(listOptions)) {
                blobs.push({
                    name: blob.name,
                    contentLength: blob.properties.contentLength || 0,
                    lastModified: blob.properties.lastModified || new Date(),
                    etag: blob.properties.etag || '',
                    contentType: blob.properties.contentType || 'application/octet-stream'
                });
            }

            return blobs;
        } catch (error) {
            throw new Error(`Failed to list blobs: ${error.message}`);
        }
    }

    /**
     * Check if a blob exists
     */
    async blobExists(blobName: string): Promise<boolean> {
        try {
            const blobClient = this.containerClient.getBlobClient(blobName);
            return await blobClient.exists();
        } catch (error) {
            return false;
        }
    }

    /**
     * Convert readable stream to string
     */
    private async streamToString(readableStream: NodeJS.ReadableStream): Promise<string> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            readableStream.on('data', (data) => {
                chunks.push(data instanceof Buffer ? data : Buffer.from(data));
            });
            readableStream.on('end', () => {
                resolve(Buffer.concat(chunks).toString());
            });
            readableStream.on('error', reject);
        });
    }
}