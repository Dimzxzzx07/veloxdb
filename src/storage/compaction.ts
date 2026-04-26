import * as fs from 'fs';
import * as path from 'path';
import { BinaryFormat } from './binary-format';
import { Obfuscator } from '../security/obfuscator';

export class Compaction {
  private dataPath: string;
  private xorKey: number;
  private enableObfuscation: boolean;

  constructor(dataPath: string, xorKey: number = 0xAC, enableObfuscation: boolean = true) {
    this.dataPath = dataPath;
    this.xorKey = xorKey;
    this.enableObfuscation = enableObfuscation;
  }

  async compact(): Promise<{ beforeSize: number; afterSize: number; savedPercent: number }> {
    const dataPath = path.join(this.dataPath, 'database.veloxdb');
    const newDataPath = path.join(this.dataPath, 'databasw.veloxdb.tmp');
    const indexPath = path.join(this.dataPath, 'index.idx');
    const obfuscator = new Obfuscator(this.xorKey);

    const beforeSize = (await fs.promises.stat(dataPath).catch(() => ({ size: 0 }))).size;

    const readStream = fs.createReadStream(dataPath);
    const chunks: Buffer[] = [];
    
    for await (const chunk of readStream) {
      chunks.push(chunk);
    }
    
    let rawData: Buffer = Buffer.concat(chunks);
    if (this.enableObfuscation) {
      const deobfuscated: Buffer = obfuscator.deobfuscate(rawData);
      rawData = Buffer.from(deobfuscated);
    }

    const latestEntries = new Map<string, { data: Buffer; timestamp: number; dataType: number }>();
    let offset = 0;

    while (offset < rawData.length) {
      const remaining = rawData.slice(offset);
      const deserialized = BinaryFormat.deserialize(remaining);
      if (!deserialized) break;

      const binarySize = BinaryFormat.serialize(deserialized.key, deserialized.value, deserialized.dataType).length;
      latestEntries.set(deserialized.key, {
        data: remaining.slice(0, binarySize),
        timestamp: deserialized.timestamp,
        dataType: deserialized.dataType
      });
      offset += binarySize;
    }

    const writeStream = fs.createWriteStream(newDataPath);
    const newIndex: any = {};
    let currentOffset = 0;

    for (const [key, entry] of latestEntries) {
      const dataToWrite = this.enableObfuscation ? obfuscator.obfuscate(entry.data) : entry.data;
      writeStream.write(dataToWrite);
      newIndex[key] = {
        offset: currentOffset,
        length: dataToWrite.length,
        timestamp: entry.timestamp,
        dataType: entry.dataType
      };
      currentOffset += dataToWrite.length;
    }

    writeStream.end();
    await new Promise<void>((resolve) => writeStream.on('finish', () => resolve()));

    await fs.promises.rename(newDataPath, dataPath);
    await fs.promises.writeFile(indexPath, JSON.stringify(newIndex));

    const afterSize = (await fs.promises.stat(dataPath)).size;
    const savedPercent = beforeSize > 0 ? ((beforeSize - afterSize) / beforeSize) * 100 : 0;

    return { beforeSize, afterSize, savedPercent };
  }
}