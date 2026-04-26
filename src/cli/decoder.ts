import * as fs from 'fs';
import * as path from 'path';
import { BinaryFormat } from '../storage/binary-format';
import { Obfuscator } from '../security/obfuscator';

interface DecoderOptions {
  input: string;
  output?: string;
  xorKey?: number;
  noObfuscate?: boolean;
  pretty?: boolean;
  inspectKey?: string;
}

class DatabaseDecoder {
  static async decode(options: DecoderOptions): Promise<void> {
    const inputPath = options.input;
    const xorKey = options.xorKey || 0xAC;
    const enableObfuscation = !options.noObfuscate;
    
    if (!fs.existsSync(inputPath)) {
      console.error(`File not found: ${inputPath}`);
      process.exit(1);
    }
    
    const data = fs.readFileSync(inputPath);
    let rawData: Buffer = Buffer.from(data);
    
    if (enableObfuscation) {
      const obfuscator = new Obfuscator(xorKey);
      const deobfuscated = obfuscator.deobfuscate(rawData);
      rawData = Buffer.from(deobfuscated);
    }
    
    if (options.inspectKey) {
      let offset = 0;
      
      while (offset < rawData.length) {
        const remaining = rawData.slice(offset);
        const deserialized = BinaryFormat.deserialize(remaining);
        if (!deserialized) break;
        
        if (deserialized.key === options.inspectKey) {
          const binarySize = BinaryFormat.serialize(deserialized.key, deserialized.value, deserialized.dataType).length;
          const rawEntry = remaining.slice(0, binarySize);
          const inspection = BinaryFormat.inspect(rawEntry);
          
          console.log(`\n=== INSPECT: ${deserialized.key} ===`);
          console.log(`Raw Hex: ${inspection.hex}`);
          console.log(`ASCII View: ${inspection.ascii}`);
          console.log(`Byte Array: [${inspection.bytes.join(', ')}]`);
          console.log(`Data Type: ${deserialized.dataType}`);
          console.log(`Timestamp: ${new Date(deserialized.timestamp).toISOString()}`);
          console.log(`Value: ${deserialized.value.toString()}`);
          return;
        }
        
        const binarySize = BinaryFormat.serialize(deserialized.key, deserialized.value, deserialized.dataType).length;
        offset += binarySize;
      }
      
      console.log(`Key '${options.inspectKey}' not found`);
      return;
    }
    
    const entries: any[] = [];
    let offset = 0;
    
    while (offset < rawData.length) {
      const remaining = rawData.slice(offset);
      const deserialized = BinaryFormat.deserialize(remaining);
      if (!deserialized) break;
      
      let value: any;
      switch (deserialized.dataType) {
        case 0x01:
          value = deserialized.value.toString();
          break;
        case 0x02:
          value = Number(deserialized.value.readBigInt64BE());
          break;
        case 0x03:
          try {
            value = JSON.parse(deserialized.value.toString());
          } catch {
            value = deserialized.value.toString();
          }
          break;
        case 0x04:
          value = deserialized.value.toString('hex');
          break;
        case 0x05:
          value = `-> ${deserialized.value.toString()}`;
          break;
        default:
          value = deserialized.value.toString();
      }
      
      entries.push({
        key: deserialized.key,
        value: value,
        timestamp: new Date(deserialized.timestamp).toISOString(),
        dataType: deserialized.dataType
      });
      
      const binarySize = BinaryFormat.serialize(deserialized.key, deserialized.value, deserialized.dataType).length;
      offset += binarySize;
    }
    
    if (options.output) {
      const outputData = options.pretty 
        ? JSON.stringify(entries, null, 2)
        : JSON.stringify(entries);
      fs.writeFileSync(options.output, outputData);
      console.log(`Decoded ${entries.length} entries to ${options.output}`);
    } else {
      console.log(`\n=== VeloxDB Decoded Data ===\n`);
      console.log(`Total entries: ${entries.length}\n`);
      
      for (const entry of entries.slice(0, 50)) {
        console.log(`Key: ${entry.key}`);
        console.log(`Value: ${JSON.stringify(entry.value, null, 2)}`);
        console.log(`Timestamp: ${entry.timestamp}`);
        console.log(`Type: ${entry.dataType}`);
        console.log('---');
      }
      
      if (entries.length > 50) {
        console.log(`... and ${entries.length - 50} more entries`);
      }
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
VeloxDB Database Decoder

Usage:
  node decoder.js --input <file> [options]

Options:
  --input, -i     Path to .veloxdb file
  --output, -o    Output JSON file (optional)
  --xor-key, -k   XOR key for deobfuscation (default: 0xAC)
  --no-obfuscate  Disable deobfuscation
  --pretty, -p    Pretty print JSON output
  --inspect, -x   Inspect specific key with hex dump

Examples:
  node decoder.js -i ./data.veloxdb
  node decoder.js -i ./data.veloxdb -o data.json --pretty
  node decoder.js -i ./data.veloxdb -x user:1
`);
    process.exit(0);
  }
  
  let input: string = '';
  let output: string = '';
  let xorKey: number = 0xAC;
  let noObfuscate: boolean = false;
  let pretty: boolean = false;
  let inspectKey: string = '';
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--input':
      case '-i':
        input = args[++i];
        break;
      case '--output':
      case '-o':
        output = args[++i];
        break;
      case '--xor-key':
      case '-k':
        xorKey = parseInt(args[++i]);
        break;
      case '--no-obfuscate':
        noObfuscate = true;
        break;
      case '--pretty':
      case '-p':
        pretty = true;
        break;
      case '--inspect':
      case '-x':
        inspectKey = args[++i];
        break;
    }
  }
  
  if (!input && !inspectKey) {
    console.error('Error: --input is required');
    process.exit(1);
  }
  
  await DatabaseDecoder.decode({
    input,
    output: output || undefined,
    xorKey,
    noObfuscate,
    pretty,
    inspectKey: inspectKey || undefined
  });
}

main().catch(console.error);