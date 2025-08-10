// Transaction Manager component addressing duplicate UX improvements
import React, { useState, useCallback } from 'react';

interface Transaction {
    id: string;
    description: string;
    amount: number;
    date: string;
    category: string;
}

interface TransactionManagerProps {
    initialTransactions?: Transaction[];
}

export function TransactionManager({ initialTransactions = [] }: TransactionManagerProps) {
    const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions.length > 0 ? initialTransactions : [
        { id: '1', description: 'Grocery Store', amount: -50.25, date: '2024-01-15', category: 'Food' },
        { id: '2', description: 'Gas Station', amount: -35.00, date: '2024-01-15', category: 'Transport' },
        { id: '3', description: 'Grocery Store', amount: -50.25, date: '2024-01-15', category: 'Food' }, // Duplicate
        { id: '4', description: 'Salary', amount: 3000.00, date: '2024-01-16', category: 'Income' },
        { id: '5', description: 'Coffee Shop', amount: -4.50, date: '2024-01-16', category: 'Food' },
        { id: '6', description: 'Coffee Shop', amount: -4.50, date: '2024-01-16', category: 'Food' }, // Duplicate
    ]);
    
    const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    // Select all functionality
    const handleSelectAll = useCallback(() => {
        if (selectedTransactions.size === transactions.length) {
            setSelectedTransactions(new Set());
        } else {
            setSelectedTransactions(new Set(transactions.map(t => t.id)));
        }
    }, [transactions, selectedTransactions.size]);

    // Toggle individual transaction selection
    const handleToggleTransaction = useCallback((id: string) => {
        const newSelected = new Set(selectedTransactions);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedTransactions(newSelected);
    }, [selectedTransactions]);

    // Remove duplicates functionality - no browser alert
    const handleRemoveDuplicates = useCallback(() => {
        const seen = new Map<string, Transaction>();
        const uniqueTransactions = transactions.filter(transaction => {
            const key = `${transaction.description}-${transaction.amount}-${transaction.date}`;
            if (seen.has(key)) {
                return false; // Skip duplicate
            }
            seen.set(key, transaction);
            return true;
        });
        
        setTransactions(uniqueTransactions);
        setSelectedTransactions(new Set());
        setActiveMenu(null);
        
        // Note: No browser alert() as requested in the issue
    }, [transactions]);

    // Delete selected transactions
    const handleDeleteSelected = useCallback(() => {
        const newTransactions = transactions.filter(t => !selectedTransactions.has(t.id));
        setTransactions(newTransactions);
        setSelectedTransactions(new Set());
        setActiveMenu(null);
    }, [transactions, selectedTransactions]);

    // Menu actions - ensuring no scrolling needed and Remove Duplicates is visible
    const menuActions = [
        { label: 'Edit Transaction', action: () => console.log('Edit') },
        { label: 'Duplicate Transaction', action: () => console.log('Duplicate') },
        { label: 'Export Selection', action: () => console.log('Export') },
        { label: 'Mark as Reviewed', action: () => console.log('Mark') },
        { label: 'Remove Duplicates', action: handleRemoveDuplicates }, // 5th item - visible by default
        { label: 'Delete Selected', action: handleDeleteSelected },
    ];

    return (
        <div style={{ 
            maxWidth: '800px', 
            margin: '20px auto', 
            padding: '20px',
            fontFamily: 'Arial, sans-serif'
        }}>
            <h2>Transaction Manager</h2>
            
            {/* Control Panel */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '20px',
                padding: '10px',
                backgroundColor: '#f5f5f5',
                borderRadius: '5px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {/* Enhanced Select All button with outline */}
                    <button 
                        onClick={handleSelectAll}
                        style={{
                            padding: '8px 16px',
                            fontSize: '14px',
                            fontWeight: '600',
                            backgroundColor: selectedTransactions.size === transactions.length ? '#2196f3' : 'white',
                            color: selectedTransactions.size === transactions.length ? 'white' : '#2196f3',
                            border: '2px solid #2196f3', // Enhanced outline as requested
                            borderRadius: '5px',
                            cursor: 'pointer',
                            outline: 'none',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 4px rgba(33, 150, 243, 0.2)' // Additional visibility enhancement
                        }}
                        onMouseOver={(e) => {
                            if (selectedTransactions.size !== transactions.length) {
                                e.currentTarget.style.backgroundColor = '#e3f2fd';
                            }
                        }}
                        onMouseOut={(e) => {
                            if (selectedTransactions.size !== transactions.length) {
                                e.currentTarget.style.backgroundColor = 'white';
                            }
                        }}
                    >
                        {selectedTransactions.size === transactions.length ? 'Deselect All' : 'Select All'}
                    </button>
                    
                    <span style={{ color: '#666', fontSize: '14px' }}>
                        {selectedTransactions.size} of {transactions.length} selected
                    </span>
                </div>

                {/* Actions Menu - Non-scrolling design */}
                <div style={{ position: 'relative' }}>
                    <button 
                        onClick={() => setActiveMenu(activeMenu === 'main' ? null : 'main')}
                        style={{
                            padding: '8px 12px',
                            fontSize: '16px',
                            backgroundColor: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                        }}
                    >
                        Actions
                        <span style={{ 
                            fontSize: '20px', 
                            transform: activeMenu === 'main' ? 'rotate(90deg)' : 'none',
                            transition: 'transform 0.2s ease'
                        }}>⋯</span>
                    </button>

                    {/* Non-scrolling menu - all items visible */}
                    {activeMenu === 'main' && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            right: '0',
                            backgroundColor: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '5px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            zIndex: 1000,
                            minWidth: '200px',
                            marginTop: '5px',
                            // Fixed height to show all items without scrolling
                            maxHeight: 'none', // Remove any max-height that would cause scrolling
                            overflow: 'visible' // Ensure all items are visible
                        }}>
                            {menuActions.map((action, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        action.action();
                                        setActiveMenu(null);
                                    }}
                                    disabled={action.label === 'Delete Selected' && selectedTransactions.size === 0}
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        padding: '12px 16px',
                                        border: 'none',
                                        backgroundColor: 'transparent',
                                        textAlign: 'left',
                                        cursor: selectedTransactions.size === 0 && action.label === 'Delete Selected' ? 'not-allowed' : 'pointer',
                                        fontSize: '14px',
                                        color: selectedTransactions.size === 0 && action.label === 'Delete Selected' ? '#999' : '#333',
                                        // Highlight the Remove Duplicates option (5th item)
                                        fontWeight: action.label === 'Remove Duplicates' ? '600' : 'normal',
                                        backgroundColor: action.label === 'Remove Duplicates' ? '#fff3e0' : 'transparent'
                                    }}
                                    onMouseOver={(e) => {
                                        if (!(selectedTransactions.size === 0 && action.label === 'Delete Selected')) {
                                            e.currentTarget.style.backgroundColor = action.label === 'Remove Duplicates' ? '#ffe0b3' : '#f5f5f5';
                                        }
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.backgroundColor = action.label === 'Remove Duplicates' ? '#fff3e0' : 'transparent';
                                    }}
                                >
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Transaction List */}
            <div style={{ 
                border: '1px solid #ddd', 
                borderRadius: '5px',
                overflow: 'hidden'
            }}>
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '50px 1fr 100px 120px 120px',
                    gap: '10px',
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    borderBottom: '1px solid #ddd',
                    fontWeight: '600',
                    fontSize: '14px'
                }}>
                    <div>Select</div>
                    <div>Description</div>
                    <div>Amount</div>
                    <div>Date</div>
                    <div>Category</div>
                </div>

                {transactions.map((transaction) => (
                    <div 
                        key={transaction.id}
                        style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '50px 1fr 100px 120px 120px',
                            gap: '10px',
                            padding: '12px',
                            borderBottom: '1px solid #eee',
                            backgroundColor: selectedTransactions.has(transaction.id) ? '#e3f2fd' : 'white',
                            cursor: 'pointer'
                        }}
                        onClick={() => handleToggleTransaction(transaction.id)}
                    >
                        <input 
                            type="checkbox"
                            checked={selectedTransactions.has(transaction.id)}
                            onChange={() => handleToggleTransaction(transaction.id)}
                            style={{ cursor: 'pointer' }}
                        />
                        <div style={{ fontSize: '14px' }}>{transaction.description}</div>
                        <div style={{ 
                            fontSize: '14px',
                            color: transaction.amount >= 0 ? '#4caf50' : '#f44336',
                            fontWeight: '600'
                        }}>
                            ${Math.abs(transaction.amount).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '14px', color: '#666' }}>{transaction.date}</div>
                        <div style={{ fontSize: '14px', color: '#666' }}>{transaction.category}</div>
                    </div>
                ))}
            </div>

            {transactions.length === 0 && (
                <div style={{ 
                    textAlign: 'center', 
                    padding: '40px',
                    color: '#666',
                    fontStyle: 'italic'
                }}>
                    No transactions found
                </div>
            )}
        </div>
    );
}

// Usage example component
export function TransactionManagerExample() {
    return (
        <div>
            <h1>Transaction Management System</h1>
            <TransactionManager />
        </div>
    );
}