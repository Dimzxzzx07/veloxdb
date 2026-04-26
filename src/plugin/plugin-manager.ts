import { Plugin } from '../types';

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();

  register(plugin: Plugin): void {
    this.plugins.set(plugin.name, plugin);
  }

  unregister(name: string): void {
    this.plugins.delete(name);
  }

  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  async compress(pluginName: string, data: Buffer): Promise<Buffer> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }
    return await plugin.compress(data);
  }

  async decompress(pluginName: string, data: Buffer): Promise<Buffer> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }
    return await plugin.decompress(data);
  }

  list(): string[] {
    return Array.from(this.plugins.keys());
  }
}