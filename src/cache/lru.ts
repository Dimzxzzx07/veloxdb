export class LRUCache {
  private cache: Map<string, { value: Buffer; lastUsed: number; size: number }> = new Map();
  private maxSize: number;
  private currentSize: number = 0;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  get(key: string): Buffer | undefined {
    const item = this.cache.get(key);
    if (!item) {
      return undefined;
    }
    item.lastUsed = Date.now();
    this.cache.set(key, item);
    return item.value;
  }

  set(key: string, value: Buffer): void {
    const valueSize = value.length;
    
    if (this.cache.has(key)) {
      const oldItem = this.cache.get(key)!;
      this.currentSize -= oldItem.size;
      this.cache.delete(key);
    }
    
    this.cache.set(key, { value, lastUsed: Date.now(), size: valueSize });
    this.currentSize += valueSize;
    
    while (this.currentSize > this.maxSize * 1024 && this.cache.size > 0) {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      
      for (const [k, v] of this.cache) {
        if (v.lastUsed < oldestTime) {
          oldestTime = v.lastUsed;
          oldestKey = k;
        }
      }
      
      if (oldestKey) {
        const removed = this.cache.get(oldestKey)!;
        this.currentSize -= removed.size;
        this.cache.delete(oldestKey);
      }
    }
  }

  delete(key: string): void {
    const item = this.cache.get(key);
    if (item) {
      this.currentSize -= item.size;
      this.cache.delete(key);
    }
  }

  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }

  size(): number {
    return this.cache.size;
  }

  getMemoryUsage(): number {
    return this.currentSize;
  }

  getMaxSize(): number {
    return this.maxSize;
  }
}