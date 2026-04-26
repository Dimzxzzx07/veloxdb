import { DataType } from '../types';

export class BinaryFormat {
  private static readonly MAGIC_BYTES = Buffer.from([0x56, 0x4C]);
  private static readonly DELIMITER = Buffer.from([0x00, 0x00, 0x7E, 0x00, 0x00]);

  static serialize(key: string, value: Buffer, dataType: DataType): Buffer {
    const keyBuffer = Buffer.from(key);
    const keyLength = Buffer.alloc(4);
    keyLength.writeUInt32BE(keyBuffer.length);
    
    const valueLength = Buffer.alloc(4);
    valueLength.writeUInt32BE(value.length);
    
    const typeByte = Buffer.from([dataType]);
    const timestamp = Buffer.alloc(8);
    timestamp.writeBigUInt64BE(BigInt(Date.now()));
    
    return Buffer.concat([
      this.MAGIC_BYTES,
      keyLength,
      keyBuffer,
      typeByte,
      valueLength,
      value,
      timestamp,
      this.DELIMITER
    ]);
  }

  static serializeLink(key: string, targetKey: string): Buffer {
    const targetBuffer = Buffer.from(targetKey);
    return this.serialize(key, targetBuffer, DataType.LINK);
  }

  static deserialize(buffer: Buffer): { key: string; value: Buffer; dataType: DataType; timestamp: number } | null {
    let offset = 0;
    
    if (buffer[offset] !== 0x56 || buffer[offset + 1] !== 0x4C) {
      return null;
    }
    offset += 2;
    
    if (offset + 4 > buffer.length) return null;
    const keyLength = buffer.readUInt32BE(offset);
    offset += 4;
    
    if (offset + keyLength > buffer.length) return null;
    const key = buffer.slice(offset, offset + keyLength).toString();
    offset += keyLength;
    
    if (offset >= buffer.length) return null;
    const dataType = buffer[offset] as DataType;
    offset += 1;
    
    if (offset + 4 > buffer.length) return null;
    const valueLength = buffer.readUInt32BE(offset);
    offset += 4;
    
    if (offset + valueLength > buffer.length) return null;
    const value = buffer.slice(offset, offset + valueLength);
    offset += valueLength;
    
    if (offset + 8 > buffer.length) return null;
    const timestamp = Number(buffer.readBigUInt64BE(offset));
    offset += 8;
    
    if (offset + 5 > buffer.length) return null;
    const delimiter = buffer.slice(offset, offset + 5);
    if (!delimiter.equals(this.DELIMITER)) {
      return null;
    }
    
    return { key, value, dataType, timestamp };
  }

  static getValueType(value: any): DataType {
    if (value === null) return DataType.NULL;
    if (typeof value === 'string') return DataType.STRING;
    if (typeof value === 'number' && Number.isInteger(value)) return DataType.INTEGER;
    if (Buffer.isBuffer(value)) return DataType.BUFFER;
    return DataType.OBJECT;
  }

  static inspect(buffer: Buffer): { hex: string; ascii: string; bytes: number[]; raw: Buffer } {
    const hex = buffer.toString('hex').match(/.{1,2}/g)?.join(' ') || '';
    const ascii = buffer.toString('ascii').replace(/[^\x20-\x7E]/g, '.');
    const bytes = Array.from(buffer);
    return { hex, ascii, bytes, raw: buffer };
  }
}