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

// Accounting Types
export interface Account {
    id: string;
    name: string;
    initialBalance: number;
    isActive: boolean;
    createdDate: string;
    currentBalance?: number; // Calculated field
}

export interface Transaction {
    id: string;
    accountId: string;
    amount: number;
    date: string;
    description: string;
    type: 'credit' | 'debit';
}

export interface AccountWithBalance extends Account {
    currentBalance: number;
}

export interface AccountsResponse {
    success: boolean;
    data?: AccountWithBalance[];
    error?: string;
}

export interface TransactionsResponse {
    success: boolean;
    data?: Transaction[];
    error?: string;
}
