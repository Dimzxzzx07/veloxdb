export class RateLimiter {
  private attempts: Map<string, { count: number; firstAttempt: number; blockedUntil: number }> = new Map();
  private maxAttempts: number;
  private windowMs: number;
  private blockDurationMs: number;
  private globalLimit: number = 100;
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(maxAttempts: number = 5, windowMs: number = 60000, blockDurationMs: number = 300000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.blockDurationMs = blockDurationMs;
  }

  setGlobalLimit(limit: number): void {
    this.globalLimit = limit;
  }

  checkGlobal(ip: string): { allowed: boolean; message?: string } {
    const now = Date.now();
    const record = this.requestCounts.get(ip);
    
    if (!record || now > record.resetTime) {
      this.requestCounts.set(ip, { count: 1, resetTime: now + 1000 });
      return { allowed: true };
    }
    
    if (record.count >= this.globalLimit) {
      return { allowed: false, message: `Rate limit exceeded. Max ${this.globalLimit} requests per second.` };
    }
    
    record.count++;
    this.requestCounts.set(ip, record);
    return { allowed: true };
  }

  check(identifier: string): { allowed: boolean; waitTime?: number; remainingAttempts?: number } {
    const record = this.attempts.get(identifier);
    const now = Date.now();

    if (record && record.blockedUntil > now) {
      return { allowed: false, waitTime: record.blockedUntil - now };
    }

    if (!record) {
      return { allowed: true, remainingAttempts: this.maxAttempts };
    }

    if (now - record.firstAttempt > this.windowMs) {
      this.attempts.delete(identifier);
      return { allowed: true, remainingAttempts: this.maxAttempts };
    }

    const remaining = this.maxAttempts - record.count;
    if (remaining <= 0) {
      this.attempts.set(identifier, {
        ...record,
        blockedUntil: now + this.blockDurationMs
      });
      return { allowed: false, waitTime: this.blockDurationMs };
    }

    return { allowed: true, remainingAttempts: remaining };
  }

  recordFailure(identifier: string): void {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record) {
      this.attempts.set(identifier, {
        count: 1,
        firstAttempt: now,
        blockedUntil: 0
      });
    } else if (now - record.firstAttempt <= this.windowMs) {
      this.attempts.set(identifier, {
        ...record,
        count: record.count + 1
      });
    } else {
      this.attempts.set(identifier, {
        count: 1,
        firstAttempt: now,
        blockedUntil: 0
      });
    }
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }

  getStats(): { totalBlocks: number; activeBlocks: number } {
    const now = Date.now();
    let activeBlocks = 0;
    for (const record of this.attempts.values()) {
      if (record.blockedUntil > now) activeBlocks++;
    }
    return { totalBlocks: this.attempts.size, activeBlocks };
  }
}