export interface DataEntry {
  key: string;
  value: Buffer;
  timestamp: number;
  ttl?: number;
  dataType: number;
}

export interface IndexEntry {
  offset: number;
  length: number;
  timestamp: number;
  ttl?: number;
  dataType: number;
}

export interface LinkEntry {
  type: 'link';
  targetKey: string;
  createdAt: number;
}

export interface Config {
  path: string;
  cacheSize?: number;
  compactionInterval?: number;
  snapshotInterval?: number;
  xorKey?: number;
  enableObfuscation?: boolean;
  rateLimit?: number;
}

export interface Plugin {
  name: string;
  compress(data: Buffer): Promise<Buffer>;
  decompress(data: Buffer): Promise<Buffer>;
}

export enum DataType {
  STRING = 0x01,
  INTEGER = 0x02,
  OBJECT = 0x03,
  BUFFER = 0x04,
  NULL = 0x00,
  LINK = 0x05
}

export interface AuthToken {
  token: string;
  userId: string;
  expiresAt: number;
  createdAt: number;
}

export interface User {
  username: string;
  passwordHash: string;
  role: string;
}

export interface AccessLog {
  timestamp: number;
  ip: string;
  action: string;
  success: boolean;
  username?: string;
}