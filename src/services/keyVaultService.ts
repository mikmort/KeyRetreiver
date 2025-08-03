import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';

export class KeyVaultService {
    private client: SecretClient;
    
    constructor(keyVaultUrl: string) {
        const credential = new DefaultAzureCredential();
        this.client = new SecretClient(keyVaultUrl, credential);
    }
    
    async getSecret(secretName: string): Promise<string> {
        try {
            const secret = await this.client.getSecret(secretName);
            if (!secret.value) {
                throw new Error(`Secret ${secretName} has no value`);
            }
            return secret.value;
        } catch (error) {
            throw new Error(`Failed to retrieve secret ${secretName}: ${error.message}`);
        }
    }
}
