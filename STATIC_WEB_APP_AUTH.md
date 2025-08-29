# Azure Static Web App Authentication Setup

This guide explains how to configure Microsoft Authentication (MSA) for your Azure Static Web App at `https://gentle-moss-087d9321e.1.azurestaticapps.net/`.

## Problem Solved

This configuration fixes the issue where visiting the authentication endpoint (`/.auth/login/aad`) was not working properly for MSA sign-in.

## Files Added/Modified

1. **`staticwebapp.config.json`** - Main configuration file for Azure Static Web App authentication
2. **`DEPLOYMENT_GUIDE.md`** - Updated with correct Static Web App URL in ALLOWED_ORIGINS
3. **`scripts/deploy.ps1`** - Updated with correct Static Web App URL in ALLOWED_ORIGINS

## Configuration Overview

The `staticwebapp.config.json` file configures:

### Authentication Provider
- **Azure Active Directory (AAD)** integration for Microsoft accounts
- Uses OpenID Connect with Microsoft's common endpoint
- Supports both personal Microsoft accounts and work/school accounts

### Route Protection
- `/.auth/*` routes for authentication flow
- `/api/*` routes require authentication 
- All other routes (`/*`) allow anonymous access
- Automatic redirect to login for 401 (unauthorized) responses

### Environment Variables Required

Your Azure Static Web App needs these application settings:

```
AZURE_CLIENT_ID = your-aad-app-client-id
AZURE_CLIENT_SECRET = your-aad-app-client-secret
```

## Azure AD App Registration Setup

To complete the authentication setup, you need to register an application in Azure Active Directory:

### 1. Create Azure AD App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Fill in the details:
   - **Name**: `KeyRetriever Static Web App`
   - **Supported account types**: `Accounts in any organizational directory and personal Microsoft accounts`
   - **Redirect URI**: 
     - Type: `Web`
     - URI: `https://gentle-moss-087d9321e.1.azurestaticapps.net/.auth/login/aad/callback`

### 2. Configure App Registration

After creating the app:

1. **Copy the Application (client) ID** - this is your `AZURE_CLIENT_ID`
2. Go to **Certificates & secrets** > **Client secrets**
3. Click **New client secret**
4. Add description and expiration
5. **Copy the secret value** - this is your `AZURE_CLIENT_SECRET`

### 3. Configure Static Web App Settings

1. Go to your Azure Static Web App in the portal
2. Navigate to **Configuration** > **Application settings**
3. Add the following settings:
   ```
   AZURE_CLIENT_ID = [your-client-id-from-step-2]
   AZURE_CLIENT_SECRET = [your-client-secret-from-step-2]
   ```

## Configure Azure Functions CORS

Your Azure Functions also need to allow the Static Web App origin:

1. Go to your Function App (MortonGroupAICred) in the Azure Portal
2. Navigate to **Configuration** > **Application settings**
3. Update the `ALLOWED_ORIGINS` setting:
   ```
   ALLOWED_ORIGINS = https://gentle-moss-087d9321e.1.azurestaticapps.net,http://localhost:3000
   ```

## Testing the Authentication

After deployment and configuration:

1. **Visit your Static Web App**: `https://gentle-moss-087d9321e.1.azurestaticapps.net/`
2. **Test login URL**: `https://gentle-moss-087d9321e.1.azurestaticapps.net/.auth/login/aad`
3. **Check user info**: `https://gentle-moss-087d9321e.1.azurestaticapps.net/.auth/me` (after login)
4. **Test logout**: `https://gentle-moss-087d9321e.1.azurestaticapps.net/.auth/logout`

## Authentication Flow

1. User visits a protected route
2. If not authenticated, automatically redirected to `/.auth/login/aad`
3. User signs in with Microsoft account
4. Redirected back to original page after successful authentication
5. User information available at `/.auth/me` endpoint

## Troubleshooting

### Common Issues

1. **"Application not found" error**
   - Verify the Azure AD app registration exists
   - Check that the client ID in application settings matches the registered app

2. **"Invalid redirect URI" error** 
   - Ensure the redirect URI in Azure AD app registration exactly matches:
     `https://gentle-moss-087d9321e.1.azurestaticapps.net/.auth/login/aad/callback`

3. **CORS errors when calling Azure Functions**
   - Verify `ALLOWED_ORIGINS` includes the Static Web App URL
   - Check that the Function App settings are updated

4. **Authentication loops or redirects not working**
   - Verify the `staticwebapp.config.json` file is in the root of your Static Web App
   - Check that the configuration file is properly formatted JSON

### Verification Steps

1. **Check Static Web App configuration**:
   ```bash
   curl https://gentle-moss-087d9321e.1.azurestaticapps.net/.auth/me
   ```

2. **Test Function App CORS**:
   ```bash
   curl -H "Origin: https://gentle-moss-087d9321e.1.azurestaticapps.net" \
        https://mortongroupaicred-hugxh8drhqabbphb.canadacentral-01.azurewebsites.net/api/openai/config
   ```

## Security Considerations

- The Azure AD app is configured to support both organizational and personal Microsoft accounts
- Client secret should be stored securely in Static Web App application settings
- HTTPS is enforced for all authentication flows
- API routes require authentication by default

## Next Steps

After setting up authentication:

1. Update your React app to handle authenticated users
2. Use the `/.auth/me` endpoint to get user information
3. Include authentication tokens when calling Azure Functions
4. Implement proper logout functionality

For more information, see [Azure Static Web Apps authentication documentation](https://docs.microsoft.com/en-us/azure/static-web-apps/authentication-authorization).