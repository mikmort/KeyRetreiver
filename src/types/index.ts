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
}

export interface ErrorResponse {
    success: false;
    error: string;
}

export interface SuccessResponse<T> {
    success: true;
    data: T;
}
