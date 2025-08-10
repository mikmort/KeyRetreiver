import React, { useState, useEffect } from 'react';
import { Account, AccountWithBalance } from '../src/types/index';

interface EditAccountPageProps {
    accountId: string;
    onSave?: (account: Account) => void;
    onCancel?: () => void;
    apiBaseUrl?: string;
}

export function EditAccountPage({ accountId, onSave, onCancel, apiBaseUrl = 'http://localhost:7071/api' }: EditAccountPageProps) {
    const [account, setAccount] = useState<AccountWithBalance | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        initialBalance: 0,
        isActive: true
    });
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchAccount() {
            try {
                setLoading(true);
                const response = await fetch(`${apiBaseUrl}/accounts/${accountId}`);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
                
                if (result.success && result.data) {
                    setAccount(result.data);
                    setFormData({
                        name: result.data.name,
                        initialBalance: result.data.initialBalance,
                        isActive: result.data.isActive
                    });
                    setError(null);
                } else {
                    throw new Error(result.error || 'Failed to fetch account');
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        }

        fetchAccount();
    }, [accountId, apiBaseUrl]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) || 0 : value)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            setSaving(true);
            setError(null);

            const response = await fetch(`${apiBaseUrl}/accounts/${accountId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success && result.data) {
                if (onSave) {
                    onSave(result.data);
                }
            } else {
                throw new Error(result.error || 'Failed to update account');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setSaving(false);
        }
    };

    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    if (loading) {
        return <div style={{ padding: '20px' }}>Loading account...</div>;
    }

    if (!account) {
        return <div style={{ padding: '20px', color: 'red' }}>Account not found</div>;
    }

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '600px' }}>
            <div style={{ marginBottom: '20px' }}>
                <h1>Edit Account</h1>
                <p style={{ color: '#666' }}>
                    Current Balance: <strong style={{ color: account.currentBalance >= 0 ? '#28a745' : '#dc3545' }}>
                        {formatCurrency(account.currentBalance)}
                    </strong>
                </p>
            </div>

            {error && (
                <div style={{
                    padding: '12px',
                    marginBottom: '20px',
                    backgroundColor: '#f8d7da',
                    border: '1px solid #f5c6cb',
                    borderRadius: '4px',
                    color: '#721c24'
                }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
                <div>
                    <label htmlFor="name" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                        Account Name
                    </label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '16px'
                        }}
                    />
                </div>

                <div>
                    <label htmlFor="initialBalance" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                        Initial Balance
                    </label>
                    <input
                        type="number"
                        id="initialBalance"
                        name="initialBalance"
                        value={formData.initialBalance}
                        onChange={handleInputChange}
                        step="0.01"
                        style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '16px'
                        }}
                    />
                    <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
                        Note: Changing the initial balance will affect the calculated current balance.
                    </small>
                </div>

                {/* Properly aligned checkbox with label */}
                <div>
                    <label 
                        htmlFor="isActive" 
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        <input
                            type="checkbox"
                            id="isActive"
                            name="isActive"
                            checked={formData.isActive}
                            onChange={handleInputChange}
                            style={{
                                width: '18px',
                                height: '18px',
                                cursor: 'pointer'
                            }}
                        />
                        Account is active
                    </label>
                    <small style={{ color: '#666', marginTop: '4px', display: 'block', marginLeft: '26px' }}>
                        Inactive accounts are displayed with reduced visibility and cannot process new transactions.
                    </small>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <button
                        type="submit"
                        disabled={saving}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '16px',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            opacity: saving ? 0.7 : 1
                        }}
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={saving}
                            style={{
                                padding: '12px 24px',
                                backgroundColor: '#6c757d',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '16px',
                                cursor: saving ? 'not-allowed' : 'pointer',
                                opacity: saving ? 0.7 : 1
                            }}
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </form>

            <div style={{ marginTop: '30px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                <h3 style={{ margin: '0 0 12px 0' }}>Account Information</h3>
                <p><strong>Account ID:</strong> {account.id}</p>
                <p><strong>Created:</strong> {new Date(account.createdDate).toLocaleDateString()}</p>
                <p><strong>Current Status:</strong> {account.isActive ? 'Active' : 'Inactive'}</p>
                <p><strong>Initial Balance:</strong> {formatCurrency(account.initialBalance)}</p>
                <p><strong>Current Balance:</strong> {formatCurrency(account.currentBalance)}</p>
            </div>
        </div>
    );
}

// Custom hook for account management
export function useAccountEdit(accountId: string, apiBaseUrl = 'http://localhost:7071/api') {
    const [account, setAccount] = useState<AccountWithBalance | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAccount = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${apiBaseUrl}/accounts/${accountId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success && result.data) {
                setAccount(result.data);
                setError(null);
            } else {
                throw new Error(result.error || 'Failed to fetch account');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const updateAccount = async (updates: Partial<Account>) => {
        const response = await fetch(`${apiBaseUrl}/accounts/${accountId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success && result.data) {
            setAccount(result.data);
            return result.data;
        } else {
            throw new Error(result.error || 'Failed to update account');
        }
    };

    useEffect(() => {
        fetchAccount();
    }, [accountId, apiBaseUrl]);

    return { account, loading, error, updateAccount, refetch: fetchAccount };
}