// React client example for using the OpenAI proxy function
import { useState } from 'react';

interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface ChatCompletionRequest {
    deployment: string; // Azure OpenAI deployment name
    messages: ChatMessage[];
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    stop?: string | string[];
}

interface ChatCompletionResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: ChatMessage;
        finish_reason: string;
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

// Custom hook to interact with OpenAI via the proxy
export function useOpenAIProxy() {
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const chatCompletion = async (request: ChatCompletionRequest): Promise<ChatCompletionResponse | null> => {
        try {
            setLoading(true);
            setError(null);
            
            // Replace with your Azure Function URL
            const functionUrl = process.env.REACT_APP_AZURE_FUNCTION_URL 
                ? `${process.env.REACT_APP_AZURE_FUNCTION_URL}/api/openai/chat/completions`
                : 'http://localhost:7071/api/openai/chat/completions';
            
            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result: ApiResponse<ChatCompletionResponse> = await response.json();

            if (result.success && result.data) {
                return result.data;
            } else {
                throw new Error(result.error || 'Failed to get response from OpenAI');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            return null;
        } finally {
            setLoading(false);
        }
    };

    return { chatCompletion, loading, error };
}

// Example React component using the proxy
export function ChatComponent() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [deployment, setDeployment] = useState('gpt-4o-mini'); // Default deployment name
    const { chatCompletion, loading, error } = useOpenAIProxy();

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMessage: ChatMessage = { role: 'user', content: input };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');

        const request: ChatCompletionRequest = {
            deployment: deployment,
            messages: newMessages,
            max_tokens: 150,
            temperature: 0.7,
        };

        const response = await chatCompletion(request);
        
        if (response && response.choices && response.choices.length > 0) {
            const assistantMessage = response.choices[0].message;
            setMessages(prev => [...prev, assistantMessage]);
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
            <h3>OpenAI Chat via Proxy</h3>
            
            <div style={{ marginBottom: '10px' }}>
                <label htmlFor="deployment">Deployment: </label>
                <input
                    id="deployment"
                    type="text"
                    value={deployment}
                    onChange={(e) => setDeployment(e.target.value)}
                    placeholder="e.g., gpt-35-turbo, gpt-4, gpt-4o-mini, gpt-5-chat"
                    style={{ marginLeft: '10px', padding: '5px' }}
                />
            </div>

            <div style={{ 
                height: '400px', 
                overflowY: 'auto', 
                border: '1px solid #ccc', 
                padding: '10px', 
                marginBottom: '10px',
                backgroundColor: '#f9f9f9'
            }}>
                {messages.map((message, index) => (
                    <div key={index} style={{ 
                        marginBottom: '10px',
                        padding: '8px',
                        backgroundColor: message.role === 'user' ? '#e3f2fd' : '#f1f8e9',
                        borderRadius: '5px'
                    }}>
                        <strong>{message.role}:</strong> {message.content}
                    </div>
                ))}
                {loading && (
                    <div style={{ 
                        padding: '8px',
                        backgroundColor: '#fff3e0',
                        borderRadius: '5px',
                        fontStyle: 'italic'
                    }}>
                        Assistant is typing...
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !loading && sendMessage()}
                    placeholder="Type your message..."
                    style={{ 
                        flex: 1, 
                        padding: '10px',
                        fontSize: '14px'
                    }}
                    disabled={loading}
                />
                <button 
                    onClick={sendMessage} 
                    disabled={loading || !input.trim()}
                    style={{ 
                        padding: '10px 20px',
                        fontSize: '14px',
                        backgroundColor: loading ? '#ccc' : '#2196f3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                >
                    Send
                </button>
            </div>

            {error && (
                <div style={{ 
                    color: 'red', 
                    marginTop: '10px',
                    padding: '10px',
                    backgroundColor: '#ffebee',
                    borderRadius: '5px'
                }}>
                    Error: {error}
                </div>
            )}
        </div>
    );
}

// Simple usage example
export function SimpleOpenAIExample() {
    const [response, setResponse] = useState<string>('');
    const { chatCompletion, loading, error } = useOpenAIProxy();

    const askQuestion = async () => {
        const result = await chatCompletion({
            deployment: 'gpt-4o-mini', // Replace with your deployment name
            messages: [
                { role: 'user', content: 'What is the capital of France?' }
            ],
            max_tokens: 50,
        });

        if (result && result.choices && result.choices.length > 0) {
            setResponse(result.choices[0].message.content);
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <h3>Simple OpenAI Query</h3>
            <button onClick={askQuestion} disabled={loading}>
                {loading ? 'Loading...' : 'Ask Question'}
            </button>
            {response && (
                <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f0f0f0' }}>
                    <strong>Response:</strong> {response}
                </div>
            )}
            {error && (
                <div style={{ color: 'red', marginTop: '10px' }}>
                    Error: {error}
                </div>
            )}
        </div>
    );
}