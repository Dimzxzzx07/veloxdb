// src/cli/banner.ts
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

export class Banner {
  static getSystemInfo(dbPath?: string): string {
    const uptime = os.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    
    const loadAvg = os.loadavg();
    const memUsage = ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(0);
    const cpuCount = os.cpus().length;
    
    let dbSize = 0;
    let dbUsed = 0;
    let dbTotal = 100;
    
    if (dbPath && fs.existsSync(dbPath)) {
      const dataFile = path.join(dbPath, 'data.veloxdb');
      if (fs.existsSync(dataFile)) {
        const stats = fs.statSync(dataFile);
        dbSize = stats.size;
        dbUsed = (dbSize / (1024 * 1024 * 1024)) * 10;
        if (dbUsed > 100) dbUsed = 100;
      }
    }
    
    const now = new Date();
    const formattedDate = now.toString();
    
    return `
Welcome to Velox Database 1.0.0

 * Documentation:  https://npmjs.com/package/veloxdb
 * Management:     https://github.com/Dimzxzzx07/veloxdb/issues
 * Support:        https://t.me/Dimzxzzx07

 System information as of ${formattedDate}

  System load:  ${loadAvg[0].toFixed(2)}               Processes:             ${Banner.getProcessCount()}
  Usage of /:   ${Banner.getDiskUsage()}% of ${Banner.getTotalDisk()}GB   Users logged in:       ${Banner.getLoggedInUsers()}
  Memory usage: ${memUsage}%                Core:      ${cpuCount}
  Swap usage:   0%                 Storage: ${dbTotal} GB (VeloxDB: ${dbUsed.toFixed(1)}GB used)

Expanded Security Maintenance for Applications is not enabled.

${Banner.getUpdateCount()} updates can be applied immediately.
To see these additional updates run: velox --upgradable

*** System restart required ***
Last login: ${Banner.getLastLogin()}
`;
  }

  static getPrompt(): string {
    return `\n┌──<veloxdb@${os.userInfo().username}>\n└───</>➤ `;
  }

  private static getProcessCount(): number {
    try {
      const { execSync } = require('child_process');
      const output = execSync('ps aux | wc -l').toString();
      return parseInt(output.trim());
    } catch {
      return 155;
    }
  }

  private static getDiskUsage(): string {
    try {
      const { execSync } = require('child_process');
      const output = execSync("df / | awk 'NR==2 {print $5}'").toString();
      return output.trim().replace('%', '');
    } catch {
      return '6.7';
    }
  }

  private static getTotalDisk(): string {
    try {
      const { execSync } = require('child_process');
      const output = execSync("df / | awk 'NR==2 {print $2}'").toString();
      const kb = parseInt(output.trim());
      const gb = (kb / (1024 * 1024)).toFixed(0);
      return gb;
    } catch {
      return '154';
    }
  }

  private static getLoggedInUsers(): number {
    try {
      const { execSync } = require('child_process');
      const output = execSync('who | wc -l').toString();
      return parseInt(output.trim());
    } catch {
      return 0;
    }
  }

  private static getUpdateCount(): number {
    try {
      const { execSync } = require('child_process');
      const output = execSync('apt list --upgradable 2>/dev/null | grep -c upgradable || echo 0').toString();
      return parseInt(output.trim());
    } catch {
      return 56;
    }
  }

  private static getLastLogin(): string {
    try {
      const { execSync } = require('child_process');
      const output = execSync('last -1 | head -1').toString();
      return output.trim();
    } catch {
      return 'Wed Apr 22 22:44:05 2026 from 114.10.78.16';
    }
  }
}