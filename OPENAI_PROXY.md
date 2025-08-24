# OpenAI Proxy Function

This document provides detailed information about the OpenAI proxy function that was added to the KeyRetriever Azure Function App.

## Overview

The OpenAI proxy function (`/api/openai/chat/completions`) acts as a secure intermediary between your React application and Azure OpenAI. Instead of exposing API credentials to the client, all OpenAI requests are processed through this Azure Function with built-in resilience features including rate limiting, retry logic, and concurrency control.

## Function Details

- **Route**: `POST /api/openai/chat/completions`
- **Authentication**: Anonymous (but with CORS restrictions)
- **Location**: `src/functions/openaiProxy.ts`
- **Service**: `src/services/openAIService.ts`

## Resilience Features

### Rate Limiting
- **Global Rate Limit**: 8 requests per second across all users (configurable via `RATE_LIMIT_GLOBAL_RPS`)
- **Per-User Rate Limit**: 2 requests per second per user (configurable via `RATE_LIMIT_USER_RPS`)
- Uses token bucket algorithm with automatic refill
- Returns `429 Too Many Requests` with `Retry-After: 2` header when limits exceeded

### Retry Logic with Exponential Backoff
- **Automatic Retries**: Up to 6 retries for 429 (rate limit) and 5xx errors (configurable via `AOAI_MAX_RETRIES`)
- **Exponential Backoff**: Starts at 500ms, doubles each retry up to 15s max (configurable)
- **Jitter**: Adds 0-250ms random delay to prevent thundering herd
- **Retry-After Header**: Honors Azure OpenAI's suggested retry delay when provided
- **Smart Error Handling**: Non-retryable errors (400, 401, 403, 404) fail immediately

### Concurrency Control
- **Semaphore**: Limits parallel Azure OpenAI calls per instance to 8 (configurable via `MAX_PARALLEL_AOAI`)
- **Queueing**: Excess requests wait in FIFO queue until slots available
- **Connection Reuse**: HTTP keep-alive agent reduces connection overhead

### Input Validation
- **Request Sanitization**: Validates and cleans all incoming requests
- **Parameter Limits**: Enforces reasonable limits on message count, length, and parameters
- **Security**: Strips potentially harmful fields and prevents injection attacks

### Structured Logging
- **Request Tracking**: Each request gets a unique ID for tracing
- **Privacy**: Never logs user message content, only metadata (count, tokens, hashes)
- **Performance Metrics**: Tracks retry counts, wait times, and response times
- **Security**: API keys and sensitive data are never logged

### Idempotency Support
- **Idempotency Keys**: Accepts `Idempotency-Key` header for duplicate request protection
- **Response Caching**: Caches successful responses for 5 minutes
- **Automatic Cleanup**: Prevents memory leaks with periodic cache cleanup

## Request Format

```typescript
POST /api/openai/chat/completions
Content-Type: application/json
Idempotency-Key: optional-unique-key
x-user-id: optional-user-identifier

{
  "deployment": "your-deployment-name",  // Required: Azure OpenAI deployment name
  "messages": [                          // Required: Array of chat messages
    {
      "role": "user",
      "content": "Hello, world!"
    }
  ],
  "max_tokens": 150,                     // Optional: Maximum tokens to generate
  "temperature": 0.7,                    // Optional: Sampling temperature (0-2)
  "top_p": 1,                           // Optional: Nucleus sampling parameter
  "frequency_penalty": 0,               // Optional: Frequency penalty (-2 to 2)
  "presence_penalty": 0,                // Optional: Presence penalty (-2 to 2)
  "stop": ["\\n"]                       // Optional: Stop sequences
}
```

## Supported Deployments

The proxy supports any Azure OpenAI deployment name. Common examples include:

```typescript
// GPT-4 models
{
  "deployment": "gpt-4",
  "messages": [{"role": "user", "content": "Hello"}]
}

// GPT-4 Omni Mini (cost-efficient)
{
  "deployment": "gpt-4o-mini", 
  "messages": [{"role": "user", "content": "Hello"}]
}

// GPT-5 Chat (latest model)
{
  "deployment": "gpt-5-chat",
  "messages": [{"role": "user", "content": "Hello"}]
}

// Legacy GPT-3.5 Turbo
{
  "deployment": "gpt-35-turbo",
  "messages": [{"role": "user", "content": "Hello"}]
}
```

> **Note**: The actual deployment names depend on how you've named your deployments in Azure OpenAI Studio. These are examples of common deployment naming patterns.

## Response Format

### Success Response
```typescript
{
  "success": true,
  "data": {
    "id": "chatcmpl-123",
    "object": "chat.completion",
    "created": 1677652288,
    "model": "gpt-5-chat",
    "choices": [
      {
        "index": 0,
        "message": {
          "role": "assistant",
          "content": "Hello! How can I help you today?"
        },
        "finish_reason": "stop"
      }
    ],
    "usage": {
      "prompt_tokens": 9,
      "completion_tokens": 12,
      "total_tokens": 21
    }
  }
}
```

### Rate Limit Response
```typescript
HTTP 429 Too Many Requests
Retry-After: 2

{
  "success": false,
  "error": "Rate limit exceeded. Try again later."
}
```

### Upstream Throttling Response
```typescript
HTTP 429 Too Many Requests
Retry-After: 5

{
  "success": false,
  "error": "Upstream service is temporarily unavailable. Please try again later."
}
```

### Error Response
```typescript
{
  "success": false,
  "error": "Error message",
  "detail": "Additional error context (when applicable)"
}
```

## Configuration

The proxy uses comprehensive configuration options for resilience and performance:

### Environment Variables

#### Basic Configuration
- `AZURE_OPENAI_ENDPOINT`: Your Azure OpenAI endpoint URL
- `AZURE_OPENAI_API_KEY`: API key (for development)
- `KEY_VAULT_URL`: Azure Key Vault URL (for production)
- `AZURE_OPENAI_API_KEY_SECRET_NAME`: Secret name in Key Vault (default: "azure-openai-api-key")
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins for CORS

#### Rate Limiting Configuration
- `RATE_LIMIT_GLOBAL_RPS`: Global requests per second limit (default: 8)
- `RATE_LIMIT_USER_RPS`: Per-user requests per second limit (default: 2)

#### Concurrency Configuration
- `MAX_PARALLEL_AOAI`: Maximum parallel Azure OpenAI calls (default: 8)

#### Retry Configuration
- `AOAI_MAX_RETRIES`: Maximum retry attempts (default: 6)
- `AOAI_BASE_DELAY_MS`: Initial retry delay in milliseconds (default: 500)
- `AOAI_MAX_DELAY_MS`: Maximum retry delay in milliseconds (default: 15000)

## Usage Examples

### React Hook (TypeScript) with Error Handling
```typescript
import { useState } from 'react';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export function useOpenAIProxy() {
  const [loading, setLoading] = useState(false);
  
  const chatCompletion = async (
    messages: ChatMessage[], 
    deployment: string = 'gpt-4o-mini',
    userId?: string
  ) => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Add user ID for rate limiting
      if (userId) {
        headers['x-user-id'] = userId;
      }
      
      // Add idempotency key for duplicate protection
      headers['Idempotency-Key'] = `${Date.now()}-${Math.random()}`;
      
      const response = await fetch('/api/openai/chat/completions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          deployment,
          messages,
          max_tokens: 150,
        }),
      });
      
      const result = await response.json();
      
      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        throw new Error(`Rate limited. Retry after ${retryAfter} seconds.`);
      }
      
      return result.success ? result.data : null;
    } finally {
      setLoading(false);
    }
  };
  
  return { chatCompletion, loading };
}
```

### JavaScript Fetch with Retry Logic
```javascript
async function callOpenAI(message, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('/api/openai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'your-user-id', // For rate limiting
        },
        body: JSON.stringify({
          deployment: 'gpt-5-chat',
          messages: [
            { role: 'user', content: message }
          ],
          max_tokens: 150,
          temperature: 0.7,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        return result.data.choices[0].message.content;
      }
      
      // Handle rate limiting with exponential backoff
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '2');
        if (attempt < maxRetries) {
          console.log(`Rate limited, retrying in ${retryAfter} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          continue;
        }
      }
      
      throw new Error(result.error || 'Unknown error');
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      // Exponential backoff for network errors
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

## Security Features

1. **Credential Protection**: API keys never leave the Azure Function
2. **CORS Validation**: Only allowed origins can make requests
3. **Request Validation**: Input is validated and sanitized before forwarding to OpenAI
4. **Error Sanitization**: Sensitive information is not exposed in error messages
5. **Rate Limiting**: Protects against abuse and quota exhaustion
6. **Logging Privacy**: User messages are never logged, only metadata

## Monitoring and Diagnostics

### Diagnostics Endpoint
Access `/api/diagnostics` to see:
- Configuration status
- Rate limiter statistics (active buckets, tokens available)
- Concurrency status (available permits, queue length)
- Environment variable status

### Log Fields
The proxy logs structured information for monitoring:
- Request ID for tracing
- User ID (anonymized)
- Performance metrics (elapsed time, retry count)
- Error details (without sensitive data)
- Rate limiting events
- Concurrency wait times

## Deployment

The proxy function is deployed automatically when you deploy the Azure Function App:

```bash
func azure functionapp publish your-function-app-name
```

For production deployments, ensure proper configuration of:
- Key Vault access for API key storage
- Rate limiting parameters based on your Azure OpenAI quota
- CORS origins for your client applications
- Monitoring and alerting on function logs

## Testing

You can test the proxy function locally by:

1. Setting up local environment variables in `local.settings.json`
2. Running `npm start` (requires Azure Functions Core Tools)
3. Making POST requests to `http://localhost:7071/api/openai/chat/completions`

For production testing:
- Monitor rate limiting behavior under load
- Verify retry logic with Azure OpenAI quota limits
- Test CORS configuration with your client applications
- Validate error handling for various failure scenarios

## Troubleshooting

### Common Issues

1. **"Deployment name is required"**: Make sure to include the `deployment` field in your request body
2. **Rate limit exceeded**: Check your request frequency and consider implementing client-side rate limiting
3. **CORS errors**: Verify your origin is in the `ALLOWED_ORIGINS` environment variable
4. **OpenAI API errors**: Check your Azure OpenAI endpoint and API key configuration
5. **Key Vault access**: Ensure the Function App's managed identity has access to Key Vault secrets
6. **Upstream throttling**: Azure OpenAI quota exceeded - requests will retry automatically with backoff

### Error Status Codes

- **400**: Invalid request (missing fields, validation errors)
- **403**: CORS violation (origin not allowed)
- **429**: Rate limited (either client-side or upstream Azure OpenAI throttling)
- **500**: Internal server error
- **502**: Bad gateway (invalid response from Azure OpenAI)

### Debugging

Check the Azure Function logs for detailed error information. The function logs:
- All requests with unique IDs
- Rate limiting events
- Retry attempts and delays
- Performance metrics
- Error details (sanitized)

Example log search queries:
- Find rate limiting: `"Rate limit exceeded"`
- Track request: `requestId:"your-request-id"`
- Monitor retries: `"AOAI attempt"`
- Check performance: `elapsedMs > 5000`