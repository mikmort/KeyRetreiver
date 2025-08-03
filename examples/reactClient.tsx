// React client example for consuming the Azure Function
import { useState, useEffect } from 'react';

interface OpenAIConfig {
    endpoint: string;
    apiKey: string;
}

interface ApiResponse {
    success: boolean;
    data?: OpenAIConfig;
    error?: string;
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

// Example React component using the hook
export function OpenAIComponent() {
    const { config, loading, error } = useOpenAIConfig();

    if (loading) {
        return <div>Loading OpenAI configuration...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    if (!config) {
        return <div>No configuration available</div>;
    }

    return (
        <div>
            <h3>OpenAI Configuration Retrieved</h3>
            <p>Endpoint: {config.endpoint}</p>
            <p>API Key: {config.apiKey.substring(0, 10)}...</p>
            {/* Use the config to initialize your OpenAI client */}
        </div>
    );
}

// Example of how to use the configuration with Azure OpenAI
export async function callOpenAI(config: OpenAIConfig, prompt: string) {
    const response = await fetch(`${config.endpoint}/openai/deployments/your-deployment-name/chat/completions?api-version=2024-02-15-preview`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'api-key': config.apiKey,
        },
        body: JSON.stringify({
            messages: [
                { role: 'user', content: prompt }
            ],
            max_tokens: 150,
        }),
    });

    if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
    }

    return response.json();
}
