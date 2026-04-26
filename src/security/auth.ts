import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { AuthToken, User } from '../types';
import { RateLimiter } from './rate-limiter';
import { Firewall } from './firewall';

export class AuthManager {
  private users: Map<string, User> = new Map();
  private tokens: Map<string, AuthToken> = new Map();
  private tokenExpiryMs: number;
  private configPath: string;
  private loginRateLimiter: RateLimiter;
  private registerRateLimiter: RateLimiter;
  private firewall: Firewall;

  constructor(tokenExpiryMs: number = 3600000, configPath?: string) {
    this.tokenExpiryMs = tokenExpiryMs;
    this.configPath = configPath || path.join(process.cwd(), '.veloxauth');
    this.loginRateLimiter = new RateLimiter(5, 60000, 300000);
    this.registerRateLimiter = new RateLimiter(3, 3600000, 86400000);
    this.firewall = new Firewall();
    this.loadUsers();
  }

  private loadUsers(): void {
    if (fs.existsSync(this.configPath)) {
      try {
        const data = fs.readFileSync(this.configPath, 'utf8');
        const savedUsers = JSON.parse(data);
        for (const [username, user] of Object.entries(savedUsers)) {
          this.users.set(username, user as User);
        }
      } catch (err) {}
    }
  }

  private saveUsers(): void {
    const usersObj: any = {};
    for (const [username, user] of this.users) {
      usersObj[username] = user;
    }
    fs.writeFileSync(this.configPath, JSON.stringify(usersObj, null, 2));
  }

  canRegister(ip: string): { allowed: boolean; message?: string } {
    const result = this.registerRateLimiter.check(ip);
    if (!result.allowed) {
      return { allowed: false, message: `Too many registration attempts. Try again in ${Math.ceil((result.waitTime || 0) / 1000)} seconds` };
    }
    return { allowed: true };
  }

  canLogin(ip: string): { allowed: boolean; message?: string; remainingAttempts?: number } {
    const result = this.loginRateLimiter.check(ip);
    if (!result.allowed) {
      return { allowed: false, message: `Too many login attempts. Try again in ${Math.ceil((result.waitTime || 0) / 1000)} seconds` };
    }
    return { allowed: true, remainingAttempts: result.remainingAttempts };
  }

  register(username: string, password: string, ip: string, role: string = 'user'): { success: boolean; message: string } {
    const rateCheck = this.canRegister(ip);
    if (!rateCheck.allowed) {
      this.firewall.logAccess(ip, 'register', false, username);
      return { success: false, message: rateCheck.message! };
    }

    if (this.users.has(username)) {
      this.registerRateLimiter.recordFailure(ip);
      this.firewall.logAccess(ip, 'register', false, username);
      return { success: false, message: 'Username already exists' };
    }

    if (username.length < 3) {
      return { success: false, message: 'Username must be at least 3 characters' };
    }

    if (password.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters' };
    }

    const hash = crypto.createHash('sha256').update(password).digest('hex');
    this.users.set(username, { username, passwordHash: hash, role });
    this.saveUsers();
    this.registerRateLimiter.reset(ip);
    this.firewall.logAccess(ip, 'register', true, username);
    
    return { success: true, message: 'User registered successfully' };
  }

  login(username: string, password: string, ip: string): { success: boolean; token?: string; message: string } {
    const rateCheck = this.canLogin(ip);
    if (!rateCheck.allowed) {
      this.firewall.logAccess(ip, 'login', false, username);
      return { success: false, message: rateCheck.message! };
    }

    const user = this.users.get(username);
    if (!user) {
      this.loginRateLimiter.recordFailure(ip);
      this.firewall.logAccess(ip, 'login', false, username);
      return { success: false, message: 'Invalid username or password' };
    }

    const hash = crypto.createHash('sha256').update(password).digest('hex');
    if (user.passwordHash !== hash) {
      this.loginRateLimiter.recordFailure(ip);
      this.firewall.logAccess(ip, 'login', false, username);
      return { success: false, message: 'Invalid username or password' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + this.tokenExpiryMs;
    
    this.tokens.set(token, {
      token,
      userId: username,
      expiresAt,
      createdAt: Date.now()
    });
    
    this.loginRateLimiter.reset(ip);
    this.firewall.logAccess(ip, 'login', true, username);
    return { success: true, token, message: 'Login successful' };
  }

  validateToken(token: string): string | null {
    const authToken = this.tokens.get(token);
    if (!authToken) return null;
    if (Date.now() > authToken.expiresAt) {
      this.tokens.delete(token);
      return null;
    }
    return authToken.userId;
  }

  getUser(username: string): User | undefined {
    return this.users.get(username);
  }

  hasUsers(): boolean {
    return this.users.size > 0;
  }

  revokeToken(token: string): void {
    this.tokens.delete(token);
  }

  getFirewall(): Firewall {
    return this.firewall;
  }

  getRateLimiterStats() {
    return {
      login: this.loginRateLimiter.getStats(),
      register: this.registerRateLimiter.getStats()
    };
  }

  setGlobalRateLimit(limit: number): void {
    this.loginRateLimiter.setGlobalLimit(limit);
    this.registerRateLimiter.setGlobalLimit(limit);
  }
}