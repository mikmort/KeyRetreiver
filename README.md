# KeyRetriever - Azure Function for OpenAI Secrets

This Azure Function provides a secure way to retrieve Azure OpenAI secrets for your React application. It supports both Azure Key Vault for production and environment variables for development.

## Features

- ✅ Secure secret retrieval from Azure Key Vault
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
│   │   └── getOpenAISecrets.ts    # Main Azure Function
│   ├── services/
│   │   └── keyVaultService.ts     # Key Vault helper service
│   └── types/
│       └── index.ts               # TypeScript interfaces
├── examples/
│   └── reactClient.tsx            # React client example
├── scripts/
│   └── deploy.ps1                 # Deployment script
├── host.json                      # Azure Functions host configuration
├── local.settings.json            # Local development settings
├── package.json                   # Node.js dependencies
└── tsconfig.json                  # TypeScript configuration
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

### GET /api/openai/config

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