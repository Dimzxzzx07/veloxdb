import * as fs from 'fs';
import * as path from 'path';
import { AccessLog } from '../types';

export class Firewall {
  private whitelist: Set<string> = new Set();
  private blacklist: Set<string> = new Set();
  private accessLogs: AccessLog[] = [];
  private logPath: string;

  constructor(logPath?: string) {
    this.logPath = logPath || path.join(process.cwd(), '.veloxfw.log');
    this.loadLogs();
  }

  addToWhitelist(ip: string): void {
    this.whitelist.add(ip);
    this.saveLogs();
  }

  removeFromWhitelist(ip: string): void {
    this.whitelist.delete(ip);
  }

  addToBlacklist(ip: string): void {
    this.blacklist.add(ip);
    this.saveLogs();
  }

  removeFromBlacklist(ip: string): void {
    this.blacklist.delete(ip);
  }

  isAllowed(ip: string): boolean {
    if (this.blacklist.has(ip)) return false;
    if (this.whitelist.size === 0) return true;
    return this.whitelist.has(ip);
  }

  logAccess(ip: string, action: string, success: boolean, username?: string): void {
    this.accessLogs.unshift({
      timestamp: Date.now(),
      ip,
      action,
      success,
      username
    });
    
    if (this.accessLogs.length > 1000) {
      this.accessLogs = this.accessLogs.slice(0, 1000);
    }
    
    this.saveLogs();
  }

  getAccessLogs(limit: number = 50): AccessLog[] {
    return this.accessLogs.slice(0, limit);
  }

  getFailedAttempts(ip?: string): AccessLog[] {
    return this.accessLogs.filter(log => !log.success && (!ip || log.ip === ip));
  }

  getWhitelist(): string[] {
    return Array.from(this.whitelist);
  }

  getBlacklist(): string[] {
    return Array.from(this.blacklist);
  }

  private loadLogs(): void {
    if (fs.existsSync(this.logPath)) {
      try {
        const data = fs.readFileSync(this.logPath, 'utf8');
        const parsed = JSON.parse(data);
        this.accessLogs = parsed.accessLogs || [];
        this.whitelist = new Set(parsed.whitelist || []);
        this.blacklist = new Set(parsed.blacklist || []);
      } catch (err) {}
    }
  }

  private saveLogs(): void {
    fs.writeFileSync(this.logPath, JSON.stringify({
      accessLogs: this.accessLogs,
      whitelist: Array.from(this.whitelist),
      blacklist: Array.from(this.blacklist)
    }, null, 2));
  }

  clearLogs(): void {
    this.accessLogs = [];
    this.saveLogs();
  }
}