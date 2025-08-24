/**
 * React client for Azure Blob Storage proxy
 * Example usage of the blob storage Azure Function
 */
import React, { useState, useEffect } from 'react';

// Types matching the Azure Function API
interface BlobUploadRequest {
    blobName: string;
    content: string;
    contentType?: string;
    metadata?: { [key: string]: string };
}

interface BlobDownloadResponse {
    blobName: string;
    content: string;
    contentType: string;
    contentLength: number;
    lastModified: Date;
    etag: string;
    metadata?: { [key: string]: string };
}

interface BlobOperationResult {
    blobName: string;
    success: boolean;
    etag?: string;
    lastModified?: Date;
    url?: string;
}

interface BlobListItem {
    name: string;
    contentLength: number;
    lastModified: Date;
    etag: string;
    contentType: string;
}

interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

// Custom hook to interact with Azure Blob Storage via the proxy
export function useBlobStorage() {
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Get the Azure Function URL from environment or use local development
    const getFunctionUrl = () => {
        return process.env.REACT_APP_AZURE_FUNCTION_URL 
            ? `${process.env.REACT_APP_AZURE_FUNCTION_URL}/api/blob`
            : 'http://localhost:7071/api/blob';
    };

    // Upload a blob
    const uploadBlob = async (blobName: string, content: string, contentType?: string, metadata?: { [key: string]: string }): Promise<BlobOperationResult | null> => {
        try {
            setLoading(true);
            setError(null);

            const functionUrl = `${getFunctionUrl()}/upload/${blobName}`;
            
            const headers: HeadersInit = {
                'Content-Type': contentType || 'text/plain',
            };

            // Add metadata as custom headers
            if (metadata) {
                Object.keys(metadata).forEach(key => {
                    headers[`x-metadata-${key}`] = metadata[key];
                });
            }

            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: headers,
                body: content,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result: ApiResponse<BlobOperationResult> = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Upload failed');
            }

            return result.data || null;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            setError(errorMessage);
            return null;
        } finally {
            setLoading(false);
        }
    };

    // Download a blob
    const downloadBlob = async (blobName: string): Promise<BlobDownloadResponse | null> => {
        try {
            setLoading(true);
            setError(null);

            const functionUrl = `${getFunctionUrl()}/download/${blobName}`;
            
            const response = await fetch(functionUrl, {
                method: 'GET',
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`Blob '${blobName}' not found`);
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result: ApiResponse<BlobDownloadResponse> = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Download failed');
            }

            return result.data || null;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            setError(errorMessage);
            return null;
        } finally {
            setLoading(false);
        }
    };

    // Delete a blob
    const deleteBlob = async (blobName: string): Promise<boolean> => {
        try {
            setLoading(true);
            setError(null);

            const functionUrl = `${getFunctionUrl()}/delete/${blobName}`;
            
            const response = await fetch(functionUrl, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result: ApiResponse<BlobOperationResult> = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Delete failed');
            }

            return result.data?.success || false;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            setError(errorMessage);
            return false;
        } finally {
            setLoading(false);
        }
    };

    // List blobs
    const listBlobs = async (prefix?: string): Promise<BlobListItem[]> => {
        try {
            setLoading(true);
            setError(null);

            const functionUrl = `${getFunctionUrl()}/list${prefix ? `?prefix=${encodeURIComponent(prefix)}` : ''}`;
            
            const response = await fetch(functionUrl, {
                method: 'GET',
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result: ApiResponse<BlobListItem[]> = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'List failed');
            }

            return result.data || [];
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            setError(errorMessage);
            return [];
        } finally {
            setLoading(false);
        }
    };

    return {
        uploadBlob,
        downloadBlob,
        deleteBlob,
        listBlobs,
        loading,
        error,
    };
}

// Example React component using the blob storage functionality
export function BlobStorageComponent() {
    const [blobs, setBlobs] = useState<BlobListItem[]>([]);
    const [selectedBlob, setSelectedBlob] = useState<BlobDownloadResponse | null>(null);
    const [uploadContent, setUploadContent] = useState('');
    const [uploadName, setUploadName] = useState('');
    const [filterPrefix, setFilterPrefix] = useState('');
    
    const { uploadBlob, downloadBlob, deleteBlob, listBlobs, loading, error } = useBlobStorage();

    // Load blobs on component mount
    useEffect(() => {
        handleListBlobs();
    }, []);

    const handleUpload = async () => {
        if (!uploadName.trim() || !uploadContent.trim()) {
            alert('Please provide both blob name and content');
            return;
        }

        const result = await uploadBlob(
            uploadName, 
            uploadContent, 
            'text/plain',
            { 'created-by': 'react-client', 'timestamp': new Date().toISOString() }
        );

        if (result) {
            setUploadName('');
            setUploadContent('');
            handleListBlobs(); // Refresh list
        }
    };

    const handleDownload = async (blobName: string) => {
        const result = await downloadBlob(blobName);
        if (result) {
            setSelectedBlob(result);
        }
    };

    const handleDelete = async (blobName: string) => {
        if (window.confirm(`Are you sure you want to delete '${blobName}'?`)) {
            const success = await deleteBlob(blobName);
            if (success) {
                handleListBlobs(); // Refresh list
                if (selectedBlob?.blobName === blobName) {
                    setSelectedBlob(null);
                }
            }
        }
    };

    const handleListBlobs = async () => {
        const result = await listBlobs(filterPrefix || undefined);
        setBlobs(result);
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h1>Azure Blob Storage Client</h1>
            
            {error && (
                <div style={{ color: 'red', marginBottom: '20px', padding: '10px', backgroundColor: '#ffebee' }}>
                    Error: {error}
                </div>
            )}

            {/* Upload Section */}
            <div style={{ marginBottom: '30px', padding: '15px', border: '1px solid #ccc' }}>
                <h3>Upload Blob</h3>
                <div style={{ marginBottom: '10px' }}>
                    <input
                        type="text"
                        placeholder="Blob name (e.g., documents/file.txt)"
                        value={uploadName}
                        onChange={(e) => setUploadName(e.target.value)}
                        style={{ width: '300px', padding: '5px' }}
                    />
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <textarea
                        placeholder="Content"
                        value={uploadContent}
                        onChange={(e) => setUploadContent(e.target.value)}
                        style={{ width: '500px', height: '100px', padding: '5px' }}
                    />
                </div>
                <button onClick={handleUpload} disabled={loading}>
                    Upload
                </button>
            </div>

            {/* List Section */}
            <div style={{ marginBottom: '30px', padding: '15px', border: '1px solid #ccc' }}>
                <h3>List Blobs</h3>
                <div style={{ marginBottom: '10px' }}>
                    <input
                        type="text"
                        placeholder="Filter by prefix (optional)"
                        value={filterPrefix}
                        onChange={(e) => setFilterPrefix(e.target.value)}
                        style={{ width: '200px', padding: '5px', marginRight: '10px' }}
                    />
                    <button onClick={handleListBlobs} disabled={loading}>
                        Refresh List
                    </button>
                </div>
                
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f5f5f5' }}>
                            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Name</th>
                            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Size</th>
                            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Last Modified</th>
                            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {blobs.map((blob) => (
                            <tr key={blob.name}>
                                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{blob.name}</td>
                                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{blob.contentLength} bytes</td>
                                <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                                    {new Date(blob.lastModified).toLocaleString()}
                                </td>
                                <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                                    <button 
                                        onClick={() => handleDownload(blob.name)}
                                        style={{ marginRight: '5px' }}
                                        disabled={loading}
                                    >
                                        Download
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(blob.name)}
                                        style={{ backgroundColor: '#ff4444', color: 'white' }}
                                        disabled={loading}
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {blobs.length === 0 && (
                    <p>No blobs found{filterPrefix ? ` with prefix "${filterPrefix}"` : ''}.</p>
                )}
            </div>

            {/* Download Preview Section */}
            {selectedBlob && (
                <div style={{ padding: '15px', border: '1px solid #ccc' }}>
                    <h3>Downloaded Blob: {selectedBlob.blobName}</h3>
                    <p><strong>Content Type:</strong> {selectedBlob.contentType}</p>
                    <p><strong>Size:</strong> {selectedBlob.contentLength} bytes</p>
                    <p><strong>Last Modified:</strong> {new Date(selectedBlob.lastModified).toLocaleString()}</p>
                    <p><strong>ETag:</strong> {selectedBlob.etag}</p>
                    
                    {selectedBlob.metadata && Object.keys(selectedBlob.metadata).length > 0 && (
                        <div>
                            <strong>Metadata:</strong>
                            <ul>
                                {Object.entries(selectedBlob.metadata).map(([key, value]) => (
                                    <li key={key}>{key}: {value}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    
                    <div style={{ marginTop: '10px' }}>
                        <strong>Content:</strong>
                        <pre style={{ backgroundColor: '#f5f5f5', padding: '10px', whiteSpace: 'pre-wrap' }}>
                            {selectedBlob.content}
                        </pre>
                    </div>
                    
                    <button 
                        onClick={() => setSelectedBlob(null)}
                        style={{ marginTop: '10px' }}
                    >
                        Close Preview
                    </button>
                </div>
            )}
        </div>
    );
}

export default BlobStorageComponent;