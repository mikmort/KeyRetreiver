import { OpenAIConfig, ChatCompletionRequest, ChatCompletionResponse } from '../types';

export class OpenAIService {
    private config: OpenAIConfig;

    constructor(config: OpenAIConfig) {
        this.config = config;
    }

    async chatCompletion(request: ChatCompletionRequest, deployment: string): Promise<ChatCompletionResponse> {
        const apiVersion = this.config.apiVersion || '2024-02-15-preview';
        const url = `${this.config.endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': this.config.apiKey,
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
        }

        return response.json() as Promise<ChatCompletionResponse>;
    }
}