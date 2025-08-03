import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function diagnostics(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Diagnostics function called');

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
        return {
            status: 200,
            headers: corsHeaders
        };
    }

    try {
        const diagnosticInfo = {
            timestamp: new Date().toISOString(),
            environment: {
                AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT ? 'SET' : 'NOT SET',
                AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY ? 'SET' : 'NOT SET',
                KEY_VAULT_URL: process.env.KEY_VAULT_URL ? 'SET' : 'NOT SET',
                FUNCTIONS_WORKER_RUNTIME: process.env.FUNCTIONS_WORKER_RUNTIME || 'NOT SET',
                ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || 'NOT SET'
            },
            nodeVersion: process.version,
            platform: process.platform
        };

        context.log('Diagnostic info:', diagnosticInfo);

        return {
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                data: diagnosticInfo
            })
        };
    } catch (error: any) {
        context.log('Diagnostics error:', error);
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

app.http('diagnostics', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'diagnostics',
    handler: diagnostics
});
