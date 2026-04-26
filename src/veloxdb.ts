import * as fs from 'fs';
import * as path from 'path';
import { WAL } from './storage/wal';
import { HashIndex } from './index/hash-index';
import { LRUCache } from './cache/lru';
import { TTLCleaner } from './ttl/cleaner';
import { Transaction } from './transaction/transaction';
import { PluginManager } from './plugin/plugin-manager';
import { AuthManager } from './security/auth';
import { Firewall } from './security/firewall';
import { Compaction } from './storage/compaction';
import { Snapshot } from './storage/snapshot';
import { Config, IndexEntry, DataType } from './types';
import { BinaryFormat } from './storage/binary-format';

export class VeloxDB {
  private wal: WAL;
  private index: HashIndex;
  private cache: LRUCache;
  private ttlCleaner: TTLCleaner;
  private pluginManager: PluginManager;
  private authManager: AuthManager;
  private firewall: Firewall;
  private compaction: Compaction;
  private snapshot: Snapshot;
  private dataPath: string;
  private connected: boolean = false;
  private xorKey: number;
  private enableObfuscation: boolean;
  private compactionInterval: NodeJS.Timeout | null = null;
  private currentToken: string | null = null;
  private currentUser: string | null = null;
  private ghostMode: boolean = false;
  private ghostSecretKey: string | null = null;
  private links: Map<string, string> = new Map();

  constructor(config: string | Config) {
    let dbPath: string;
    let cacheSize: number = 1000;
    let xorKey: number = 0xAC;
    let enableObfuscation: boolean = true;

    if (typeof config === 'string') {
      dbPath = config;
    } else {
      dbPath = config.path;
      cacheSize = config.cacheSize || 1000;
      xorKey = config.xorKey || 0xAC;
      enableObfuscation = config.enableObfuscation !== false;
    }
    
    this.dataPath = dbPath;
    this.xorKey = xorKey;
    this.enableObfuscation = enableObfuscation;
    this.wal = new WAL(this.dataPath, xorKey, enableObfuscation);
    this.index = new HashIndex();
    this.cache = new LRUCache(cacheSize);
    this.ttlCleaner = new TTLCleaner(this.index);
    this.pluginManager = new PluginManager();
    const authConfigPath = path.join(this.dataPath, '.veloxauth');
    this.authManager = new AuthManager(3600000, authConfigPath);
    this.firewall = this.authManager.getFirewall();
    this.compaction = new Compaction(this.dataPath, xorKey, enableObfuscation);
    this.snapshot = new Snapshot(this.dataPath);
  }

  async register(username: string, password: string, ip: string = '127.0.0.1'): Promise<{ success: boolean; message: string }> {
    return this.authManager.register(username, password, ip);
  }

  async login(username: string, password: string, ip: string = '127.0.0.1'): Promise<{ success: boolean; token?: string; message: string }> {
    const result = this.authManager.login(username, password, ip);
    if (result.success && result.token) {
      this.currentToken = result.token;
      this.currentUser = username;
      await this.connectInternal(result.token);
    }
    return result;
  }

  async logout(): Promise<void> {
    if (this.currentToken) {
      this.authManager.revokeToken(this.currentToken);
      this.currentToken = null;
      this.currentUser = null;
      await this.close();
    }
  }

  async getCurrentUser(): Promise<string | null> {
    return this.currentUser;
  }

  hasUsers(): boolean {
    return this.authManager.hasUsers();
  }

  async enableGhostMode(secretKey: string): Promise<void> {
    this.ghostMode = true;
    this.ghostSecretKey = secretKey;
  }

  async disableGhostMode(): Promise<void> {
    this.ghostMode = false;
    this.ghostSecretKey = null;
  }

  async link(aliasKey: string, targetKey: string): Promise<void> {
    const binaryData = BinaryFormat.serializeLink(aliasKey, targetKey);
    const entry = {
      key: aliasKey,
      value: binaryData,
      timestamp: Date.now(),
      dataType: DataType.LINK
    };
    
    await this.wal.append(entry);
    this.links.set(aliasKey, targetKey);
    this.index.set(aliasKey, {
      offset: 0,
      length: binaryData.length,
      timestamp: Date.now(),
      dataType: DataType.LINK
    });
  }

  async linkRaw(aliasKey: string, targetKey: string): Promise<void> {
    await this.link(aliasKey, targetKey);
  }

  async resolveLink(key: string): Promise<string | null> {
    const link = this.links.get(key);
    if (link) return link;
    
    const entry = this.index.get(key);
    if (entry && entry.dataType === DataType.LINK) {
      return this.links.get(key) || null;
    }
    return null;
  }

  async set(key: string, value: any, options?: { ttl?: number }): Promise<void> {
    const dataType = BinaryFormat.getValueType(value);
    let buffer: Buffer;
    
    if (dataType === DataType.OBJECT) {
      buffer = Buffer.from(JSON.stringify(value));
    } else if (dataType === DataType.STRING) {
      buffer = Buffer.from(value as string);
    } else if (dataType === DataType.INTEGER) {
      const intBuffer = Buffer.alloc(8);
      intBuffer.writeBigInt64BE(BigInt(value as number));
      buffer = intBuffer;
    } else {
      buffer = value as Buffer;
    }
    
    const entry = {
      key,
      value: buffer,
      timestamp: Date.now(),
      ttl: options?.ttl,
      dataType
    };
    
    const { offset, length } = await this.wal.append(entry);
    
    this.index.set(key, {
      offset,
      length,
      timestamp: entry.timestamp,
      ttl: entry.ttl,
      dataType
    });
    
    this.cache.set(key, buffer);
  }

  async get(key: string, ghostSecret?: string): Promise<any> {
    if (this.ghostMode && (!ghostSecret || ghostSecret !== this.ghostSecretKey)) {
      return null;
    }

    const linkTarget = await this.resolveLink(key);
    const actualKey = linkTarget || key;
    
    const cached = this.cache.get(actualKey);
    if (cached) {
      const indexEntry = this.index.get(actualKey);
      if (indexEntry && indexEntry.dataType) {
        return this.deserializeValue(cached, indexEntry.dataType);
      }
      return JSON.parse(cached.toString());
    }
    
    const indexEntry = this.index.get(actualKey);
    if (!indexEntry) {
      return null;
    }
    
    if (indexEntry.ttl && (Date.now() - indexEntry.timestamp) > indexEntry.ttl) {
      await this.delete(actualKey);
      return null;
    }
    
    return null;
  }

  private deserializeValue(buffer: Buffer, dataType: DataType): any {
    switch (dataType) {
      case DataType.STRING:
        return buffer.toString();
      case DataType.INTEGER:
        return Number(buffer.readBigInt64BE());
      case DataType.OBJECT:
        return JSON.parse(buffer.toString());
      case DataType.BUFFER:
        return buffer;
      case DataType.LINK:
        return `-> ${buffer.toString()}`;
      case DataType.NULL:
        return null;
      default:
        return JSON.parse(buffer.toString());
    }
  }

  async inspect(key: string): Promise<{ hex: string; ascii: string; bytes: number[]; raw: Buffer } | null> {
    const indexEntry = this.index.get(key);
    if (!indexEntry) return null;
    
    let rawData = await this.wal.readRaw();
    let data = rawData.slice(indexEntry.offset, indexEntry.offset + indexEntry.length);
    
    if (this.enableObfuscation) {
      const deobfuscated = this.wal.getObfuscator().deobfuscate(data);
      data = Buffer.from(deobfuscated);
    }
    
    const inspection = BinaryFormat.inspect(data);
    return {
      hex: inspection.hex,
      ascii: inspection.ascii,
      bytes: inspection.bytes,
      raw: data
    };
  }

  async delete(key: string): Promise<void> {
    this.index.delete(key);
    this.cache.delete(key);
    this.links.delete(key);
  }

  async deleteRaw(key: string): Promise<void> {
    await this.delete(key);
  }

  async setRaw(key: string, value: Buffer, dataType?: number): Promise<void> {
    const entry = {
      key,
      value,
      timestamp: Date.now(),
      ttl: undefined,
      dataType: dataType || DataType.OBJECT
    };
    
    await this.wal.append(entry);
    this.cache.set(key, value);
  }

  async has(key: string): Promise<boolean> {
    return this.index.has(key);
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    return await this.ttlCleaner.setExpire(key, seconds);
  }

  async ttl(key: string): Promise<number | null> {
    return await this.ttlCleaner.getTTL(key);
  }

  transaction(): Transaction {
    return new Transaction(this);
  }

  getPluginManager(): PluginManager {
    return this.pluginManager;
  }

  async compact(): Promise<{ beforeSize: number; afterSize: number; savedPercent: number }> {
    return await this.compaction.compact();
  }

  async createSnapshot(name?: string): Promise<string> {
    return await this.snapshot.create(name);
  }

  async restoreSnapshot(name: string): Promise<void> {
    await this.snapshot.restore(name);
    await this.recover();
  }

  async listSnapshots(): Promise<{ name: string; createdAt: Date; size: number }[]> {
    return this.snapshot.list();
  }

  async flushAll(): Promise<void> {
    this.index.clear();
    this.cache.clear();
    this.links.clear();
    await this.wal.truncate();
  }

  getStats(): { keys: number; cacheSize: number; cacheMemory: number; path: string; links: number } {
    return {
      keys: this.index.size(),
      cacheSize: this.cache.size(),
      cacheMemory: this.cache.getMemoryUsage(),
      path: this.dataPath,
      links: this.links.size
    };
  }

  getTopKeys(limit: number = 10): { key: string; accessCount: number }[] {
    return this.index.getTopKeys(limit);
  }

  getAccessCount(key: string): number {
    return this.index.getAccessCount(key);
  }

  getAuthManager(): AuthManager {
    return this.authManager;
  }

  getFirewall(): Firewall {
    return this.firewall;
  }

  getRateLimiterStats() {
    return this.authManager.getRateLimiterStats();
  }

  setGlobalRateLimit(limit: number): void {
    this.authManager.setGlobalRateLimit(limit);
  }

  async whoami(): Promise<{ username: string; role: string; ipWhitelisted: boolean } | null> {
    if (!this.currentUser) return null;
    const user = this.authManager.getUser(this.currentUser);
    if (!user) return null;
    
    return {
      username: user.username,
      role: user.role,
      ipWhitelisted: this.firewall.isAllowed('current')
    };
  }

  async cd(prefix: string): Promise<string[]> {
    const keys = Array.from(this.index.getAll().keys());
    return keys.filter(key => key.startsWith(prefix));
  }

  async ls(prefix?: string): Promise<string[]> {
    const keys = Array.from(this.index.getAll().keys());
    if (prefix) {
      return keys.filter(key => key.startsWith(prefix));
    }
    return keys;
  }

  private async connectInternal(token?: string): Promise<void> {
    if (token) {
      const userId = this.authManager.validateToken(token);
      if (!userId) {
        throw new Error('Invalid or expired token');
      }
    }
    
    await this.recover();
    this.ttlCleaner.start();
    
    if (this.compactionInterval) {
      clearInterval(this.compactionInterval);
    }
    this.compactionInterval = setInterval(() => {
      this.compaction.compact().catch(console.error);
    }, 3600000);
    
    this.connected = true;
  }

  private async recover(): Promise<void> {
    const entries = await this.wal.readAll();
    
    for (const entry of entries) {
      this.index.set(entry.key, {
        offset: 0,
        length: 0,
        timestamp: entry.timestamp,
        ttl: entry.ttl,
        dataType: entry.dataType
      });
      this.cache.set(entry.key, entry.value);
      
      if (entry.dataType === DataType.LINK) {
        try {
          const deserialized = BinaryFormat.deserialize(entry.value);
          if (deserialized) {
            this.links.set(entry.key, deserialized.value.toString());
          }
        } catch {}
      }
    }
  }

  async close(): Promise<void> {
    this.ttlCleaner.stop();
    if (this.compactionInterval) {
      clearInterval(this.compactionInterval);
    }
    this.wal.close();
    this.connected = false;
  }
}