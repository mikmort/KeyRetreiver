/**
 * Token bucket rate limiter implementation for Azure OpenAI proxy
 * Supports both global and per-user rate limiting
 */

interface TokenBucket {
    tokens: number;
    capacity: number;
    refillRate: number; // tokens per second
    lastRefill: number; // timestamp in ms
}

export class RateLimiter {
    private buckets = new Map<string, TokenBucket>();
    
    constructor(
        private globalRps: number = 8,
        private userRps: number = 2
    ) {
        // Clean up old buckets every 5 minutes to prevent memory leaks
        setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }

    /**
     * Check if a request is allowed for the given key
     * @param key Rate limiting key (e.g., "global", "user:123")
     * @param cost Number of tokens to consume (default: 1)
     * @returns true if allowed, false if rate limited
     */
    allow(key: string, cost: number = 1): boolean {
        const bucket = this.getBucket(key);
        this.refillBucket(bucket);
        
        if (bucket.tokens >= cost) {
            bucket.tokens -= cost;
            return true;
        }
        
        return false;
    }

    /**
     * Get or create a bucket for the given key
     */
    private getBucket(key: string): TokenBucket {
        let bucket = this.buckets.get(key);
        
        if (!bucket) {
            const isGlobal = key === 'global';
            const capacity = isGlobal ? this.globalRps : this.userRps;
            
            bucket = {
                tokens: capacity,
                capacity,
                refillRate: capacity, // tokens per second
                lastRefill: Date.now()
            };
            
            this.buckets.set(key, bucket);
        }
        
        return bucket;
    }

    /**
     * Refill tokens based on elapsed time since last refill
     */
    private refillBucket(bucket: TokenBucket): void {
        const now = Date.now();
        const deltaMs = now - bucket.lastRefill;
        
        if (deltaMs > 0) {
            // Calculate tokens to add: (elapsed seconds) * (tokens per second)
            const tokensToAdd = (deltaMs / 1000) * bucket.refillRate;
            bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
            bucket.lastRefill = now;
        }
    }

    /**
     * Clean up old buckets to prevent memory leaks
     */
    private cleanup(): void {
        const cutoffTime = Date.now() - (10 * 60 * 1000); // 10 minutes ago
        
        for (const [key, bucket] of this.buckets.entries()) {
            if (bucket.lastRefill < cutoffTime) {
                this.buckets.delete(key);
            }
        }
    }

    /**
     * Get current status for debugging
     */
    getStatus(): { bucketCount: number; buckets: Record<string, any> } {
        const buckets: Record<string, any> = {};
        
        for (const [key, bucket] of this.buckets.entries()) {
            this.refillBucket(bucket); // Update before reporting
            buckets[key] = {
                tokens: Math.floor(bucket.tokens),
                capacity: bucket.capacity,
                refillRate: bucket.refillRate
            };
        }
        
        return {
            bucketCount: this.buckets.size,
            buckets
        };
    }
}

// Singleton instance
export const globalRateLimiter = new RateLimiter(
    Number(process.env.RATE_LIMIT_GLOBAL_RPS || 8),
    Number(process.env.RATE_LIMIT_USER_RPS || 2)
);