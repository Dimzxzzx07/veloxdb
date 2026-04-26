import * as fs from 'fs';
import * as path from 'path';

export class Snapshot {
  private dataPath: string;
  private snapshots: Map<string, { path: string; createdAt: number; size: number }> = new Map();

  constructor(dataPath: string) {
    this.dataPath = dataPath;
    this.loadSnapshots();
  }

  private loadSnapshots(): void {
    if (!fs.existsSync(this.dataPath)) return;
    
    const files = fs.readdirSync(this.dataPath);
    for (const file of files) {
      if (file.startsWith('snapshot-') && file.endsWith('.veloxdb')) {
        const stats = fs.statSync(path.join(this.dataPath, file));
        const name = file.replace('.veloxdb', '');
        this.snapshots.set(name, {
          path: path.join(this.dataPath, file),
          createdAt: stats.birthtimeMs,
          size: stats.size
        });
      }
    }
  }

  async create(name?: string): Promise<string> {
    const timestamp = Date.now();
    const snapshotName = name || `snapshot-${timestamp}`;
    const snapshotPath = path.join(this.dataPath, `${snapshotName}.veloxdb`);
    const dataPath = path.join(this.dataPath, 'data.veloxdb');
    const indexPath = path.join(this.dataPath, 'index.idx');

    await fs.promises.copyFile(dataPath, snapshotPath);
    await fs.promises.copyFile(indexPath, `${snapshotPath}.idx`);

    const stats = await fs.promises.stat(snapshotPath);
    this.snapshots.set(snapshotName, {
      path: snapshotPath,
      createdAt: Date.now(),
      size: stats.size
    });

    return snapshotName;
  }

  async restore(name: string): Promise<void> {
    const snapshot = this.snapshots.get(name);
    if (!snapshot) {
      throw new Error(`Snapshot "${name}" not found`);
    }

    const dataPath = path.join(this.dataPath, 'data.veloxdb');
    const indexPath = path.join(this.dataPath, 'index.idx');

    await fs.promises.copyFile(snapshot.path, dataPath);
    await fs.promises.copyFile(`${snapshot.path}.idx`, indexPath);
  }

  async delete(name: string): Promise<void> {
    const snapshot = this.snapshots.get(name);
    if (!snapshot) {
      throw new Error(`Snapshot "${name}" not found`);
    }

    await fs.promises.unlink(snapshot.path);
    await fs.promises.unlink(`${snapshot.path}.idx`).catch(() => {});
    this.snapshots.delete(name);
  }

  list(): { name: string; createdAt: Date; size: number }[] {
    return Array.from(this.snapshots.entries()).map(([name, info]) => ({
      name,
      createdAt: new Date(info.createdAt),
      size: info.size
    }));
  }
}