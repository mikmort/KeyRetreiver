import https from 'https';
import { OpenAIConfig, ChatCompletionRequest, ChatCompletionResponse } from '../types';
import { Logger } from './logger';

export interface RetryConfig {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
}

export interface AOAIError extends Error {
    status?: number;
    retryAfter?: number;
    isRetryable?: boolean;
}

export class OpenAIService {
    private config: OpenAIConfig;
    private retryConfig: RetryConfig;
    private logger: Logger;
    
    // Shared HTTP agent for connection reuse
    private static agent = new https.Agent({
        keepAlive: true,
        maxSockets: 64,
        timeout: 30000,
        keepAliveMsecs: 30000
    });

    constructor(config: OpenAIConfig, logger?: Logger) {
        this.config = config;
        this.logger = logger || new Logger();
        
        this.retryConfig = {
            maxRetries: Number(process.env.AOAI_MAX_RETRIES || 6),
            baseDelayMs: Number(process.env.AOAI_BASE_DELAY_MS || 500),
            maxDelayMs: Number(process.env.AOAI_MAX_DELAY_MS || 15000)
        };
    }

    async chatCompletion(request: ChatCompletionRequest, deployment: string, requestId?: string): Promise<ChatCompletionResponse> {
        const apiVersion = this.config.apiVersion || '2024-02-15-preview';
        const url = `${this.config.endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

        let delay = this.retryConfig.baseDelayMs;
        let lastError: AOAIError | null = null;

        for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
            try {
                this.logger.info(`AOAI attempt ${attempt}`, {
                    requestId,
                    attempt,
                    deployment,
                    messageCount: request.messages.length,
                    maxTokens: request.max_tokens
                });

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'api-key': this.config.apiKey,
                        'User-Agent': 'KeyRetriever-Proxy/1.0'
                    },
                    body: JSON.stringify(request),
                    // @ts-ignore - Node.js fetch agent support
                    agent: OpenAIService.agent
                });

                // Success case
                if (response.ok) {
                    const result = await response.json() as ChatCompletionResponse;
                    
                    this.logger.info(`AOAI success`, {
                        requestId,
                        attempt,
                        status: response.status,
                        totalTokens: result.usage?.total_tokens
                    });
                    
                    return result;
                }

                // Error case - determine if retryable
                const status = response.status;
                const retryAfterHeader = response.headers.get('retry-after');
                const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader) : undefined;
                
                let errorText: string;
                try {
                    errorText = await response.text();
                } catch {
                    errorText = `HTTP ${status}`;
                }

                const error: AOAIError = new Error(`AOAI ${status}: ${errorText.slice(0, 500)}`);
                error.status = status;
                error.retryAfter = retryAfter;
                error.isRetryable = status === 429 || status >= 500;

                this.logger.warn(`AOAI error`, {
                    requestId,
                    attempt,
                    status,
                    retryAfter,
                    isRetryable: error.isRetryable,
                    errorPreview: errorText.slice(0, 200)
                });

                // Non-retryable errors - fail immediately
                if (!error.isRetryable) {
                    throw error;
                }

                lastError = error;

                // If this is the last attempt, don't wait
                if (attempt === this.retryConfig.maxRetries) {
                    break;
                }

                // Calculate delay: honor Retry-After header or use exponential backoff with jitter
                let waitMs: number;
                if (retryAfter) {
                    waitMs = retryAfter * 1000;
                    this.logger.info(`Honoring Retry-After header`, { requestId, waitMs: waitMs });
                } else {
                    // Exponential backoff with jitter
                    const baseWait = Math.min(delay, this.retryConfig.maxDelayMs);
                    const jitter = Math.floor(Math.random() * 250); // 0-250ms jitter
                    waitMs = baseWait + jitter;
                    delay = Math.min(delay * 2, this.retryConfig.maxDelayMs); // Double for next time
                }

                this.logger.info(`Retrying after delay`, {
                    requestId,
                    attempt,
                    nextAttempt: attempt + 1,
                    waitMs
                });

                await this.sleep(waitMs);

            } catch (error: any) {
                // Network errors, parsing errors, etc.
                if (!error.status) {
                    lastError = error;
                    this.logger.error(`AOAI network/parse error`, {
                        requestId,
                        attempt,
                        error: error.message
                    });
                    
                    // For network errors, still retry but with a shorter delay
                    if (attempt < this.retryConfig.maxRetries) {
                        await this.sleep(Math.min(delay, 5000));
                        delay *= 2;
                        continue;
                    }
                }
                
                throw error;
            }
        }

        // All retries exhausted
        this.logger.error(`AOAI retries exhausted`, {
            requestId,
            maxRetries: this.retryConfig.maxRetries,
            lastError: lastError?.message
        });

        throw lastError || new Error('All retries exhausted');
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get configuration for monitoring
     */
    getConfig(): { retryConfig: RetryConfig; agentConfig: any } {
        return {
            retryConfig: this.retryConfig,
            agentConfig: {
                keepAlive: true,
                maxSockets: 64,
                timeout: 30000
            }
        };
    }
}