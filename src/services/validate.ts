/**
 * Input validation for Azure OpenAI proxy requests
 */

import { ChatCompletionRequest, ChatMessage } from '../types';

export interface ValidationResult {
    ok: boolean;
    error?: string;
    sanitizedRequest?: ChatCompletionRequest;
}

export class RequestValidator {
    private static readonly MAX_MESSAGES = Number(process.env.VALIDATION_MAX_MESSAGES || 50);
    private static readonly MAX_MESSAGE_LENGTH = Number(process.env.VALIDATION_MAX_MESSAGE_LENGTH || 4000);
    private static readonly MAX_TOKENS = Number(process.env.VALIDATION_MAX_TOKENS || 4000);

    /**
     * Validate and sanitize a chat completion request
     */
    static validate(requestBody: any): ValidationResult {
        try {
            // Check if body exists
            if (!requestBody || typeof requestBody !== 'object') {
                return { ok: false, error: 'Request body must be a JSON object' };
            }

            // Check required fields
            if (!requestBody.messages || !Array.isArray(requestBody.messages)) {
                return { ok: false, error: 'Messages array is required' };
            }

            if (requestBody.messages.length === 0) {
                return { ok: false, error: 'At least one message is required' };
            }

            if (requestBody.messages.length > this.MAX_MESSAGES) {
                return { ok: false, error: `Too many messages (max: ${this.MAX_MESSAGES})` };
            }

            // Validate messages
            const messages: ChatMessage[] = [];
            for (let i = 0; i < requestBody.messages.length; i++) {
                const msg = requestBody.messages[i];
                
                if (!msg || typeof msg !== 'object') {
                    return { ok: false, error: `Message ${i} must be an object` };
                }

                if (!msg.role || !['system', 'user', 'assistant'].includes(msg.role)) {
                    return { ok: false, error: `Message ${i} must have a valid role (system, user, assistant)` };
                }

                if (!msg.content || typeof msg.content !== 'string') {
                    return { ok: false, error: `Message ${i} must have content as a string` };
                }

                if (msg.content.length > this.MAX_MESSAGE_LENGTH) {
                    return { ok: false, error: `Message ${i} content too long (max: ${this.MAX_MESSAGE_LENGTH})` };
                }

                messages.push({
                    role: msg.role,
                    content: msg.content.trim()
                });
            }

            // Create sanitized request
            const sanitizedRequest: ChatCompletionRequest = {
                messages
            };

            // Validate and add optional parameters
            if (requestBody.max_tokens !== undefined) {
                const maxTokens = Number(requestBody.max_tokens);
                if (isNaN(maxTokens) || maxTokens < 1 || maxTokens > this.MAX_TOKENS) {
                    return { ok: false, error: `max_tokens must be between 1 and ${this.MAX_TOKENS}` };
                }
                sanitizedRequest.max_tokens = maxTokens;
            }

            if (requestBody.temperature !== undefined) {
                const temp = Number(requestBody.temperature);
                if (isNaN(temp) || temp < 0 || temp > 2) {
                    return { ok: false, error: 'temperature must be between 0 and 2' };
                }
                sanitizedRequest.temperature = temp;
            }

            if (requestBody.top_p !== undefined) {
                const topP = Number(requestBody.top_p);
                if (isNaN(topP) || topP < 0 || topP > 1) {
                    return { ok: false, error: 'top_p must be between 0 and 1' };
                }
                sanitizedRequest.top_p = topP;
            }

            if (requestBody.frequency_penalty !== undefined) {
                const fp = Number(requestBody.frequency_penalty);
                if (isNaN(fp) || fp < -2 || fp > 2) {
                    return { ok: false, error: 'frequency_penalty must be between -2 and 2' };
                }
                sanitizedRequest.frequency_penalty = fp;
            }

            if (requestBody.presence_penalty !== undefined) {
                const pp = Number(requestBody.presence_penalty);
                if (isNaN(pp) || pp < -2 || pp > 2) {
                    return { ok: false, error: 'presence_penalty must be between -2 and 2' };
                }
                sanitizedRequest.presence_penalty = pp;
            }

            if (requestBody.stop !== undefined) {
                if (Array.isArray(requestBody.stop)) {
                    if (requestBody.stop.length > 4) {
                        return { ok: false, error: 'stop array cannot have more than 4 sequences' };
                    }
                    sanitizedRequest.stop = requestBody.stop.filter(s => typeof s === 'string' && s.length > 0);
                } else if (typeof requestBody.stop === 'string' && requestBody.stop.length > 0) {
                    sanitizedRequest.stop = requestBody.stop;
                } else {
                    return { ok: false, error: 'stop must be a string or array of strings' };
                }
            }

            // Reject streaming for now as it complicates retry logic
            if (requestBody.stream === true) {
                return { ok: false, error: 'Streaming is not supported through the proxy' };
            }

            return { ok: true, sanitizedRequest };

        } catch (error: any) {
            return { ok: false, error: `Validation error: ${error.message}` };
        }
    }

    /**
     * Extract user ID from request headers for rate limiting
     */
    static extractUserId(headers: any): string {
        // Try different common header names for user identification
        const userId = headers?.get?.('x-user-id') || 
                      headers?.get?.('user-id') ||
                      headers?.get?.('authorization')?.split(' ')[1]?.substring(0, 8) || // First 8 chars of token
                      'anon';
        
        // Sanitize the user ID to prevent issues
        return userId.replace(/[^a-zA-Z0-9-_]/g, '').substring(0, 32) || 'anon';
    }
}