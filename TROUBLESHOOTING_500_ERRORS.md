# Troubleshooting 500 Internal Server Errors

This guide helps resolve 500 Internal Server Errors when calling the KeyRetriever Azure Function.

## Quick Diagnostics

1. **Check the diagnostics endpoint** to see your current configuration:
   ```
   https://your-function-app.azurewebsites.net/api/diagnostics
   ```

2. **Test your main endpoint**:
   ```
   https://your-function-app.azurewebsites.net/api/openai/config
   ```

## Common Error Messages and Solutions

### "Required environment variables are missing"

**Cause**: `AZURE_OPENAI_ENDPOINT` and `AZURE_OPENAI_API_KEY` are not set in the Function App.

**Solution**: 
1. Go to Azure Portal → Your Function App → Configuration
2. Add these application settings:
   - `AZURE_OPENAI_ENDPOINT` = `https://your-openai-instance.openai.azure.com/`
   - `AZURE_OPENAI_API_KEY` = `your-actual-api-key`
3. Save and restart the Function App

### "Key Vault access failed and environment variables are not configured"

**Cause**: Key Vault is configured but the Function App can't access it, and environment variables are also missing.

**Solutions**: 
1. **Fix Key Vault Access**:
   - Ensure the Function App has a System-assigned managed identity enabled
   - Give the managed identity "Get" permissions on Key Vault secrets
   - Verify `KEY_VAULT_URL` is correct

2. **Or Use Environment Variables Instead**:
   - Set `AZURE_OPENAI_ENDPOINT` and `AZURE_OPENAI_API_KEY` in Function App configuration
   - Remove `KEY_VAULT_URL` to use environment variables only

## Testing with PowerShell

```powershell
# Test diagnostics endpoint
Invoke-WebRequest -Uri 'https://your-function-app.azurewebsites.net/api/diagnostics' -Method GET

# Test main endpoint
Invoke-WebRequest -Uri 'https://your-function-app.azurewebsites.net/api/openai/config' -Method GET
```

## Verification Steps

After making configuration changes:

1. **Restart the Function App** in Azure Portal
2. **Wait 2-3 minutes** for the restart to complete
3. **Test the diagnostics endpoint** to verify environment variables show as "SET"
4. **Test the main endpoint** to verify it returns a successful response

## Expected Successful Response

```json
{
  "success": true,
  "data": {
    "endpoint": "https://your-openai-instance.openai.azure.com/",
    "apiKey": "your-api-key"
  }
}
```

If you continue to experience 500 errors after following these steps, check the Function App logs in Azure Portal under Monitoring → Log stream.