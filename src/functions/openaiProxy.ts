import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';
import { OpenAIConfig, ChatCompletionRequest, ApiResponse } from '../types';
import { OpenAIService } from '../services/openAIService';

// CORS headers for React app
const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Will be configured based on environment
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
};

// Check if origin is allowed
function isOriginAllowed(origin: string): boolean {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
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
    context.log('OpenAI proxy request received');

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

        // Parse request body
        const requestBody = await request.json() as any;
        
        if (!requestBody) {
            return {
                status: 400,
                headers: responseHeaders,
                body: JSON.stringify({
                    success: false,
                    error: 'Request body is required'
                } as ApiResponse)
            };
        }

        // Extract deployment name from request (required for Azure OpenAI)
        const deployment = requestBody.deployment;
        if (!deployment) {
            return {
                status: 400,
                headers: responseHeaders,
                body: JSON.stringify({
                    success: false,
                    error: 'Deployment name is required'
                } as ApiResponse)
            };
        }

        // Extract the OpenAI request (remove deployment from the request sent to OpenAI)
        const { deployment: _, ...openaiRequest } = requestBody;
        const chatRequest = openaiRequest as ChatCompletionRequest;

        // Validate required fields
        if (!chatRequest.messages || !Array.isArray(chatRequest.messages)) {
            return {
                status: 400,
                headers: responseHeaders,
                body: JSON.stringify({
                    success: false,
                    error: 'Messages array is required'
                } as ApiResponse)
            };
        }

        // Get OpenAI configuration
        const config = await getOpenAIConfig(context);
        
        // Create OpenAI service and make the request
        const openaiService = new OpenAIService(config);
        const response = await openaiService.chatCompletion(chatRequest, deployment);

        return {
            status: 200,
            headers: responseHeaders,
            body: JSON.stringify({
                success: true,
                data: response
            } as ApiResponse)
        };

    } catch (error: any) {
        context.log('Error in OpenAI proxy:', error);
        
        return {
            status: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                success: false,
                error: 'Failed to process OpenAI request'
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