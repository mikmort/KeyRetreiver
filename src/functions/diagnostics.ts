import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { globalRateLimiter } from '../services/rateLimiter';
import { openaiSemaphore } from '../services/concurrency';

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
                ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || 'NOT SET',
                // Rate limiting configuration
                RATE_LIMIT_GLOBAL_RPS: process.env.RATE_LIMIT_GLOBAL_RPS || '8 (default)',
                RATE_LIMIT_USER_RPS: process.env.RATE_LIMIT_USER_RPS || '2 (default)',
                // Concurrency configuration
                MAX_PARALLEL_AOAI: process.env.MAX_PARALLEL_AOAI || '8 (default)',
                // Retry configuration
                AOAI_MAX_RETRIES: process.env.AOAI_MAX_RETRIES || '6 (default)',
                AOAI_BASE_DELAY_MS: process.env.AOAI_BASE_DELAY_MS || '500 (default)',
                AOAI_MAX_DELAY_MS: process.env.AOAI_MAX_DELAY_MS || '15000 (default)',
                // Validation configuration
                VALIDATION_MAX_MESSAGES: process.env.VALIDATION_MAX_MESSAGES || '50 (default)',
                VALIDATION_MAX_MESSAGE_LENGTH: process.env.VALIDATION_MAX_MESSAGE_LENGTH || '4000 (default)',
                VALIDATION_MAX_TOKENS: process.env.VALIDATION_MAX_TOKENS || '4000 (default)'
            },
            nodeVersion: process.version,
            platform: process.platform,
            rateLimiter: globalRateLimiter.getStatus(),
            concurrency: openaiSemaphore.getStatus()
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
