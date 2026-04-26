import * as fs from 'fs';
import * as path from 'path';
import { DataEntry, DataType } from '../types';
import { BinaryFormat } from './binary-format';
import { Obfuscator } from '../security/obfuscator';
import { EventEmitter } from 'events';

interface PendingWrite {
  entry: DataEntry;
  resolve: (value: { offset: number; length: number }) => void;
  reject: (reason: any) => void;
}

export class WAL extends EventEmitter {
  private logPath: string;
  private writeStream: fs.WriteStream;
  private obfuscator: Obfuscator;
  private enableObfuscation: boolean;
  private pendingWrites: PendingWrite[] = [];
  private isWriting: boolean = false;

  constructor(dbPath: string, xorKey: number = 0xAC, enableObfuscation: boolean = true) {
    super();
    this.logPath = path.join(dbPath, 'data.veloxdb');
    this.obfuscator = new Obfuscator(xorKey);
    this.enableObfuscation = enableObfuscation;
    this.ensureDirectory(dbPath);
    this.writeStream = fs.createWriteStream(this.logPath, { flags: 'a' });
    this.writeStream.on('drain', () => this.processQueue());
  }

  private ensureDirectory(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  private processQueue(): void {
    this.isWriting = false;
    if (this.pendingWrites.length > 0) {
      this.processPendingWrites();
    }
  }

  private processPendingWrites(): void {
    if (this.isWriting) return;
    if (this.pendingWrites.length === 0) return;

    this.isWriting = true;
    const item = this.pendingWrites.shift();
    if (item) {
      const { entry, resolve, reject } = item;
      this.performWrite(entry).then(resolve).catch(reject);
    }
  }

  private async performWrite(entry: DataEntry): Promise<{ offset: number; length: number }> {
    const binaryData = BinaryFormat.serialize(entry.key, entry.value, entry.dataType);
    const dataToWrite = this.enableObfuscation ? this.obfuscator.obfuscate(binaryData) : binaryData;
    const offset = await this.getCurrentSize();
    
    return new Promise((resolve, reject) => {
      const writeResult = this.writeStream.write(dataToWrite);
      if (!writeResult) {
        this.writeStream.once('drain', () => resolve({ offset, length: dataToWrite.length }));
      } else {
        resolve({ offset, length: dataToWrite.length });
      }
      this.emit('written', { key: entry.key, offset, length: dataToWrite.length });
    });
  }

  async append(entry: DataEntry): Promise<{ offset: number; length: number }> {
    return new Promise((resolve, reject) => {
      this.pendingWrites.push({ entry, resolve, reject });
      if (!this.isWriting) {
        this.processPendingWrites();
      }
    });
  }

  private async getCurrentSize(): Promise<number> {
    const stats = await fs.promises.stat(this.logPath).catch(() => ({ size: 0 }));
    return stats.size;
  }

  async readAll(): Promise<DataEntry[]> {
    const readStream = fs.createReadStream(this.logPath);
    const chunks: Buffer[] = [];
    
    for await (const chunk of readStream) {
      chunks.push(chunk);
    }
    
    let rawData: Buffer = Buffer.concat(chunks);
    if (this.enableObfuscation) {
      const deobfuscated: Buffer = this.obfuscator.deobfuscate(rawData);
      rawData = Buffer.from(deobfuscated);
    }
    
    const entries: DataEntry[] = [];
    let offset = 0;
    
    while (offset < rawData.length) {
      const remaining = rawData.slice(offset);
      const deserialized = BinaryFormat.deserialize(remaining);
      if (!deserialized) break;
      
      entries.push({
        key: deserialized.key,
        value: deserialized.value,
        timestamp: deserialized.timestamp,
        dataType: deserialized.dataType
      });
      
      const binarySize = BinaryFormat.serialize(deserialized.key, deserialized.value, deserialized.dataType).length;
      offset += binarySize;
    }
    
    return entries;
  }

  async readRaw(): Promise<Buffer> {
    return await fs.promises.readFile(this.logPath);
  }

  async truncate(): Promise<void> {
    await fs.promises.truncate(this.logPath, 0);
  }

  close(): void {
    this.writeStream.end();
  }

  getObfuscator(): Obfuscator {
    return this.obfuscator;
  }
}