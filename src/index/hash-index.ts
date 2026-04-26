import { IndexEntry } from '../types';

export class HashIndex {
  private index: Map<string, IndexEntry> = new Map();
  private accessCount: Map<string, number> = new Map();

  set(key: string, entry: IndexEntry): void {
    this.index.set(key, entry);
  }

  get(key: string): IndexEntry | undefined {
    const count = this.accessCount.get(key) || 0;
    this.accessCount.set(key, count + 1);
    return this.index.get(key);
  }

  delete(key: string): boolean {
    this.accessCount.delete(key);
    return this.index.delete(key);
  }

  has(key: string): boolean {
    return this.index.has(key);
  }

  getAll(): Map<string, IndexEntry> {
    return new Map(this.index);
  }

  clear(): void {
    this.index.clear();
    this.accessCount.clear();
  }

  size(): number {
    return this.index.size;
  }

  getAccessCount(key: string): number {
    return this.accessCount.get(key) || 0;
  }

  getTopKeys(limit: number = 10): { key: string; accessCount: number }[] {
    const sorted = Array.from(this.accessCount.entries())
      .map(([key, count]) => ({ key, accessCount: count }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);
    return sorted;
  }
}