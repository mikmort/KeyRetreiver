# Azure Function App Configuration and Deployment Guide

## Your Function App Details
- **Name**: MortonGroupAICred
- **URL**: https://mortongroupaicred-hugxh8drhqabbphb.canadacentral-01.azurewebsites.net
- **Resource Group**: MoMoney_group
- **Location**: Canada Central

## Step 1: Configure Environment Variables in Azure Portal

Go to the Azure Portal and navigate to your Function App "MortonGroupAICred", then:

1. Go to **Configuration** → **Application settings**
2. Add these settings:

### Required Settings:
```
FUNCTIONS_WORKER_RUNTIME = node
WEBSITE_NODE_DEFAULT_VERSION = ~18
AZURE_OPENAI_ENDPOINT = https://your-openai-instance.openai.azure.com/
AZURE_OPENAI_API_KEY = your-actual-api-key
```

### Optional Settings (for Key Vault - Production):
```
KEY_VAULT_URL = https://your-keyvault.vault.azure.net/
AZURE_OPENAI_API_KEY_SECRET_NAME = azure-openai-api-key
```

## Step 2: Enable System-Assigned Managed Identity (for Key Vault)

1. Go to **Identity** in your Function App
2. Turn **On** the System assigned identity
3. Copy the Object (principal) ID for the next step

## Step 3: Configure Key Vault Access (Optional - for Production)

If you want to use Key Vault:

1. Create an Azure Key Vault in the same resource group
2. Go to the Key Vault → **Access policies**
3. Add access policy:
   - Secret permissions: **Get**
   - Select principal: Use the Object ID from Step 2
4. Add your OpenAI API key as a secret named "azure-openai-api-key"

## Step 4: Test Your Function

After configuration, your function will be available at:
```
https://mortongroupaicred-hugxh8drhqabbphb.canadacentral-01.azurewebsites.net/api/openai/config
```

Test it by making a GET request to this URL.

## Step 5: GitHub Actions Deployment (Automatic)

Your repository already has a GitHub Actions workflow file. Every time you push to main, it will automatically deploy your function.

To see the workflow:
1. Go to your GitHub repository
2. Click the **Actions** tab
3. You should see the deployment workflow running

## Step 6: Update Your React App

In your React app, use this URL to fetch the OpenAI configuration:

```typescript
const AZURE_FUNCTION_URL = 'https://mortongroupaicred-hugxh8drhqabbphb.canadacentral-01.azurewebsites.net/api/openai/config';

// Use the useOpenAIConfig hook from examples/reactClient.tsx
const { config, loading, error } = useOpenAIConfig();
```

## Troubleshooting

### Error: "Failed to retrieve OpenAI configuration"

This error indicates configuration issues. The improved error messages now provide specific guidance:

**"Required environment variables are missing"**: Environment variables are not set in the Function App.

**"Key Vault access failed and environment variables are not configured"**: Both Key Vault and environment variable access failed.

Follow these steps to resolve:

1. **Check Environment Variables**: Visit the diagnostics endpoint to see what's configured:
   ```
   https://mortongroupaicred-hugxh8drhqabbphb.canadacentral-01.azurewebsites.net/api/diagnostics
   ```

2. **Verify Required Settings**: In Azure Portal → Function App → Configuration, ensure these are set:
   - `AZURE_OPENAI_ENDPOINT` = your actual Azure OpenAI endpoint
   - `AZURE_OPENAI_API_KEY` = your actual API key
   - `FUNCTIONS_WORKER_RUNTIME` = node

3. **Common Issues**:
   - Missing environment variables (most common cause)
   - Incorrect Azure OpenAI endpoint format
   - Invalid API key
   - Function app not restarted after configuration changes

### Other Common Issues:

1. **CORS Issues**: Configure CORS settings in the Azure Function App portal under API → CORS
2. **404 Errors**: Ensure the GitHub Actions deployment completed successfully
3. **Authentication Errors**: Check that your Azure OpenAI endpoint and API key are correct
4. **Key Vault Issues**: Verify the managed identity has proper permissions

## Manual Deployment (Alternative)

If GitHub Actions isn't working, you can deploy manually:

1. Install Azure Functions Core Tools: `npm install -g azure-functions-core-tools@4`
2. Build the project: `npm run build`
3. Deploy: `func azure functionapp publish MortonGroupAICred`

Your function is now ready to securely provide OpenAI credentials to your React application!
