// Simple test script to verify the function works locally
import { getOpenAISecrets } from '../src/functions/getOpenAISecrets';

// Mock HttpRequest and InvocationContext for testing
const mockRequest = {
    method: 'GET',
    headers: {
        get: (name: string) => {
            if (name === 'origin') return 'http://localhost:3000';
            return null;
        }
    }
} as any;

const mockContext = {
    log: (message: string, ...args: any[]) => {
        console.log(`[Function Log]: ${message}`, ...args);
    }
} as any;

async function testFunction() {
    console.log('Testing Azure Function...');
    
    try {
        const result = await getOpenAISecrets(mockRequest, mockContext);
        console.log('Function result:', result);
        
        if (result.body) {
            const parsed = JSON.parse(result.body as string);
            console.log('Parsed response:', parsed);
        }
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testFunction();
