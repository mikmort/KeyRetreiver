import { Account, Transaction, AccountWithBalance } from '../types/index';

// In-memory storage (in production, this would be a database)
let accounts: Account[] = [
    {
        id: '1',
        name: 'Checking Account',
        initialBalance: 1000.00,
        isActive: true,
        createdDate: '2024-01-01T00:00:00Z'
    },
    {
        id: '2',
        name: 'Savings Account',
        initialBalance: 5000.00,
        isActive: true,
        createdDate: '2024-01-01T00:00:00Z'
    },
    {
        id: '3',
        name: 'Credit Card',
        initialBalance: -500.00,
        isActive: false,
        createdDate: '2024-01-01T00:00:00Z'
    }
];

let transactions: Transaction[] = [
    {
        id: '1',
        accountId: '1',
        amount: 250.00,
        date: '2024-01-15T00:00:00Z',
        description: 'Salary deposit',
        type: 'credit'
    },
    {
        id: '2',
        accountId: '1',
        amount: -50.00,
        date: '2024-01-16T00:00:00Z',
        description: 'Grocery shopping',
        type: 'debit'
    },
    {
        id: '3',
        accountId: '2',
        amount: 100.00,
        date: '2024-01-17T00:00:00Z',
        description: 'Interest earned',
        type: 'credit'
    },
    {
        id: '4',
        accountId: '1',
        amount: -30.00,
        date: '2024-01-18T00:00:00Z',
        description: 'Gas station',
        type: 'debit'
    }
];

export class AccountService {
    /**
     * Calculate current balance for an account
     */
    static calculateBalance(accountId: string): number {
        const account = accounts.find(a => a.id === accountId);
        if (!account) return 0;

        const accountTransactions = transactions.filter(t => t.accountId === accountId);
        const transactionTotal = accountTransactions.reduce((sum, t) => sum + t.amount, 0);
        
        return account.initialBalance + transactionTotal;
    }

    /**
     * Get all accounts with calculated balances
     */
    static getAllAccountsWithBalances(): AccountWithBalance[] {
        return accounts.map(account => ({
            ...account,
            currentBalance: this.calculateBalance(account.id)
        }));
    }

    /**
     * Get a single account with calculated balance
     */
    static getAccountWithBalance(accountId: string): AccountWithBalance | null {
        const account = accounts.find(a => a.id === accountId);
        if (!account) return null;

        return {
            ...account,
            currentBalance: this.calculateBalance(accountId)
        };
    }

    /**
     * Get all transactions, optionally filtered by account
     */
    static getTransactions(accountId?: string): Transaction[] {
        if (accountId) {
            return transactions.filter(t => t.accountId === accountId);
        }
        return [...transactions];
    }

    /**
     * Update an account
     */
    static updateAccount(accountId: string, updates: Partial<Account>): Account | null {
        const accountIndex = accounts.findIndex(a => a.id === accountId);
        if (accountIndex === -1) return null;

        accounts[accountIndex] = { ...accounts[accountIndex], ...updates };
        return accounts[accountIndex];
    }

    /**
     * Create a new account
     */
    static createAccount(accountData: Omit<Account, 'id'>): Account {
        const newAccount: Account = {
            id: Math.random().toString(36).substr(2, 9),
            ...accountData
        };
        accounts.push(newAccount);
        return newAccount;
    }

    /**
     * Create a new transaction
     */
    static createTransaction(transactionData: Omit<Transaction, 'id'>): Transaction {
        const newTransaction: Transaction = {
            id: Math.random().toString(36).substr(2, 9),
            ...transactionData
        };
        transactions.push(newTransaction);
        return newTransaction;
    }

    /**
     * Get account by id
     */
    static getAccount(accountId: string): Account | null {
        return accounts.find(a => a.id === accountId) || null;
    }
}