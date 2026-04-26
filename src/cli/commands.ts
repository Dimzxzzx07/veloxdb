import { VeloxDB } from '../veloxdb';

export class Commands {
  private db: VeloxDB;
  private currentNamespace: string = 'default';
  private transactionActive: boolean = false;
  private transaction: any = null;

  constructor(db: VeloxDB) {
    this.db = db;
  }

  async execute(input: string): Promise<string> {
    const parts = input.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      case 'get':
        return await this.get(args);
      case 'set':
        return await this.set(args);
      case 'del':
      case 'delete':
        return await this.del(args);
      case 'has':
        return await this.has(args);
      case 'expire':
        return await this.expire(args);
      case 'ttl':
        return await this.ttl(args);
      case 'link':
        return await this.link(args);
      case 'inspect':
        return await this.inspect(args);
      case 'ls':
      case 'list':
        return await this.list(args);
      case 'cd':
        return await this.cd(args);
      case 'stats':
        return await this.stats();
      case 'compact':
        return await this.compact();
      case 'snapshot':
        return await this.snapshot(args);
      case 'flushdb':
        return await this.flushdb(args);
      case 'begin':
        return await this.begin();
      case 'commit':
        return await this.commit();
      case 'rollback':
        return await this.rollback();
      case 'whoami':
        return await this.whoami();
      case 'audit':
        return await this.audit();
      case 'firewall':
        return await this.firewall(args);
      case 'limit':
        return await this.limit(args);
      case 'ghost':
        return await this.ghost(args);
      case 'top':
        return await this.top();
      case 'shrink':
        return await this.shrink();
      case 'use':
        return await this.use(args);
      case 'help':
        return this.help();
      case 'exit':
      case 'quit':
        process.exit(0);
      default:
        return `Unknown command: ${cmd}\nType 'help' for available commands`;
    }
  }

  private async get(args: string[]): Promise<string> {
    if (args.length === 0) return 'Usage: get <key>';
    const value = await this.db.get(args[0]);
    if (value === null) return `(nil)`;
    return JSON.stringify(value, null, 2);
  }

  private async set(args: string[]): Promise<string> {
    if (args.length < 2) return 'Usage: set <key> <value>';
    let value: any = args[1];
    try { value = JSON.parse(args.slice(1).join(' ')); } catch {}
    await this.db.set(args[0], value);
    return 'OK';
  }

  private async del(args: string[]): Promise<string> {
    if (args.length === 0) return 'Usage: del <key>';
    await this.db.delete(args[0]);
    return 'OK';
  }

  private async has(args: string[]): Promise<string> {
    if (args.length === 0) return 'Usage: has <key>';
    const exists = await this.db.has(args[0]);
    return exists ? 'true' : 'false';
  }

  private async expire(args: string[]): Promise<string> {
    if (args.length < 2) return 'Usage: expire <key> <seconds>';
    const result = await this.db.expire(args[0], parseInt(args[1]));
    return result ? 'OK' : 'Key not found';
  }

  private async ttl(args: string[]): Promise<string> {
    if (args.length === 0) return 'Usage: ttl <key>';
    const ttl = await this.db.ttl(args[0]);
    if (ttl === null) return 'Key not found or no TTL';
    if (ttl === 0) return 'Key expired';
    return `${ttl} seconds`;
  }

  private async link(args: string[]): Promise<string> {
    if (args.length < 2) return 'Usage: link <alias> <target>';
    await this.db.link(args[0], args[1]);
    return `Linked '${args[0]}' → '${args[1]}'`;
  }

  private async inspect(args: string[]): Promise<string> {
    if (args.length === 0) return 'Usage: inspect <key>';
    const result = await this.db.inspect(args[0]);
    if (!result) return 'Key not found';
    
    let output = `\n=== INSPECT: ${args[0]} ===\n`;
    output += `Hex: ${result.hex}\n`;
    output += `ASCII: ${result.ascii}\n`;
    output += `Bytes: [${result.bytes.join(', ')}]\n`;
    return output;
  }

  private async list(args: string[]): Promise<string> {
    const prefix = args[0] || '';
    const keys = await this.db.ls(prefix);
    if (keys.length === 0) return 'No keys found';
    return keys.join('\n');
  }

  private async cd(args: string[]): Promise<string> {
    if (args.length === 0) return 'Usage: cd <prefix>';
    const keys = await this.db.cd(args[0]);
    if (keys.length === 0) return `No keys with prefix '${args[0]}'`;
    return `Changed to namespace: ${args[0]}\nKeys available: ${keys.slice(0, 10).join(', ')}${keys.length > 10 ? '...' : ''}\nTotal: ${keys.length} keys`;
  }

  private async stats(): Promise<string> {
    const stats = this.db.getStats();
    const rateLimiter = this.db.getRateLimiterStats();
    return `
=== Database Statistics ===
Keys: ${stats.keys}
Links: ${stats.links}
Cache Size: ${stats.cacheSize} items
Cache Memory: ${(stats.cacheMemory / 1024).toFixed(2)} KB
Path: ${stats.path}

=== Rate Limiter ===
Login blocks: ${rateLimiter.login.totalBlocks}
Active blocks: ${rateLimiter.login.activeBlocks}
`;
  }

  private async compact(): Promise<string> {
    console.log('Compacting database...');
    const result = await this.db.compact();
    return `Shrink complete! File size reduced from ${(result.beforeSize / 1024 / 1024).toFixed(2)}MB to ${(result.afterSize / 1024 / 1024).toFixed(2)}MB (${result.savedPercent.toFixed(1)}% saved)`;
  }

  private async snapshot(args: string[]): Promise<string> {
    if (args.length === 0) return 'Usage: snapshot <create|restore|list|delete> [name]';
    
    switch (args[0]) {
      case 'create':
        const name = await this.db.createSnapshot(args[1]);
        return `Snapshot created: ${name}`;
      case 'restore':
        if (args.length < 2) return 'Usage: snapshot restore <name>';
        await this.db.restoreSnapshot(args[1]);
        return `Snapshot restored: ${args[1]}`;
      case 'list':
        const snapshots = await this.db.listSnapshots();
        if (snapshots.length === 0) return 'No snapshots found';
        return snapshots.map(s => `${s.name} - ${s.createdAt.toLocaleString()} - ${(s.size / 1024).toFixed(2)}KB`).join('\n');
      case 'delete':
        if (args.length < 2) return 'Usage: snapshot delete <name>';
        await (this.db as any).snapshot.delete(args[1]);
        return `Snapshot deleted: ${args[1]}`;
      default:
        return 'Unknown snapshot command';
    }
  }

  private async flushdb(args: string[]): Promise<string> {
    if (args[0] !== '--force') {
      return 'WARNING: This will delete ALL data. Use "flushdb --force" to confirm';
    }
    await this.db.flushAll();
    return 'Database flushed successfully';
  }

  private async begin(): Promise<string> {
    if (this.transactionActive) {
      return 'Transaction already active. Use "commit" or "rollback" first.';
    }
    this.transaction = this.db.transaction();
    this.transactionActive = true;
    return 'Transaction started. Use "commit" to save or "rollback" to cancel.';
  }

  private async commit(): Promise<string> {
    if (!this.transactionActive) {
      return 'No active transaction. Use "begin" first.';
    }
    await this.transaction.commit();
    this.transactionActive = false;
    this.transaction = null;
    return 'Transaction committed';
  }

  private async rollback(): Promise<string> {
    if (!this.transactionActive) {
      return 'No active transaction. Use "begin" first.';
    }
    await this.transaction.rollback();
    this.transactionActive = false;
    this.transaction = null;
    return 'Transaction rolled back';
  }

  private async whoami(): Promise<string> {
    const info = await this.db.whoami();
    if (!info) return 'Not logged in';
    return `User: ${info.username} | Role: ${info.role} | IP Whitelisted: ${info.ipWhitelisted}`;
  }

  private async audit(): Promise<string> {
    const firewall = this.db.getFirewall();
    const logs = firewall.getAccessLogs(20);
    if (logs.length === 0) return 'No access logs found';
    return logs.map(log => `${new Date(log.timestamp).toISOString()} | ${log.ip} | ${log.action} | ${log.success ? 'succses' : 'no'} | ${log.username || '-'}`).join('\n');
  }

  private async firewall(args: string[]): Promise<string> {
    if (args.length === 0) return 'Usage: firewall <add|block|list|remove> [ip]';
    const firewall = this.db.getFirewall();
    
    switch (args[0]) {
      case 'add':
        if (args.length < 2) return 'Usage: firewall add <ip>';
        firewall.addToWhitelist(args[1]);
        return `IP ${args[1]} added to whitelist`;
      case 'block':
        if (args.length < 2) return 'Usage: firewall block <ip>';
        firewall.addToBlacklist(args[1]);
        return `IP ${args[1]} blocked`;
      case 'list':
        const whitelist = firewall.getWhitelist();
        const blacklist = firewall.getBlacklist();
        return `Whitelist: ${whitelist.join(', ') || '(empty)'}\nBlacklist: ${blacklist.join(', ') || '(empty)'}`;
      case 'remove':
        if (args.length < 2) return 'Usage: firewall remove <ip>';
        firewall.removeFromWhitelist(args[1]);
        firewall.removeFromBlacklist(args[1]);
        return `IP ${args[1]} removed from all lists`;
      default:
        return 'Unknown firewall command';
    }
  }

  private async limit(args: string[]): Promise<string> {
    if (args.length < 2) return 'Usage: limit set <requests_per_second>';
    if (args[0] === 'set') {
      this.db.setGlobalRateLimit(parseInt(args[1]));
      return `Global rate limit set to ${args[1]} requests per second`;
    }
    return 'Unknown limit command';
  }

  private async ghost(args: string[]): Promise<string> {
    if (args.length === 0) return 'Usage: ghost <on|off> [secret_key]';
    if (args[0] === 'on') {
      const secret = args[1] || Math.random().toString(36).substring(2, 15);
      await this.db.enableGhostMode(secret);
      return `Ghost mode enabled. Secret key: ${secret}\nAll get requests will return null unless secret key is provided`;
    } else if (args[0] === 'off') {
      await this.db.disableGhostMode();
      return 'Ghost mode disabled';
    }
    return 'Unknown ghost command';
  }

  private async top(): Promise<string> {
    const topKeys = this.db.getTopKeys(10);
    const stats = this.db.getStats();
    
    let output = '\n=== VeloxDB Top ===\n\n';
    output += `Cache Usage: ${(stats.cacheMemory / 1024).toFixed(2)}KB / ${(stats.cacheSize * 1024).toFixed(0)}KB (${stats.cacheSize} items)\n`;
    output += `Total Keys: ${stats.keys} | Links: ${stats.links}\n\n`;
    output += 'Most Accessed Keys:\n';
    for (const item of topKeys) {
      output += `  ${item.key}: ${item.accessCount} accesses\n`;
    }
    return output;
  }

  private async shrink(): Promise<string> {
    console.log('Optimizing .veloxdb storage...');
    const frames = ['[█░░░░░░░░░░░░░░░]', '[███░░░░░░░░░░░░░]', '[█████░░░░░░░░░░░]', '[███████░░░░░░░░░]', '[█████████░░░░░░░]', '[███████████░░░░░]', '[█████████████░░░]', '[███████████████░]', '[████████████████]'];
    let i = 0;
    const interval = setInterval(() => {
      process.stdout.write(`\r${frames[i % frames.length]} ${Math.min((i + 1) * 10, 100)}% | Processing`);
      i++;
    }, 200);
    
    const result = await this.db.compact();
    clearInterval(interval);
    process.stdout.write('\r');
    return `\nShrink complete! File size reduced from ${(result.beforeSize / 1024 / 1024).toFixed(2)}MB to ${(result.afterSize / 1024 / 1024).toFixed(2)}MB (${result.savedPercent.toFixed(1)}% saved)`;
  }

  private async use(args: string[]): Promise<string> {
    if (args.length === 0) return `Current namespace: ${this.currentNamespace}`;
    this.currentNamespace = args[0];
    return `Switched to namespace: ${this.currentNamespace}`;
  }

  private help(): string {
    return `
    Velox Database

Data Operations:
  get <key>               - Retrieve value
  set <key> <value>       - Store value
  del <key>               - Delete key
  has <key>               - Check existence
  expire <key> <seconds>  - Set expiration
  ttl <key>               - Get remaining TTL
  link <alias> <target>   - Create pointer link
  inspect <key>           - Show binary hex dump

Navigation:
  ls [prefix]             - List keys
  cd <prefix>             - Change namespace prefix
  use <namespace>         - Switch namespace

Transactions:
  begin                   - Start transaction
  commit                  - Save transaction
  rollback               - Cancel transaction

Security:
  whoami                  - Show current user info
  audit                   - Show access logs
  firewall <add|block|list> <ip>
  limit set <rps>        - Set rate limit
  ghost <on|off> [key]   - Enable ghost mode

Maintenance:
  stats                   - Show database stats
  top                     - Show real-time monitoring
  compact                 - Run compaction
  shrink                  - Run compaction with animation
  snapshot <create|restore|list> [name]
  flushdb --force         - Delete all data

Other:
  help                    - Show this help
  exit                    - Quit CLI
`;
  }
}