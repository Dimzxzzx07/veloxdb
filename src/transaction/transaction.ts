import { VeloxDB } from '../veloxdb';

export class Transaction {
  private operations: Array<{ type: 'set' | 'delete' | 'link'; key: string; value?: Buffer; targetKey?: string; dataType?: number }> = [];
  private committed: boolean = false;
  private tempStore: Map<string, any> = new Map();
  private deletedKeys: Set<string> = new Set();

  constructor(private db: VeloxDB) {}

  set(key: string, value: any, dataType?: number): void {
    const buffer = Buffer.from(JSON.stringify(value));
    this.operations.push({ type: 'set', key, value: buffer, dataType });
    this.tempStore.set(key, value);
    this.deletedKeys.delete(key);
  }

  link(aliasKey: string, targetKey: string): void {
    this.operations.push({ type: 'link', key: aliasKey, targetKey });
    this.tempStore.set(aliasKey, `→ ${targetKey}`);
    this.deletedKeys.delete(aliasKey);
  }

  delete(key: string): void {
    this.operations.push({ type: 'delete', key });
    this.tempStore.delete(key);
    this.deletedKeys.add(key);
  }

  getPreview(key: string): any {
    if (this.deletedKeys.has(key)) return null;
    if (this.tempStore.has(key)) return this.tempStore.get(key);
    return this.db.get(key);
  }

  async commit(): Promise<void> {
    if (this.committed) {
      throw new Error('Transaction already committed');
    }

    try {
      for (const op of this.operations) {
        if (op.type === 'set') {
          await this.db.setRaw(op.key, op.value!, op.dataType);
        } else if (op.type === 'link') {
          await this.db.linkRaw(op.key, op.targetKey!);
        } else if (op.type === 'delete') {
          await this.db.deleteRaw(op.key);
        }
      }
      this.committed = true;
      this.tempStore.clear();
      this.deletedKeys.clear();
    } catch (err) {
      throw new Error(`Transaction failed: ${err}`);
    }
  }

  async rollback(): Promise<void> {
    this.operations = [];
    this.tempStore.clear();
    this.deletedKeys.clear();
    this.committed = false;
  }

  hasPending(): boolean {
    return this.operations.length > 0;
  }

  getPendingCount(): number {
    return this.operations.length;
  }
}