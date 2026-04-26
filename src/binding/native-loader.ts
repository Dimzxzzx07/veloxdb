import * as zlib from 'zlib';

export class NativeLoader {
  static compressGzip(data: Buffer): Buffer {
    return zlib.gzipSync(data);
  }

  static decompressGzip(data: Buffer): Buffer {
    return zlib.gunzipSync(data);
  }

  static compressSnappy(data: Buffer): Buffer {
    return data;
  }

  static decompressSnappy(data: Buffer): Buffer {
    return data;
  }
}