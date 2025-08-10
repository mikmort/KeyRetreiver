import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { AccountService } from '../services/accountService';
import { AccountsResponse, SuccessResponse, ErrorResponse } from '../types/index';

export async function getAccounts(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Getting all accounts with calculated balances');

    try {
        const accountsWithBalances = AccountService.getAllAccountsWithBalances();
        
        const response: SuccessResponse<typeof accountsWithBalances> = {
            success: true,
            data: accountsWithBalances
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
        context.log('Error getting accounts:', error);

        const errorResponse: ErrorResponse = {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to retrieve accounts'
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
export async function getAccountsOptions(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    return {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
    };
}

app.http('getAccounts', {
    methods: ['GET'],
    route: 'accounts',
    authLevel: 'anonymous',
    handler: getAccounts
});

app.http('getAccountsOptions', {
    methods: ['OPTIONS'],
    route: 'accounts',
    authLevel: 'anonymous',
    handler: getAccountsOptions
});