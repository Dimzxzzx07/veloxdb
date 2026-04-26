import { HashIndex } from '../index/hash-index';

export class TTLCleaner {
  private interval: NodeJS.Timeout | null = null;

  constructor(
    private index: HashIndex
  ) {}

  start(intervalMs: number = 60000): void {
    this.interval = setInterval(() => this.clean(), intervalMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private clean(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.index.getAll()) {
      if (entry.ttl && (now - entry.timestamp) > entry.ttl) {
        toDelete.push(key);
      }
    }

    for (const key of toDelete) {
      this.index.delete(key);
    }
  }

  async setExpire(key: string, seconds: number): Promise<boolean> {
    const entry = this.index.get(key);
    if (!entry) return false;
    
    entry.ttl = seconds * 1000;
    entry.timestamp = Date.now();
    this.index.set(key, entry);
    return true;
  }

  async getTTL(key: string): Promise<number | null> {
    const entry = this.index.get(key);
    if (!entry || !entry.ttl) return null;
    
    const remaining = entry.ttl - (Date.now() - entry.timestamp);
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  }
}