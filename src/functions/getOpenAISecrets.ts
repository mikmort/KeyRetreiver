import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';

interface OpenAIConfig {
    endpoint: string;
    apiKey: string;
}

interface ApiResponse {
    success: boolean;
    data?: OpenAIConfig;
    error?: string;
}

// CORS headers for React app
const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Will be configured based on environment
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
};



// Get secrets from Azure Key Vault
async function getSecretsFromKeyVault(): Promise<OpenAIConfig> {
    try {
        const keyVaultUrl = process.env.KEY_VAULT_URL;
        if (!keyVaultUrl) {
            throw new Error('KEY_VAULT_URL environment variable is not set');
        }

        const credential = new DefaultAzureCredential();
        const client = new SecretClient(keyVaultUrl, credential);
        
        const apiKeySecretName = process.env.AZURE_OPENAI_API_KEY_SECRET_NAME || 'azure-openai-api-key';
        const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
        
        if (!endpoint) {
            throw new Error('AZURE_OPENAI_ENDPOINT environment variable is not set');
        }

        // Retrieve the API key from Key Vault
        const secret = await client.getSecret(apiKeySecretName);
        
        if (!secret.value) {
            throw new Error('Failed to retrieve API key from Key Vault');
        }

        return {
            endpoint: endpoint,
            apiKey: secret.value
        };
    } catch (error: any) {
        throw new Error(`Failed to retrieve secrets: ${error.message}`);
    }
}

// Fallback to environment variables (for development)
function getSecretsFromEnvironment(): OpenAIConfig {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    
    if (!endpoint || !apiKey) {
        throw new Error('Required environment variables AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY are not set');
    }
    
    return { endpoint, apiKey };
}

export async function getOpenAISecrets(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Azure OpenAI secrets request received');

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return {
            status: 200,
            headers: corsHeaders
        };
    }

    // Only allow GET requests
    if (request.method !== 'GET') {
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
        let config: OpenAIConfig;

        // Try to get secrets from Key Vault first, fallback to environment variables
        try {
            config = await getSecretsFromKeyVault();
            context.log('Successfully retrieved secrets from Key Vault');
        } catch (keyVaultError: any) {
            context.log('Key Vault retrieval failed, falling back to environment variables:', keyVaultError.message);
            config = getSecretsFromEnvironment();
            context.log('Successfully retrieved secrets from environment variables');
        }

        return {
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                data: config
            } as ApiResponse)
        };

    } catch (error: any) {
        context.log('Error retrieving OpenAI configuration:', error);
        
        return {
            status: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                success: false,
                error: 'Failed to retrieve OpenAI configuration'
            } as ApiResponse)
        };
    }
}

app.http('getOpenAISecrets', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'openai/config',
    handler: getOpenAISecrets
});
