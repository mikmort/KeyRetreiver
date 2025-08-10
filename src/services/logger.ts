/**
 * Structured logger for Azure OpenAI proxy
 * Provides logging without exposing sensitive user data
 */

import { InvocationContext } from '@azure/functions';

export interface LogFields {
    userId?: string;
    requestId?: string;
    elapsedMs?: number;
    aoaiStatus?: number;
    retryCount?: number;
    rateLimited?: boolean;
    semaphoreWaitMs?: number;
    messageCount?: number;
    totalTokens?: number;
    errorType?: string;
    [key: string]: any;
}

export class Logger {
    constructor(private context?: InvocationContext) {}

    info(message: string, fields?: LogFields): void {
        this.log('INFO', message, fields);
    }

    warn(message: string, fields?: LogFields): void {
        this.log('WARN', message, fields);
    }

    error(message: string, fields?: LogFields): void {
        this.log('ERROR', message, fields);
    }

    private log(level: string, message: string, fields?: LogFields): void {
        const logEntry = {
            level,
            message,
            timestamp: new Date().toISOString(),
            ...this.sanitizeFields(fields || {})
        };

        const logMessage = `[${level}] ${message} ${JSON.stringify(logEntry)}`;
        
        if (this.context) {
            this.context.log(logMessage);
        } else {
            console.log(logMessage);
        }
    }

    /**
     * Sanitize fields to prevent logging sensitive data
     */
    private sanitizeFields(fields: LogFields): LogFields {
        const sanitized = { ...fields };
        
        // Remove or hash any potentially sensitive fields
        if (sanitized.apiKey) {
            sanitized.apiKey = '[REDACTED]';
        }
        
        if (sanitized.messages) {
            // Don't log message content, only metadata
            delete sanitized.messages;
        }
        
        if (sanitized.content) {
            // Don't log content, only length
            delete sanitized.content;
        }

        return sanitized;
    }
}

/**
 * Create a hash for request deduplication without exposing content
 */
export function createContentHash(content: any): string {
    // Simple hash function - in production might want crypto.createHash
    const str = typeof content === 'string' ? content : JSON.stringify(content);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
}