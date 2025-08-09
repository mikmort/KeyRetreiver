# OpenAI Proxy Function

This document provides detailed information about the OpenAI proxy function that was added to the KeyRetriever Azure Function App.

## Overview

The OpenAI proxy function (`/api/openai/chat/completions`) acts as a secure intermediary between your React application and Azure OpenAI. Instead of exposing API credentials to the client, all OpenAI requests are processed through this Azure Function.

## Function Details

- **Route**: `POST /api/openai/chat/completions`
- **Authentication**: Anonymous (but with CORS restrictions)
- **Location**: `src/functions/openaiProxy.ts`
- **Service**: `src/services/openAIService.ts`

## Request Format

```typescript
POST /api/openai/chat/completions
Content-Type: application/json

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

## Response Format

### Success Response
```typescript
{
  "success": true,
  "data": {
    "id": "chatcmpl-123",
    "object": "chat.completion",
    "created": 1677652288,
    "model": "gpt-35-turbo",
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

### Error Response
```typescript
{
  "success": false,
  "error": "Error message"
}
```

## Configuration

The proxy uses the same configuration as the existing secrets function:

### Environment Variables
- `AZURE_OPENAI_ENDPOINT`: Your Azure OpenAI endpoint URL
- `AZURE_OPENAI_API_KEY`: API key (for development)
- `KEY_VAULT_URL`: Key Vault URL (for production)
- `AZURE_OPENAI_API_KEY_SECRET_NAME`: Secret name in Key Vault (default: "azure-openai-api-key")
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins for CORS

## Usage Examples

### React Hook (TypeScript)
```typescript
import { useState } from 'react';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export function useOpenAIProxy() {
  const [loading, setLoading] = useState(false);
  
  const chatCompletion = async (messages: ChatMessage[], deployment: string = 'gpt-35-turbo') => {
    setLoading(true);
    try {
      const response = await fetch('/api/openai/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deployment,
          messages,
          max_tokens: 150,
        }),
      });
      
      const result = await response.json();
      return result.success ? result.data : null;
    } finally {
      setLoading(false);
    }
  };
  
  return { chatCompletion, loading };
}
```

### JavaScript Fetch
```javascript
async function callOpenAI(message) {
  const response = await fetch('/api/openai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      deployment: 'gpt-35-turbo',
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
  } else {
    throw new Error(result.error);
  }
}
```

## Security Features

1. **Credential Protection**: API keys never leave the Azure Function
2. **CORS Validation**: Only allowed origins can make requests
3. **Request Validation**: Input is validated before forwarding to OpenAI
4. **Error Sanitization**: Sensitive information is not exposed in error messages

## Deployment

The proxy function is deployed automatically when you deploy the Azure Function App:

```bash
func azure functionapp publish your-function-app-name
```

## Testing

You can test the proxy function locally by:

1. Setting up local environment variables in `local.settings.json`
2. Running `npm start` (requires Azure Functions Core Tools)
3. Making POST requests to `http://localhost:7071/api/openai/chat/completions`

## Troubleshooting

### Common Issues

1. **"Deployment name is required"**: Make sure to include the `deployment` field in your request body
2. **CORS errors**: Verify your origin is in the `ALLOWED_ORIGINS` environment variable
3. **OpenAI API errors**: Check your Azure OpenAI endpoint and API key configuration
4. **Key Vault access**: Ensure the Function App's managed identity has access to Key Vault secrets

### Debugging

Check the Azure Function logs for detailed error information. The function logs all requests and important operations.