import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';
import { OpenAIConfig, ApiResponse } from '../types';
import { OpenAIService, AOAIError } from '../services/openAIService';
import { globalRateLimiter } from '../services/rateLimiter';
import { openaiSemaphore } from '../services/concurrency';
import { RequestValidator } from '../services/validate';
import { Logger, createContentHash } from '../services/logger';
import { v4 as uuidv4 } from 'uuid';

// CORS headers for React app
const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Will be configured based on environment
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
};

// Simple in-memory idempotency cache
const idempotencyCache = new Map<string, { response: any; timestamp: number }>();

// Check if origin is allowed
function isOriginAllowed(origin: string): boolean {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
        'https://gentle-moss-087d9321e.1.azurestaticapps.net',
        'http://localhost:3000',
        'https://localhost:3000'
    ];
    return allowedOrigins.includes(origin);
}

// Get OpenAI configuration from Azure Key Vault or environment
async function getOpenAIConfig(context: InvocationContext): Promise<OpenAIConfig> {
    try {
        // Try Key Vault first
        const keyVaultUrl = process.env.KEY_VAULT_URL;
        if (keyVaultUrl) {
            const credential = new DefaultAzureCredential();
            const client = new SecretClient(keyVaultUrl, credential);
            
            const apiKeySecretName = process.env.AZURE_OPENAI_API_KEY_SECRET_NAME || 'azure-openai-api-key';
            const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
            
            if (!endpoint) {
                throw new Error('AZURE_OPENAI_ENDPOINT environment variable is not set');
            }

            const secret = await client.getSecret(apiKeySecretName);
            
            if (!secret.value) {
                throw new Error('Failed to retrieve API key from Key Vault');
            }

            return {
                endpoint: endpoint,
                apiKey: secret.value
            };
        }
    } catch (error: any) {
        context.log('Key Vault retrieval failed, falling back to environment variables:', error.message);
    }

    // Fallback to environment variables
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    
    if (!endpoint || !apiKey) {
        throw new Error('Required environment variables AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY are not set');
    }
    
    return { endpoint, apiKey };
}

export async function openaiProxy(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const requestId = uuidv4();
    const logger = new Logger(context);
    const startTime = Date.now();

    logger.info('OpenAI proxy request received', { requestId });

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return {
            status: 200,
            headers: corsHeaders
        };
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
        return {
            status: 405,
            headers: corsHeaders,
            body: JSON.stringify({
                success: false,
                error: 'Method not allowed'
            } as ApiResponse)
        };
    }

    try {
        // Check origin for CORS
        const origin = request.headers.get('origin') || '';
        if (origin && !isOriginAllowed(origin)) {
            logger.warn('Origin not allowed', { requestId, origin });
            return {
                status: 403,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: false,
                    error: 'Origin not allowed'
                } as ApiResponse)
            };
        }

        // Set the allowed origin in response headers
        const responseHeaders = {
            ...corsHeaders,
            'Access-Control-Allow-Origin': origin || corsHeaders['Access-Control-Allow-Origin']
        };

        // Extract user ID for rate limiting
        const userId = RequestValidator.extractUserId(request.headers);

        // Rate limiting checks
        if (!globalRateLimiter.allow('global', 1)) {
            logger.warn('Global rate limit exceeded', { requestId, userId });
            return {
                status: 429,
                headers: { ...responseHeaders, 'Retry-After': '2' },
                body: JSON.stringify({
                    success: false,
                    error: 'Global rate limit exceeded. Try again later.'
                } as ApiResponse)
            };
        }

        if (!globalRateLimiter.allow(`user:${userId}`, 1)) {
            logger.warn('User rate limit exceeded', { requestId, userId });
            return {
                status: 429,
                headers: { ...responseHeaders, 'Retry-After': '2' },
                body: JSON.stringify({
                    success: false,
                    error: 'User rate limit exceeded. Try again later.'
                } as ApiResponse)
            };
        }

        // Parse and validate request body
        const requestBody = await request.json() as any;
        
        if (!requestBody) {
            logger.warn('Empty request body', { requestId, userId });
            return {
                status: 400,
                headers: responseHeaders,
                body: JSON.stringify({
                    success: false,
                    error: 'Request body is required'
                } as ApiResponse)
            };
        }

        // Check for idempotency key
        const idempotencyKey = request.headers.get('idempotency-key');
        if (idempotencyKey) {
            const cached = idempotencyCache.get(idempotencyKey);
            if (cached && (Date.now() - cached.timestamp) < 300000) { // 5 minutes
                logger.info('Returning cached response', { requestId, userId, idempotencyKey });
                return {
                    status: 200,
                    headers: responseHeaders,
                    body: JSON.stringify(cached.response)
                };
            }
        }

        // Extract deployment name from request (required for Azure OpenAI)
        const deployment = requestBody.deployment;
        if (!deployment) {
            logger.warn('Missing deployment name', { requestId, userId });
            return {
                status: 400,
                headers: responseHeaders,
                body: JSON.stringify({
                    success: false,
                    error: 'Deployment name is required'
                } as ApiResponse)
            };
        }

        // Validate request
        const { deployment: _, ...openaiRequestBody } = requestBody;
        const validation = RequestValidator.validate(openaiRequestBody);
        
        if (!validation.ok) {
            logger.warn('Request validation failed', { 
                requestId, 
                userId, 
                error: validation.error,
                contentHash: createContentHash(openaiRequestBody)
            });
            return {
                status: 400,
                headers: responseHeaders,
                body: JSON.stringify({
                    success: false,
                    error: validation.error
                } as ApiResponse)
            };
        }

        const chatRequest = validation.sanitizedRequest!;

        // Get OpenAI configuration
        const config = await getOpenAIConfig(context);
        
        // Acquire semaphore for concurrency control
        const semaphoreStart = Date.now();
        const release = await openaiSemaphore.acquire();
        const semaphoreWaitMs = Date.now() - semaphoreStart;
        
        if (semaphoreWaitMs > 100) {
            logger.info('Semaphore wait time', { requestId, semaphoreWaitMs });
        }

        try {
            // Create OpenAI service and make the request
            const openaiService = new OpenAIService(config, logger);
            const response = await openaiService.chatCompletion(chatRequest, deployment, requestId);

            const successResponse = {
                success: true,
                data: response
            } as ApiResponse;

            // Cache successful response if idempotency key provided
            if (idempotencyKey) {
                idempotencyCache.set(idempotencyKey, {
                    response: successResponse,
                    timestamp: Date.now()
                });
                
                // Clean up old cache entries
                if (idempotencyCache.size > 1000) {
                    const cutoff = Date.now() - 600000; // 10 minutes
                    for (const [key, cached] of idempotencyCache.entries()) {
                        if (cached.timestamp < cutoff) {
                            idempotencyCache.delete(key);
                        }
                    }
                }
            }

            logger.info('OpenAI proxy success', {
                requestId,
                userId,
                elapsedMs: Date.now() - startTime,
                semaphoreWaitMs,
                totalTokens: response.usage?.total_tokens,
                messageCount: chatRequest.messages.length
            });

            return {
                status: 200,
                headers: responseHeaders,
                body: JSON.stringify(successResponse)
            };

        } finally {
            release();
        }

    } catch (error: any) {
        logger.error('Error in OpenAI proxy', {
            requestId,
            elapsedMs: Date.now() - startTime,
            error: error.message,
            errorType: error.constructor.name
        });
        
        // Handle different types of errors
        const aoaiError = error as AOAIError;
        
        // Rate limiting or server errors from Azure OpenAI
        if (aoaiError.status === 429 || (aoaiError.status && aoaiError.status >= 500)) {
            return {
                status: 429,
                headers: { 
                    ...corsHeaders,
                    'Retry-After': '5' 
                },
                body: JSON.stringify({
                    success: false,
                    error: 'Upstream service is temporarily unavailable. Please try again later.'
                } as ApiResponse)
            };
        }
        
        // Client errors from Azure OpenAI (400, 401, 403, 404)
        if (aoaiError.status && aoaiError.status >= 400 && aoaiError.status < 500) {
            // Check if this is a content filtering error (400 with specific message pattern)
            if (aoaiError.status === 400 && aoaiError.message?.includes('content management policy')) {
                logger.warn('Content filtering detected', { requestId, error: aoaiError.message });
                return {
                    status: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        success: false,
                        error: 'Content filtered by Azure OpenAI policy',
                        errorType: 'content_filter',
                        detail: 'The request was filtered due to content policy. Consider skipping this transaction or marking it as uncategorized.'
                    } as ApiResponse)
                };
            }
            
            // Other client errors (401, 403, 404, or 400 without content filtering)
            return {
                status: 502,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: false,
                    error: 'Invalid request to upstream service',
                    detail: aoaiError.message?.slice(0, 300)
                } as ApiResponse)
            };
        }
        
        // Generic server error
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

app.http('openaiProxy', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'openai/chat/completions',
    handler: openaiProxy
});