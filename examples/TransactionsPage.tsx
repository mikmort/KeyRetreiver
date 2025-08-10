import React, { useState, useEffect } from 'react';
import { Transaction, AccountWithBalance } from '../src/types/index';

interface TransactionsPageProps {
    accountId?: string;
    onBack?: () => void;
    apiBaseUrl?: string;
}

export function TransactionsPage({ accountId, onBack, apiBaseUrl = 'http://localhost:7071/api' }: TransactionsPageProps) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [account, setAccount] = useState<AccountWithBalance | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                
                // Fetch transactions
                const transactionsUrl = accountId 
                    ? `${apiBaseUrl}/transactions?accountId=${accountId}`
                    : `${apiBaseUrl}/transactions`;
                
                const transactionsResponse = await fetch(transactionsUrl);
                
                if (!transactionsResponse.ok) {
                    throw new Error(`HTTP error! status: ${transactionsResponse.status}`);
                }

                const transactionsResult = await transactionsResponse.json();
                
                if (transactionsResult.success) {
                    setTransactions(transactionsResult.data || []);
                } else {
                    throw new Error(transactionsResult.error || 'Failed to fetch transactions');
                }

                // If filtering by account, fetch account details
                if (accountId) {
                    const accountResponse = await fetch(`${apiBaseUrl}/accounts/${accountId}`);
                    
                    if (accountResponse.ok) {
                        const accountResult = await accountResponse.json();
                        if (accountResult.success) {
                            setAccount(accountResult.data);
                        }
                    }
                }
                
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [accountId, apiBaseUrl]);

    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString();
    };

    const formatDateTime = (dateString: string): string => {
        return new Date(dateString).toLocaleString();
    };

    if (loading) {
        return <div style={{ padding: '20px' }}>Loading transactions...</div>;
    }

    if (error) {
        return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;
    }

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                {onBack && (
                    <button 
                        onClick={onBack}
                        style={{
                            padding: '8px 16px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            background: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        ← Back to Accounts
                    </button>
                )}
                <div>
                    <h1 style={{ margin: '0' }}>
                        {account ? `Transactions - ${account.name}` : 'All Transactions'}
                    </h1>
                    {account && (
                        <p style={{ margin: '4px 0 0 0', color: '#666' }}>
                            Current Balance: <strong style={{ color: account.currentBalance >= 0 ? '#28a745' : '#dc3545' }}>
                                {formatCurrency(account.currentBalance)}
                            </strong>
                        </p>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gap: '8px' }}>
                {transactions.length > 0 ? (
                    transactions.map(transaction => (
                        <div
                            key={transaction.id}
                            style={{
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                padding: '12px',
                                backgroundColor: 'white'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                                        {transaction.description}
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#666' }}>
                                        {formatDateTime(transaction.date)}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
                                        Type: {transaction.type} | ID: {transaction.id}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div 
                                        style={{ 
                                            fontSize: '18px', 
                                            fontWeight: 'bold',
                                            color: transaction.amount >= 0 ? '#28a745' : '#dc3545'
                                        }}
                                    >
                                        {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#666' }}>
                                        {transaction.type === 'credit' ? 'Credit' : 'Debit'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div style={{ textAlign: 'center', color: '#666', marginTop: '40px' }}>
                        {account ? 'No transactions found for this account' : 'No transactions found'}
                    </div>
                )}
            </div>

            {transactions.length > 0 && (
                <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                    <strong>Total Transactions: {transactions.length}</strong>
                    <div style={{ marginTop: '8px' }}>
                        Credits: {transactions.filter(t => t.amount >= 0).length} | 
                        Debits: {transactions.filter(t => t.amount < 0).length}
                    </div>
                    <div style={{ marginTop: '4px' }}>
                        Net Amount: <span style={{ 
                            color: transactions.reduce((sum, t) => sum + t.amount, 0) >= 0 ? '#28a745' : '#dc3545',
                            fontWeight: 'bold'
                        }}>
                            {formatCurrency(transactions.reduce((sum, t) => sum + t.amount, 0))}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

// Custom hook for fetching transactions
export function useTransactions(accountId?: string, apiBaseUrl = 'http://localhost:7071/api') {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const url = accountId 
                ? `${apiBaseUrl}/transactions?accountId=${accountId}`
                : `${apiBaseUrl}/transactions`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                setTransactions(result.data || []);
                setError(null);
            } else {
                throw new Error(result.error || 'Failed to fetch transactions');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, [accountId, apiBaseUrl]);

    return { transactions, loading, error, refetch: fetchTransactions };
}