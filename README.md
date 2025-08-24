# KeyRetriever - Azure Function for OpenAI Secrets

This Azure Function provides a secure way to retrieve Azure OpenAI secrets for your React application. It supports both Azure Key Vault for production and environment variables for development.

## Features

- ✅ **OpenAI Proxy**: Secure proxy for Azure OpenAI API calls
- ✅ **Secret Management**: Secure secret retrieval from Azure Key Vault 
- ✅ Fallback to environment variables for local development
- ✅ CORS support for React applications
- ✅ TypeScript support
- ✅ Error handling and logging
- ✅ Managed identity authentication

## Project Structure

```
KeyRetriever/
├── src/
│   ├── functions/
│   │   ├── getOpenAISecrets.ts      # Get OpenAI credentials (legacy)
│   │   ├── openaiProxy.ts           # NEW: OpenAI API proxy
│   │   └── diagnostics.ts           # Health check function
│   ├── services/
│   │   ├── keyVaultService.ts       # Key Vault helper service
│   │   └── openAIService.ts         # NEW: OpenAI API service
│   └── types/
│       └── index.ts                 # TypeScript interfaces
├── examples/
│   ├── reactClient.tsx              # React client example (legacy)
│   └── reactClientProxy.tsx         # NEW: React client for proxy
├── scripts/
│   └── deploy.ps1                   # Deployment script
├── host.json                        # Azure Functions host configuration
├── local.settings.json              # Local development settings
├── package.json                     # Node.js dependencies
└── tsconfig.json                    # TypeScript configuration
```

## Setup Instructions

### Prerequisites

1. Azure CLI installed and logged in
2. Node.js 18+ installed
3. Azure Functions Core Tools v4
4. An Azure subscription

### Local Development Setup

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Configure local settings**:
   Update `local.settings.json` with your values:
   ```json
   {
     "IsEncrypted": false,
     "Values": {
       "AzureWebJobsStorage": "UseDevelopmentStorage=true",
       "FUNCTIONS_WORKER_RUNTIME": "node",
       "AZURE_OPENAI_ENDPOINT": "https://your-openai-instance.openai.azure.com/",
       "AZURE_OPENAI_API_KEY": "your-api-key-for-development",
       "ALLOWED_ORIGINS": "http://localhost:3000,https://your-react-app.com"
     }
   }
   ```

3. **Build and start locally**:
   ```bash
   npm run build
   npm start
   ```

   The function will be available at: `http://localhost:7071/api/openai/config`

### Azure Deployment

1. **Run the deployment script**:
   ```powershell
   .\scripts\deploy.ps1
   ```

2. **Add your OpenAI API key to Key Vault**:
   ```bash
   az keyvault secret set --vault-name your-keyvault-name --name azure-openai-api-key --value your-actual-api-key
   ```

3. **Deploy the function code**:
   ```bash
   func azure functionapp publish your-function-app-name
   ```

## API Endpoints

### POST /api/openai/chat/completions (NEW)

**OpenAI Proxy Endpoint** - Makes Azure OpenAI API calls on behalf of your React app, keeping credentials secure.

**Request Body**:
```json
{
  "deployment": "gpt-4o-mini",
  "messages": [
    { "role": "user", "content": "Hello, world!" }
  ],
  "max_tokens": 150,
  "temperature": 0.7
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "chatcmpl-123",
    "object": "chat.completion", 
    "created": 1677652288,
    "model": "gpt-4o-mini",
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

**Supported Deployments**: The proxy supports any Azure OpenAI deployment name including `gpt-4`, `gpt-4o-mini`, `gpt-5-chat`, and `gpt-35-turbo`. Use the deployment name as configured in your Azure OpenAI Studio.

### GET /api/openai/config (Legacy)

Returns the Azure OpenAI configuration for direct client usage. **Use the proxy endpoint above for better security.**

Returns the Azure OpenAI configuration for your React app.

**Response**:
```json
{
  "success": true,
  "data": {
    "endpoint": "https://your-openai-instance.openai.azure.com/",
    "apiKey": "your-api-key"
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Error message"
}
```

## React Client Usage

### Using the Proxy (Recommended)

See `examples/reactClientProxy.tsx` for a complete example. Basic usage:

```typescript
import { useOpenAIProxy } from './useOpenAIProxy';

function MyComponent() {
  const { chatCompletion, loading, error } = useOpenAIProxy();
  
  const handleSendMessage = async () => {
    const response = await chatCompletion({
      deployment: 'gpt-4o-mini', // Your Azure OpenAI deployment name
      messages: [{ role: 'user', content: 'Hello!' }],
      max_tokens: 150,
    });
    
    if (response) {
      console.log(response.choices[0].message.content);
    }
  };
  
  return (
    <button onClick={handleSendMessage} disabled={loading}>
      {loading ? 'Sending...' : 'Send Message'}
    </button>
  );
}
```

### Using Direct Credentials (Legacy)

See `examples/reactClient.tsx` for a complete example. Basic usage:

```typescript
import { useOpenAIConfig } from './useOpenAIConfig';

function MyComponent() {
  const { config, loading, error } = useOpenAIConfig();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  // Use config.endpoint and config.apiKey with your OpenAI client
  return <div>Ready to use OpenAI!</div>;
}
```

## Environment Variables

### Required for Production
- `KEY_VAULT_URL`: URL of your Azure Key Vault
- `AZURE_OPENAI_ENDPOINT`: Your Azure OpenAI endpoint
- `AZURE_OPENAI_API_KEY_SECRET_NAME`: Name of the secret in Key Vault (default: "azure-openai-api-key")

### Required for Development
- `AZURE_OPENAI_ENDPOINT`: Your Azure OpenAI endpoint  
- `AZURE_OPENAI_API_KEY`: Your Azure OpenAI API key

### Optional
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins for CORS (default: "http://localhost:3000")

**Note**: Both the proxy and legacy endpoints use the same configuration.

## Why Use the Proxy?

The OpenAI proxy function (`/api/openai/chat/completions`) provides several advantages over direct API calls:

### 🔒 **Enhanced Security**
- API keys never leave the Azure Function
- No sensitive credentials in client-side code
- Reduced risk of key exposure

### 🎯 **Better Control** 
- Centralized request/response logging
- Easy to implement rate limiting
- Request validation and sanitization

### 🌐 **Simplified CORS**
- CORS handled by Azure Function
- No need for complex client-side configurations

### 🔧 **Easier Maintenance**
- Update API versions in one place
- Centralized error handling
- Simplified client code

## Security Considerations

- The function uses Azure Managed Identity to access Key Vault
- CORS is configured to only allow specified origins
- API keys are never logged or exposed in error messages
- The function supports both development (env vars) and production (Key Vault) scenarios

## Troubleshooting

1. **CORS errors**: Make sure your React app's URL is in the `ALLOWED_ORIGINS` setting
2. **Key Vault access denied**: Verify the Function App's managed identity has "Get" permissions on Key Vault secrets
3. **Module not found errors**: Run `npm install` and `npm run build`
4. **Local development issues**: Check that `local.settings.json` has the correct values

## Development Commands

- `npm run build` - Build TypeScript
- `npm run watch` - Watch for changes and rebuild
- `npm start` - Start the function locally
- `func azure functionapp publish <app-name>` - Deploy to Azure
