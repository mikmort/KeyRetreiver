// React component example using AG Grid with KeyRetriever Azure Function
// This example shows proper pagination configuration to avoid AG Grid warnings
import React, { useState, useEffect, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

interface OpenAIConfig {
    endpoint: string;
    apiKey: string;
}

interface ApiResponse {
    success: boolean;
    data?: OpenAIConfig;
    error?: string;
}

// Sample data structure for demonstration
interface TransactionData {
    id: string;
    date: string;
    description: string;
    category: string;
    amount: number;
    account: string;
}

// Custom hook to fetch OpenAI configuration
export function useOpenAIConfig() {
    const [config, setConfig] = useState<OpenAIConfig | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchConfig() {
            try {
                setLoading(true);
                
                // Replace with your Azure Function URL
                const functionUrl = process.env.REACT_APP_AZURE_FUNCTION_URL || 'http://localhost:7071/api/openai/config';
                
                const response = await fetch(functionUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result: ApiResponse = await response.json();

                if (result.success && result.data) {
                    setConfig(result.data);
                    setError(null);
                } else {
                    throw new Error(result.error || 'Failed to retrieve configuration');
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred');
                setConfig(null);
            } finally {
                setLoading(false);
            }
        }

        fetchConfig();
    }, []);

    return { config, loading, error };
}

// AG Grid component with proper pagination configuration
export function DataGridExample() {
    const { config, loading, error } = useOpenAIConfig();
    const [rowData, setRowData] = useState<TransactionData[]>([]);

    // Sample data for demonstration
    useEffect(() => {
        // In a real app, this data might come from your OpenAI-powered backend
        const sampleData: TransactionData[] = [
            { id: '1', date: '2024-01-15', description: 'Grocery Store', category: 'Food', amount: -85.50, account: 'Checking' },
            { id: '2', date: '2024-01-16', description: 'Salary Deposit', category: 'Income', amount: 2500.00, account: 'Checking' },
            { id: '3', date: '2024-01-17', description: 'Gas Station', category: 'Transportation', amount: -42.30, account: 'Checking' },
            { id: '4', date: '2024-01-18', description: 'Online Shopping', category: 'Shopping', amount: -125.75, account: 'Credit Card' },
            { id: '5', date: '2024-01-19', description: 'Utility Bill', category: 'Utilities', amount: -89.20, account: 'Checking' },
            // Add more sample data to demonstrate pagination
            ...Array.from({ length: 50 }, (_, i) => ({
                id: (i + 6).toString(),
                date: new Date(2024, 0, 20 + i).toISOString().split('T')[0],
                description: `Transaction ${i + 6}`,
                category: ['Food', 'Transportation', 'Shopping', 'Utilities', 'Entertainment'][i % 5],
                amount: (Math.random() - 0.5) * 500,
                account: ['Checking', 'Credit Card', 'Savings'][i % 3],
            })),
        ];
        setRowData(sampleData);
    }, []);

    // Column definitions
    const columnDefs = useMemo(() => [
        { field: 'date', headerName: 'Date', sortable: true, filter: true, width: 120 },
        { field: 'description', headerName: 'Description', sortable: true, filter: true, flex: 1 },
        { field: 'category', headerName: 'Category', sortable: true, filter: true, width: 120 },
        { 
            field: 'amount', 
            headerName: 'Amount', 
            sortable: true, 
            filter: 'agNumberColumnFilter',
            width: 120,
            cellRenderer: (params: any) => {
                const value = params.value;
                const formatted = new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                }).format(Math.abs(value));
                return value < 0 ? `-${formatted}` : formatted;
            },
            cellStyle: (params: any) => {
                return params.value < 0 ? { color: 'red' } : { color: 'green' };
            }
        },
        { field: 'account', headerName: 'Account', sortable: true, filter: true, width: 120 },
    ], []);

    // Grid options with proper pagination configuration to avoid warnings
    const gridOptions = useMemo(() => ({
        // Pagination configuration - THIS FIXES THE AG GRID WARNING
        pagination: true,
        paginationPageSize: 20, // Must be included in paginationPageSizeSelector
        paginationPageSizeSelector: [10, 20, 50, 100], // Available page size options
        
        // Other grid options
        animateRows: true,
        enableCellTextSelection: true,
        ensureDomOrder: true,
        suppressCellFocus: true,
        
        // Default column properties
        defaultColDef: {
            resizable: true,
            sortable: true,
            filter: true,
        },
    }), []);

    if (loading) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <div>Loading OpenAI configuration...</div>
                <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                    Connecting to KeyRetriever service...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>
                <div>Error: {error}</div>
                <div style={{ marginTop: '10px', fontSize: '14px' }}>
                    Could not connect to KeyRetriever service
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
                <h2>Financial Data Grid with KeyRetriever Integration</h2>
                {config && (
                    <div style={{ 
                        backgroundColor: '#f0f8ff', 
                        padding: '10px', 
                        borderRadius: '5px',
                        marginBottom: '15px',
                        fontSize: '14px' 
                    }}>
                        <strong>✓ KeyRetriever Connected:</strong> {config.endpoint}
                        <br />
                        <small>API Key: {config.apiKey.substring(0, 8)}... (secured)</small>
                    </div>
                )}
                <p style={{ color: '#666', fontSize: '14px' }}>
                    This example demonstrates AG Grid with proper pagination configuration.
                    The <strong>paginationPageSize</strong> (20) is included in the{' '}
                    <strong>paginationPageSizeSelector</strong> array [10, 20, 50, 100].
                </p>
            </div>

            <div 
                className="ag-theme-alpine" 
                style={{ height: '500px', width: '100%' }}
            >
                <AgGridReact
                    rowData={rowData}
                    columnDefs={columnDefs}
                    gridOptions={gridOptions}
                />
            </div>

            <div style={{ marginTop: '15px', fontSize: '12px', color: '#888' }}>
                <p><strong>Pagination Settings:</strong></p>
                <ul style={{ margin: '5px 0' }}>
                    <li>Page Size: {gridOptions.paginationPageSize} rows</li>
                    <li>Available Sizes: {gridOptions.paginationPageSizeSelector?.join(', ')}</li>
                    <li>Total Rows: {rowData.length}</li>
                </ul>
                <p style={{ marginTop: '10px' }}>
                    <strong>Note:</strong> This configuration prevents the AG Grid warning by ensuring 
                    the paginationPageSize matches one of the values in paginationPageSizeSelector.
                </p>
            </div>
        </div>
    );
}

// Example of how to use this component in your React app
export function App() {
    return (
        <div>
            <DataGridExample />
        </div>
    );
}

export default DataGridExample;