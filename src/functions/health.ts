import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function health(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Health check request received');

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
        return {
            status: 200,
            headers: corsHeaders
        };
    }

    try {
        const healthInfo = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            uptime: process.uptime(),
            environment: {
                nodeVersion: process.version,
                platform: process.platform,
                runtime: process.env.FUNCTIONS_WORKER_RUNTIME || 'node'
            },
            services: {
                blobStorage: process.env.AZURE_STORAGE_CONNECTION_STRING || process.env.AZURE_STORAGE_ACCOUNT_NAME ? 'configured' : 'not configured',
                keyVault: process.env.KEY_VAULT_URL ? 'configured' : 'not configured',
                openAI: process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY ? 'configured' : 'not configured'
            }
        };

        context.log('Health check successful:', healthInfo);

        return {
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                data: healthInfo
            })
        };
    } catch (error: any) {
        context.log('Health check error:', error);
        return {
            status: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
}

app.http('health', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'health',
    handler: health
});