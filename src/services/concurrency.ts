/**
 * Semaphore implementation for controlling concurrency of Azure OpenAI calls
 */

export interface Release {
    (): void;
}

export class Semaphore {
    private permits: number;
    private waitQueue: Array<() => void> = [];
    
    constructor(private maxPermits: number) {
        this.permits = maxPermits;
    }

    /**
     * Acquire a permit, returns a promise that resolves with a release function
     */
    async acquire(): Promise<Release> {
        return new Promise<Release>((resolve) => {
            if (this.permits > 0) {
                // Permit available immediately
                this.permits--;
                resolve(this.createRelease());
            } else {
                // Wait in queue
                this.waitQueue.push(() => {
                    this.permits--;
                    resolve(this.createRelease());
                });
            }
        });
    }

    /**
     * Create a release function that returns the permit and processes the queue
     */
    private createRelease(): Release {
        return () => {
            this.permits++;
            
            // Process next in queue if any
            const nextWaiter = this.waitQueue.shift();
            if (nextWaiter) {
                nextWaiter();
            }
        };
    }

    /**
     * Get current status for monitoring
     */
    getStatus(): { availablePermits: number; queueLength: number; maxPermits: number } {
        return {
            availablePermits: this.permits,
            queueLength: this.waitQueue.length,
            maxPermits: this.maxPermits
        };
    }
}

// Global semaphore instance for Azure OpenAI calls
export const openaiSemaphore = new Semaphore(
    Number(process.env.MAX_PARALLEL_AOAI || 8)
);