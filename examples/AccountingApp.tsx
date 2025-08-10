import React, { useState } from 'react';
import { AccountsPage } from './AccountsPage';
import { TransactionsPage } from './TransactionsPage';
import { EditAccountPage } from './EditAccountPage';
import { Account } from '../src/types/index';

type Page = 'accounts' | 'transactions' | 'edit-account';

interface AppState {
    currentPage: Page;
    selectedAccountId?: string;
}

export function AccountingApp() {
    const [appState, setAppState] = useState<AppState>({
        currentPage: 'accounts'
    });

    // Navigation handlers
    const handleAccountClick = (accountId: string) => {
        setAppState({
            currentPage: 'transactions',
            selectedAccountId: accountId
        });
    };

    const handleBackToAccounts = () => {
        setAppState({
            currentPage: 'accounts',
            selectedAccountId: undefined
        });
    };

    const handleEditAccount = (accountId: string) => {
        setAppState({
            currentPage: 'edit-account',
            selectedAccountId: accountId
        });
    };

    const handleAccountSaved = (account: Account) => {
        // Could show a success message here
        console.log('Account saved:', account);
        
        // Navigate back to accounts page
        handleBackToAccounts();
    };

    const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:7071/api';

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
            {/* Navigation bar */}
            <nav style={{
                backgroundColor: '#ffffff',
                borderBottom: '1px solid #ddd',
                padding: '0 20px'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    height: '60px',
                    gap: '24px'
                }}>
                    <h2 style={{ margin: 0, color: '#333' }}>Account Manager</h2>
                    
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <button
                            onClick={handleBackToAccounts}
                            style={{
                                padding: '8px 16px',
                                border: appState.currentPage === 'accounts' ? '2px solid #007bff' : '1px solid #ddd',
                                borderRadius: '4px',
                                background: appState.currentPage === 'accounts' ? '#007bff' : 'white',
                                color: appState.currentPage === 'accounts' ? 'white' : '#333',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            Accounts
                        </button>
                        
                        {appState.selectedAccountId && (
                            <>
                                <button
                                    onClick={() => setAppState({ 
                                        currentPage: 'transactions', 
                                        selectedAccountId: appState.selectedAccountId 
                                    })}
                                    style={{
                                        padding: '8px 16px',
                                        border: appState.currentPage === 'transactions' ? '2px solid #007bff' : '1px solid #ddd',
                                        borderRadius: '4px',
                                        background: appState.currentPage === 'transactions' ? '#007bff' : 'white',
                                        color: appState.currentPage === 'transactions' ? 'white' : '#333',
                                        cursor: 'pointer',
                                        fontSize: '14px'
                                    }}
                                >
                                    Transactions
                                </button>
                                
                                <button
                                    onClick={() => handleEditAccount(appState.selectedAccountId!)}
                                    style={{
                                        padding: '8px 16px',
                                        border: appState.currentPage === 'edit-account' ? '2px solid #007bff' : '1px solid #ddd',
                                        borderRadius: '4px',
                                        background: appState.currentPage === 'edit-account' ? '#007bff' : 'white',
                                        color: appState.currentPage === 'edit-account' ? 'white' : '#333',
                                        cursor: 'pointer',
                                        fontSize: '14px'
                                    }}
                                >
                                    Edit Account
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* Page content */}
            <main>
                {appState.currentPage === 'accounts' && (
                    <AccountsPage 
                        onAccountClick={handleAccountClick}
                        apiBaseUrl={apiBaseUrl}
                    />
                )}

                {appState.currentPage === 'transactions' && appState.selectedAccountId && (
                    <TransactionsPage
                        accountId={appState.selectedAccountId}
                        onBack={handleBackToAccounts}
                        apiBaseUrl={apiBaseUrl}
                    />
                )}

                {appState.currentPage === 'edit-account' && appState.selectedAccountId && (
                    <EditAccountPage
                        accountId={appState.selectedAccountId}
                        onSave={handleAccountSaved}
                        onCancel={handleBackToAccounts}
                        apiBaseUrl={apiBaseUrl}
                    />
                )}
            </main>

            {/* Footer with usage instructions */}
            <footer style={{
                marginTop: '40px',
                padding: '20px',
                backgroundColor: '#ffffff',
                borderTop: '1px solid #ddd',
                color: '#666',
                fontSize: '14px'
            }}>
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <h3>Usage Instructions:</h3>
                    <ul>
                        <li><strong>Accounts Page:</strong> Shows all accounts with calculated current balances (initial balance + all transactions)</li>
                        <li><strong>Click an Account:</strong> Navigate to the transactions page filtered for that account</li>
                        <li><strong>Edit Account:</strong> The checkbox is properly aligned with the "Account is active" text</li>
                        <li><strong>Balance Calculation:</strong> Current balance = Initial balance + Sum of all transaction amounts</li>
                    </ul>
                    
                    <p style={{ marginTop: '16px', fontSize: '12px' }}>
                        This demo uses Azure Functions for the backend API. In production, data would be stored in a database instead of memory.
                    </p>
                </div>
            </footer>
        </div>
    );
}

export default AccountingApp;