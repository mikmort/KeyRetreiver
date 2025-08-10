import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { AccountService } from '../services/accountService';
import { TransactionsResponse, SuccessResponse, ErrorResponse } from '../types/index';

export async function getTransactions(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Getting transactions');

    try {
        // Get accountId from query parameters for filtering
        const url = new URL(request.url);
        const accountId = url.searchParams.get('accountId');
        
        const transactions = AccountService.getTransactions(accountId || undefined);
        
        const response: SuccessResponse<typeof transactions> = {
            success: true,
            data: transactions
        };

        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            body: JSON.stringify(response)
        };
    } catch (error) {
        context.log('Error getting transactions:', error);

        const errorResponse: ErrorResponse = {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to retrieve transactions'
        };

        return {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(errorResponse)
        };
    }
}

// Handle preflight OPTIONS request for CORS
export async function getTransactionsOptions(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    return {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
    };
}

app.http('getTransactions', {
    methods: ['GET'],
    route: 'transactions',
    authLevel: 'anonymous',
    handler: getTransactions
});

app.http('getTransactionsOptions', {
    methods: ['OPTIONS'],
    route: 'transactions',
    authLevel: 'anonymous',
    handler: getTransactionsOptions
});