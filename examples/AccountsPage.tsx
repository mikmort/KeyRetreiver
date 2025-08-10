import React, { useState, useEffect } from 'react';
import { AccountWithBalance } from '../src/types/index';

interface AccountsPageProps {
    onAccountClick?: (accountId: string) => void;
    apiBaseUrl?: string;
}

export function AccountsPage({ onAccountClick, apiBaseUrl = 'http://localhost:7071/api' }: AccountsPageProps) {
    const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchAccounts() {
            try {
                setLoading(true);
                const response = await fetch(`${apiBaseUrl}/accounts`);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
                
                if (result.success) {
                    setAccounts(result.data || []);
                    setError(null);
                } else {
                    throw new Error(result.error || 'Failed to fetch accounts');
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        }

        fetchAccounts();
    }, [apiBaseUrl]);

    const handleAccountClick = (accountId: string) => {
        if (onAccountClick) {
            onAccountClick(accountId);
        }
    };

    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString();
    };

    if (loading) {
        return <div style={{ padding: '20px' }}>Loading accounts...</div>;
    }

    if (error) {
        return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;
    }

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h1>Accounts</h1>
            <div style={{ display: 'grid', gap: '16px' }}>
                {accounts.map(account => (
                    <div
                        key={account.id}
                        onClick={() => handleAccountClick(account.id)}
                        style={{
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            padding: '16px',
                            cursor: 'pointer',
                            backgroundColor: account.isActive ? 'white' : '#f5f5f5',
                            transition: 'box-shadow 0.2s',
                            ':hover': {
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: '0 0 8px 0' }}>{account.name}</h3>
                                <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
                                    Created: {formatDate(account.createdDate)}
                                </p>
                                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: account.isActive ? '#28a745' : '#dc3545' }}>
                                    {account.isActive ? '● Active' : '● Inactive'}
                                </p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: account.currentBalance >= 0 ? '#28a745' : '#dc3545' }}>
                                    {formatCurrency(account.currentBalance)}
                                </div>
                                <div style={{ fontSize: '12px', color: '#666' }}>
                                    Initial: {formatCurrency(account.initialBalance)}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            {accounts.length === 0 && (
                <div style={{ textAlign: 'center', color: '#666', marginTop: '40px' }}>
                    No accounts found
                </div>
            )}
        </div>
    );
}

// Custom hook for fetching accounts
export function useAccounts(apiBaseUrl = 'http://localhost:7071/api') {
    const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAccounts = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${apiBaseUrl}/accounts`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                setAccounts(result.data || []);
                setError(null);
            } else {
                throw new Error(result.error || 'Failed to fetch accounts');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, [apiBaseUrl]);

    return { accounts, loading, error, refetch: fetchAccounts };
}