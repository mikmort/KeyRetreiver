# KeyRetriever - Azure Function for OpenAI Secrets

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

KeyRetriever is a TypeScript Azure Function that provides secure retrieval of Azure OpenAI API credentials for React applications. It uses Azure Key Vault for production secrets and environment variables for development, with automatic fallback between the two approaches.

## Working Effectively

### Bootstrap, Build, and Test the Repository
Run these commands in the repository root in order:

```bash
# Install dependencies - takes ~16 seconds. NEVER CANCEL.
npm install

# Build TypeScript to JavaScript - takes ~2 seconds
npm run build

# Test the functions programmatically (since local function host cannot run due to network restrictions)
# First, set environment variables for testing:
export AZURE_OPENAI_ENDPOINT="https://test-openai-instance.openai.azure.com/"
export AZURE_OPENAI_API_KEY="test-api-key-for-development"

# Test main function
node -e "
const { getOpenAISecrets } = require('./dist/src/functions/getOpenAISecrets');
const mockRequest = { method: 'GET', headers: { get: (name) => name === 'origin' ? 'http://localhost:3000' : null } };
const mockContext = { log: (msg, ...args) => console.log('[Function Log]:', msg, ...args) };
getOpenAISecrets(mockRequest, mockContext).then(result => {
    console.log('Function result:', result);
    if (result.body) console.log('Parsed response:', JSON.parse(result.body));
}).catch(err => console.error('Test failed:', err));
"

# Test diagnostics function
node -e "
const { diagnostics } = require('./dist/src/functions/diagnostics');
const mockRequest = { method: 'GET', headers: { get: () => null } };
const mockContext = { log: (msg, ...args) => console.log('[Function Log]:', msg, ...args) };
diagnostics(mockRequest, mockContext).then(result => {
    console.log('Diagnostics result:', result);
    if (result.body) console.log('Parsed response:', JSON.parse(result.body));
}).catch(err => console.error('Test failed:', err));
"
```

### Testing and Validation
- Always run `npm run build` after making code changes
- **CRITICAL**: You cannot run `func start` locally due to network restrictions (cannot reach cdn.functions.azure.com for extension bundles)
- **VALIDATION ALTERNATIVE**: Use the programmatic testing approach shown above to validate function logic
- Always test both the main endpoint (`getOpenAISecrets`) and diagnostics endpoint after making changes
- Test with different environment variable configurations to ensure proper fallback behavior
- No formal test framework is configured - the npm test command just outputs "No tests yet"

### Local Development Setup
1. **Create local.settings.json** (if it doesn't exist):
   ```json
   {
     "IsEncrypted": false,
     "Values": {
       "AzureWebJobsStorage": "UseDevelopmentStorage=true",
       "FUNCTIONS_WORKER_RUNTIME": "node",
       "AZURE_OPENAI_ENDPOINT": "https://your-openai-instance.openai.azure.com/",
       "AZURE_OPENAI_API_KEY": "your-api-key-for-development"
     }
   }
   ```

2. **Install Azure Functions Core Tools** (if not already installed):
   ```bash
   # Via apt (works in this environment)
   curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | sudo apt-key add -
   echo "deb [arch=amd64] https://packages.microsoft.com/repos/azure-cli/ $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/azure-cli.list
   sudo apt update
   sudo apt install -y azure-functions-core-tools-4
   ```

   **WARNING**: `npm install -g azure-functions-core-tools@4` fails due to network restrictions accessing cdn.functions.azure.com

3. **Try local function host** (will fail in sandboxed environments):
   ```bash
   func start  # FAILS: Cannot reach cdn.functions.azure.com for extension bundles
   ```

### Deployment to Azure

**Automatic Deployment (Recommended)**:
- GitHub Actions automatically deploys on push to main branch
- Workflow files: `.github/workflows/main_mortonapiproxy.yml` and `.github/workflows/main_mortongroupaicred.yml`
- **NEVER CANCEL**: Deployment takes 3-8 minutes. Set timeout to 10+ minutes.

**Manual Deployment**:
```bash
# Deploy function code to existing Azure Function App
func azure functionapp publish <your-function-app-name>

# Or use Azure CLI
az functionapp deployment source config-zip --resource-group <resource-group> --name <function-app> --src deploy.zip
```

**Azure Resource Setup** (use the PowerShell script):
```bash
# Edit scripts/deploy.ps1 with your values first
powershell -File scripts/deploy.ps1
```

## API Endpoints

### GET /api/openai/config
Returns Azure OpenAI configuration for React apps.

**Response Format**:
```json
{
  "success": true,
  "data": {
    "endpoint": "https://your-openai-instance.openai.azure.com/",
    "apiKey": "your-api-key"
  }
}
```

### GET /api/diagnostics
Returns environment diagnostic information.

**Response Format**:
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-08-09T07:55:57.779Z",
    "environment": {
      "AZURE_OPENAI_ENDPOINT": "SET",
      "AZURE_OPENAI_API_KEY": "SET",
      "KEY_VAULT_URL": "NOT SET",
      "FUNCTIONS_WORKER_RUNTIME": "node"
    },
    "nodeVersion": "v20.19.4",
    "platform": "linux"
  }
}
```

## Validation Scenarios

After making changes, always run these validation steps:

1. **Build Validation**:
   ```bash
   npm run build  # Must complete successfully
   ```

2. **Function Logic Validation**:
   ```bash
   # Test main function with environment variables
   export AZURE_OPENAI_ENDPOINT="https://test.openai.azure.com/"
   export AZURE_OPENAI_API_KEY="test-key"
   
   # Run the programmatic tests shown in the bootstrap section
   ```

3. **Key Vault Fallback Validation**:
   ```bash
   # Test without KEY_VAULT_URL (should use environment variables)
   unset KEY_VAULT_URL
   # Run function test - should succeed with fallback
   
   # Test with KEY_VAULT_URL (should try Key Vault, then fallback)
   export KEY_VAULT_URL="https://test-vault.vault.azure.net/"
   # Run function test - should fallback gracefully
   ```

4. **CORS Validation**:
   ```bash
   # Test with different origins in the mock request
   # Verify responses include proper CORS headers
   ```

5. **Error Handling Validation**:
   ```bash
   # Test with missing required environment variables
   unset AZURE_OPENAI_ENDPOINT
   # Run function test - should return proper error response
   ```

## Project Structure

Key files and directories:
```
KeyRetriever/
├── src/
│   ├── functions/
│   │   ├── getOpenAISecrets.ts    # Main API endpoint (/api/openai/config)
│   │   └── diagnostics.ts         # Diagnostics endpoint (/api/diagnostics)
│   ├── services/
│   │   └── keyVaultService.ts     # Key Vault helper (currently unused)
│   └── types/
│       └── index.ts               # TypeScript interfaces
├── examples/
│   └── reactClient.tsx            # React client usage example
├── test/
│   └── testFunction.ts            # Basic function test script
├── scripts/
│   └── deploy.ps1                 # Azure resource deployment script
├── .github/workflows/             # GitHub Actions deployment pipelines
├── host.json                      # Azure Functions host configuration
├── local.settings.json            # Local development settings (create if missing)
├── package.json                   # Dependencies and scripts
└── tsconfig.json                  # TypeScript configuration
```

## Common Issues and Troubleshooting

### Build Issues
- **Error: Cannot find module**: Run `npm install` first
- **TypeScript compilation errors**: Check `tsconfig.json` and fix syntax errors

### Local Development Issues
- **func start fails with network errors**: This is expected in sandboxed environments. Use programmatic testing instead
- **Extension bundle download fails**: Network restrictions prevent downloading from cdn.functions.azure.com
- **Storage emulator connection refused**: Azurite is not running, but this doesn't prevent programmatic testing

### Environment Configuration Issues
- **"Failed to retrieve OpenAI configuration"**: Check that `AZURE_OPENAI_ENDPOINT` and `AZURE_OPENAI_API_KEY` are set
- **Key Vault access denied**: In production, ensure Function App's managed identity has Key Vault Get permissions

### Deployment Issues
- **GitHub Actions deployment fails**: Check that Azure service principal secrets are configured
- **Manual deployment fails**: Verify Azure CLI is logged in and function app exists

## Environment Variables

### Required for Local Development
- `AZURE_OPENAI_ENDPOINT` - Your Azure OpenAI service endpoint
- `AZURE_OPENAI_API_KEY` - Your Azure OpenAI API key

### Optional Configuration
- `KEY_VAULT_URL` - Azure Key Vault URL for production
- `AZURE_OPENAI_API_KEY_SECRET_NAME` - Key Vault secret name (default: "azure-openai-api-key")

### Azure Functions Runtime
- `FUNCTIONS_WORKER_RUNTIME` - Must be "node"
- `AzureWebJobsStorage` - Use "UseDevelopmentStorage=true" for local development

## React Client Integration

See `examples/reactClient.tsx` for complete usage. Basic integration:

```typescript
// Custom hook for fetching configuration
const { config, loading, error } = useOpenAIConfig();

// Use the configuration with Azure OpenAI client
if (config) {
  // config.endpoint and config.apiKey are available
}
```

The React client expects the function to be deployed at `/api/openai/config` endpoint.

## Performance Expectations

- **npm install**: ~16 seconds
- **npm run build**: ~2 seconds
- **Function startup**: ~5-15 seconds (when network access is available)
- **GitHub Actions deployment**: 3-8 minutes - NEVER CANCEL, set timeout to 10+ minutes
- **Manual Azure deployment**: 1-3 minutes - NEVER CANCEL, set timeout to 5+ minutes

Always wait for commands to complete rather than canceling them early.