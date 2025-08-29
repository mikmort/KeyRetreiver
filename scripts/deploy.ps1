# Azure Function Deployment Script

# Variables - Update these with your values
$resourceGroupName = "your-resource-group"
$functionAppName = "your-function-app-name"
$keyVaultName = "your-keyvault-name"
$location = "East US"
$storageAccountName = "yourstorageaccount"

# Create resource group
Write-Host "Creating resource group..."
az group create --name $resourceGroupName --location $location

# Create storage account
Write-Host "Creating storage account..."
az storage account create --name $storageAccountName --location $location --resource-group $resourceGroupName --sku Standard_LRS

# Create Key Vault
Write-Host "Creating Key Vault..."
az keyvault create --name $keyVaultName --resource-group $resourceGroupName --location $location

# Create Function App
Write-Host "Creating Function App..."
az functionapp create --resource-group $resourceGroupName --consumption-plan-location $location --runtime node --runtime-version 18 --functions-version 4 --name $functionAppName --storage-account $storageAccountName

# Configure Function App settings
Write-Host "Configuring Function App settings..."
az functionapp config appsettings set --name $functionAppName --resource-group $resourceGroupName --settings @([PSCustomObject]@{
    KEY_VAULT_URL = "https://$keyVaultName.vault.azure.net/"
    AZURE_OPENAI_ENDPOINT = "https://your-openai-instance.openai.azure.com/"
    AZURE_OPENAI_API_KEY_SECRET_NAME = "azure-openai-api-key"
    ALLOWED_ORIGINS = "https://gentle-moss-087d9321e.1.azurestaticapps.net,http://localhost:3000"
} | ConvertTo-Json)

# Enable system-assigned managed identity
Write-Host "Enabling managed identity..."
az functionapp identity assign --name $functionAppName --resource-group $resourceGroupName

# Get the Function App's principal ID
$principalId = az functionapp identity show --name $functionAppName --resource-group $resourceGroupName --query principalId --output tsv

# Grant Key Vault access to the Function App
Write-Host "Granting Key Vault access..."
az keyvault set-policy --name $keyVaultName --object-id $principalId --secret-permissions get

Write-Host "Deployment complete!"
Write-Host "Don't forget to:"
Write-Host "1. Add your Azure OpenAI API key to Key Vault with name 'azure-openai-api-key'"
Write-Host "2. Update the AZURE_OPENAI_ENDPOINT setting with your actual endpoint"
Write-Host "3. Deploy your function code using 'func azure functionapp publish $functionAppName'"
