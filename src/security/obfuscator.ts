export class Obfuscator {
  private xorKey: number;

  constructor(xorKey: number = 0xAC) {
    this.xorKey = xorKey;
  }

  obfuscate(data: Buffer): Buffer {
    const result = Buffer.alloc(data.length);
    for (let i = 0; i < data.length; i++) {
      result[i] = data[i] ^ this.xorKey;
    }
    return result;
  }

  deobfuscate(data: Buffer): Buffer {
    return this.obfuscate(data);
  }

  setKey(key: number): void {
    this.xorKey = key;
  }

  getKey(): number {
    return this.xorKey;
  }
}