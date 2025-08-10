import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { AccountService } from '../services/accountService';
import { SuccessResponse, ErrorResponse, Account } from '../types/index';

export async function updateAccount(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Updating account');

    try {
        // Get account ID from route parameters
        const accountId = request.params.id;
        if (!accountId) {
            const errorResponse: ErrorResponse = {
                success: false,
                error: 'Account ID is required'
            };
            return {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify(errorResponse)
            };
        }

        const bodyText = await request.text();
        const updates: Partial<Account> = bodyText ? JSON.parse(bodyText) : {};
        
        const updatedAccount = AccountService.updateAccount(accountId, updates);
        
        if (!updatedAccount) {
            const errorResponse: ErrorResponse = {
                success: false,
                error: 'Account not found'
            };
            return {
                status: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify(errorResponse)
            };
        }

        const response: SuccessResponse<Account> = {
            success: true,
            data: updatedAccount
        };

        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            body: JSON.stringify(response)
        };
    } catch (error) {
        context.log('Error updating account:', error);

        const errorResponse: ErrorResponse = {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update account'
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

export async function getAccount(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Getting single account');

    try {
        // Get account ID from route parameters
        const accountId = request.params.id;
        if (!accountId) {
            const errorResponse: ErrorResponse = {
                success: false,
                error: 'Account ID is required'
            };
            return {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify(errorResponse)
            };
        }

        const account = AccountService.getAccountWithBalance(accountId);
        
        if (!account) {
            const errorResponse: ErrorResponse = {
                success: false,
                error: 'Account not found'
            };
            return {
                status: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify(errorResponse)
            };
        }

        const response: SuccessResponse<typeof account> = {
            success: true,
            data: account
        };

        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            body: JSON.stringify(response)
        };
    } catch (error) {
        context.log('Error getting account:', error);

        const errorResponse: ErrorResponse = {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to retrieve account'
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
export async function accountOptions(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    return {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
    };
}

app.http('getAccount', {
    methods: ['GET'],
    route: 'accounts/{id}',
    authLevel: 'anonymous',
    handler: getAccount
});

app.http('updateAccount', {
    methods: ['PUT'],
    route: 'accounts/{id}',
    authLevel: 'anonymous',
    handler: updateAccount
});

app.http('accountOptions', {
    methods: ['OPTIONS'],
    route: 'accounts/{id}',
    authLevel: 'anonymous',
    handler: accountOptions
});