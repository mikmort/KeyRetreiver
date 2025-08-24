export interface OpenAIConfig {
    endpoint: string;
    apiKey: string;
    deployment?: string;
    apiVersion?: string;
}

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    errorType?: string;
    detail?: string;
}

export interface ErrorResponse {
    success: false;
    error: string;
}

export interface SuccessResponse<T> {
    success: true;
    data: T;
}

// OpenAI API Types
export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface ChatCompletionRequest {
    messages: ChatMessage[];
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    stop?: string | string[];
    stream?: boolean;
}

export interface ChatCompletionChoice {
    index: number;
    message: ChatMessage;
    finish_reason: string;
}

export interface ChatCompletionUsage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}

export interface ChatCompletionResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: ChatCompletionChoice[];
    usage: ChatCompletionUsage;
}

// Azure Blob Storage Types
export interface BlobStorageConfig {
    connectionString?: string;
    accountName?: string;
    accountKey?: string;
    containerName: string;
}

export interface BlobUploadRequest {
    blobName: string;
    content: string;
    contentType?: string;
    metadata?: { [key: string]: string };
}

export interface BlobDownloadResponse {
    blobName: string;
    content: string;
    contentType: string;
    contentLength: number;
    lastModified: Date;
    etag: string;
    metadata?: { [key: string]: string };
}

export interface BlobListItem {
    name: string;
    contentLength: number;
    lastModified: Date;
    etag: string;
    contentType: string;
}

export interface BlobOperationResult {
    blobName: string;
    success: boolean;
    etag?: string;
    lastModified?: Date;
    url?: string;
}
