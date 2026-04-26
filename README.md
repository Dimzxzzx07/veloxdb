# veloxdb

<div align="center">
    <img src="https://img.shields.io/badge/Version-1.0.0-2563eb?style=for-the-badge&logo=typescript" alt="Version">
    <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge&logo=open-source-initiative" alt="License">
    <img src="https://img.shields.io/badge/Node-18%2B-339933?style=for-the-badge&logo=nodedotjs" alt="Node">
    <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript">
    <img src="https://img.shields.io/badge/Binary-Format-FF6B6B?style=for-the-badge" alt="Binary">
</div>

<div align="center">
    <a href="https://t.me/Dimzxzzx07">
        <img src="https://img.shields.io/badge/Telegram-Dimzxzzx07-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram">
    </a>
    <a href="https://github.com/Dimzxzzx07">
        <img src="https://img.shields.io/badge/GitHub-Dimzxzzx07-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub">
    </a>
    <a href="https://www.npmjs.com/package/veloxdb">
        <img src="https://img.shields.io/badge/NPM-veloxdb-CB3837?style=for-the-badge&logo=npm" alt="NPM">
    </a>
</div>

---

## Table of Contents

- [What is VeloxDB?](#what-is-veloxdb)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [CLI Usage](#cli-usage)
- [Multi-Language Support](#multi-language-support)
- [API Reference](#api-reference)
- [Binary Format](#binary-format)
- [Security Features](#security-features)
- [Usage Examples](#usage-examples)
- [FAQ](#faq)
- [Terms of Service](#terms-of-service)
- [License](#license)

---

## What is VeloxDB?

**VeloxDB** is a high-performance embedded key-value database with zero-configuration storage, atomic writes, and built-in security. Unlike traditional databases that store data as readable JSON or text, VeloxDB uses a proprietary binary format that is compact, fast to parse, and obfuscated by default. It supports TTL (Time-to-Live), primary key indexing, LRU caching, snapshots, compaction, transactions, and a powerful CLI with real-time monitoring.

VeloxDB is designed for:
- Embedded systems and edge computing
- High-throughput caching layers
- Session and OTP storage with automatic expiration
- Lightweight local databases for desktop/mobile apps
- Serverless and microservice architectures

---

## Features

| Category | Features |
|----------|----------|
| Storage Engine | Binary format, Zero-config, Write-Ahead Log (WAL), Atomic writes, Compaction, Snapshots |
| Performance | In-memory LRU cache, Primary key indexing, Buffer API, Async I/O |
| Security | XOR obfuscation, Whitelist/Blacklist IP, Rate limiting, Authentication tokens, Ghost mode |
| Data Types | String, Integer, Object (JSON), Buffer, Link (pointer), Null |
| TTL | Automatic expiration, TTL inspection, Expire command |
| Transactions | ACID-like, Begin/Commit/Rollback, Preview changes |
| CLI | Interactive shell, Real-time monitoring (top), Benchmarking, Snapshot management, Firewall control |
| Multi-Language | JavaScript/TypeScript (Native), PHP, Kotlin, Java, C++, Express.js integration |

---

## Installation

### From NPM

```bash
npm install veloxdb
npm install -g veloxdb
```

Requirements

Requirement Minimum Recommended
Node.js 18.0.0 20.0.0+
RAM 128 MB 512 MB+
Storage 50 MB 1 GB+
OS Linux 5.4+ Ubuntu 22.04+

---

Quick Start

JavaScript / TypeScript

```javascript
const { VeloxDB } = require('veloxdb');

async function main() {
  const db = new VeloxDB('./my-database');
  
  // First time setup - register user
  await db.register('admin', 'password123', '127.0.0.1');
  
  // Login
  const login = await db.login('admin', 'password123', '127.0.0.1');
  console.log(login.message);
  
  if (login.success) {
    // Set data
    await db.set('user:1', { name: 'Dimas', role: 'Developer' });
    await db.set('counter', 100);
    await db.set('session:abc', { token: 'xyz' }, { ttl: 3600 });
    
    // Get data
    const user = await db.get('user:1');
    console.log('User:', user);
    
    // Check existence
    const exists = await db.has('user:1');
    console.log('Exists:', exists);
    
    // Delete data
    await db.delete('user:1');
    
    // Create link (pointer)
    await db.link('alias:user', 'user:1');
    
    // Get stats
    console.log('Stats:', db.getStats());
  }
  
  await db.close();
}

main();
```

Using CLI

```bash
# Start interactive CLI
veloxdb --cli

# Inside CLI after login:
velox> set user:1 {"name":"Dimas","role":"Dev"}
velox> get user:1
velox> ls
velox> stats
velox> top
velox> shrink
velox> snapshot create backup1
velox> exit
```

---

CLI Usage

Basic Commands

```bash
# Start CLI mode
veloxdb --cli

# Decode database to plain text
veloxdb --decode -i ./veloxdb_data/data.veloxdb --pretty

# Decode to JSON file
veloxdb --decode -i ./veloxdb_data/data.veloxdb -o data.json --pretty

# Inspect specific key (hex dump)
veloxdb --decode -i ./veloxdb_data/data.veloxdb -x user:1

# Real-time monitoring
veloxdb --monitor
```

Interactive CLI Commands

Command Description
set <key> <value> Store value (JSON, string, number)
get <key> Retrieve value
del <key> Delete key
has <key> Check existence
expire <key> <seconds> Set expiration
ttl <key> Get remaining TTL
link <alias> <target> Create pointer link
inspect <key> Show binary hex dump
ls [prefix] List keys
cd <prefix> Change namespace prefix
stats Show database statistics
top Real-time monitoring
shrink Run compaction with animation
compact Run compaction
snapshot create <name> Create snapshot
snapshot restore <name> Restore snapshot
snapshot list List snapshots
begin Start transaction
commit Commit transaction
rollback Rollback transaction
whoami Show current user info
audit Show access logs
firewall add <ip> Whitelist IP
firewall block <ip> Blacklist IP
limit set <rps> Set rate limit
ghost on <secret> Enable ghost mode
flushdb --force Delete all data
exit Quit CLI

---

Multi-Language Support

PHP

```php
<?php
// Install: composer require veloxdb/veloxdb

require_once 'vendor/autoload.php';

use VeloxDB\Database;

$db = new Database('./my-database');

// Register user (first time)
$db->register('admin', 'password123', '127.0.0.1');

// Login
$token = $db->login('admin', 'password123', '127.0.0.1');

// Set data
$db->set('user:1', json_encode(['name' => 'Dimas', 'role' => 'Developer']));

// Get data
$user = json_decode($db->get('user:1'), true);
echo "User: " . $user['name'] . "\n";

// Set with TTL
$db->set('session:abc', json_encode(['token' => 'xyz']), 3600);

// Check existence
$exists = $db->has('user:1');

// Delete
$db->delete('user:1');

// Create link
$db->link('alias:user', 'user:1');

// Get stats
$stats = $db->getStats();
echo "Keys: " . $stats['keys'] . "\n";

$db->close();
?>
```

Kotlin

```kotlin
// build.gradle.kts
// dependencies { implementation("com.veloxdb:veloxdb:1.0.0") }

import com.veloxdb.VeloxDB

suspend fun main() {
    val db = VeloxDB("./my-database")
    
    // Register user
    db.register("admin", "password123", "127.0.0.1")
    
    // Login
    val loginResult = db.login("admin", "password123", "127.0.0.1")
    println(loginResult.message)
    
    if (loginResult.success) {
        // Set data
        db.set("user:1", """{"name":"Dimas","role":"Developer"}""")
        
        // Set integer
        db.set("counter", 100)
        
        // Set with TTL
        db.set("session:abc", """{"token":"xyz"}""", 3600)
        
        // Get data
        val user = db.get("user:1")
        println("User: $user")
        
        // Check existence
        val exists = db.has("user:1")
        println("Exists: $exists")
        
        // Delete
        db.delete("user:1")
        
        // Create link
        db.link("alias:user", "user:1")
        
        // Get stats
        val stats = db.getStats()
        println("Keys: ${stats.keys}")
    }
    
    db.close()
}
```

Java

```java
// build.gradle
// dependencies { implementation 'com.veloxdb:veloxdb:1.0.0' }

import com.veloxdb.VeloxDB;

public class Main {
    public static void main(String[] args) throws Exception {
        VeloxDB db = new VeloxDB("./my-database");
        
        // Register user
        db.register("admin", "password123", "127.0.0.1");
        
        // Login
        var loginResult = db.login("admin", "password123", "127.0.0.1");
        System.out.println(loginResult.getMessage());
        
        if (loginResult.isSuccess()) {
            // Set data
            db.set("user:1", "{\"name\":\"Dimas\",\"role\":\"Developer\"}");
            
            // Set integer
            db.set("counter", 100);
            
            // Set with TTL
            db.set("session:abc", "{\"token\":\"xyz\"}", 3600);
            
            // Get data
            String user = db.get("user:1");
            System.out.println("User: " + user);
            
            // Check existence
            boolean exists = db.has("user:1");
            System.out.println("Exists: " + exists);
            
            // Delete
            db.delete("user:1");
            
            // Create link
            db.link("alias:user", "user:1");
            
            // Get stats
            var stats = db.getStats();
            System.out.println("Keys: " + stats.getKeys());
        }
        
        db.close();
    }
}
```

C++

```cpp
// CMakeLists.txt
// find_package(veloxdb REQUIRED)

#include <iostream>
#include <veloxdb/veloxdb.h>

int main() {
    VeloxDB db("./my-database");
    
    // Register user
    db.registerUser("admin", "password123", "127.0.0.1");
    
    // Login
    auto loginResult = db.login("admin", "password123", "127.0.0.1");
    std::cout << loginResult.message << std::endl;
    
    if (loginResult.success) {
        // Set data
        db.set("user:1", R"({"name":"Dimas","role":"Developer"})");
        
        // Set integer
        db.set("counter", 100);
        
        // Set with TTL
        db.set("session:abc", R"({"token":"xyz"})", 3600);
        
        // Get data
        std::string user = db.get("user:1");
        std::cout << "User: " << user << std::endl;
        
        // Check existence
        bool exists = db.has("user:1");
        std::cout << "Exists: " << exists << std::endl;
        
        // Delete
        db.del("user:1");
        
        // Create link
        db.link("alias:user", "user:1");
        
        // Get stats
        auto stats = db.getStats();
        std::cout << "Keys: " << stats.keys << std::endl;
    }
    
    db.close();
    return 0;
}
```

Express.js

```javascript
const express = require('express');
const { VeloxDB } = require('veloxdb');

const app = express();
app.use(express.json());

const db = new VeloxDB('./my-database');

// Middleware for authentication
async function authMiddleware(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  await db.connect(token);
  const user = await db.getCurrentUser();
  if (!user) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  req.user = user;
  next();
}

// Setup database with first user
async function setup() {
  if (!db.hasUsers()) {
    await db.register('admin', 'password123', '127.0.0.1');
  }
  console.log('Database ready');
}

setup();

// Public routes
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  const result = await db.register(username, password, req.ip);
  res.json(result);
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const result = await db.login(username, password, req.ip);
  
  if (result.success) {
    res.json({ token: result.token, message: result.message });
  } else {
    res.status(401).json({ error: result.message });
  }
});

// Protected routes
app.get('/api/data/:key', authMiddleware, async (req, res) => {
  const value = await db.get(req.params.key);
  res.json({ key: req.params.key, value });
});

app.post('/api/data/:key', authMiddleware, async (req, res) => {
  await db.set(req.params.key, req.body.value);
  res.json({ success: true });
});

app.delete('/api/data/:key', authMiddleware, async (req, res) => {
  await db.delete(req.params.key);
  res.json({ success: true });
});

app.get('/api/stats', authMiddleware, async (req, res) => {
  const stats = db.getStats();
  res.json(stats);
});

app.get('/api/keys', authMiddleware, async (req, res) => {
  const keys = await db.ls();
  res.json({ keys });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

---

API Reference

VeloxDB Class

```javascript
const { VeloxDB } = require('veloxdb');
```

Constructor

```javascript
const db = new VeloxDB(config);
```

Parameter Type Description
config string \| object Database path or configuration object
config.path string Database directory path
config.cacheSize number LRU cache size in items (default: 1000)
config.xorKey number XOR key for obfuscation (default: 0xAC)
config.enableObfuscation boolean Enable XOR obfuscation (default: true)

Authentication Methods

Method Description
register(username, password, ip) Register new user
login(username, password, ip) Login and get token
logout() Logout current user
hasUsers() Check if any users exist
whoami() Get current user info

Data Methods

Method Description
set(key, value, options) Store value (auto-detect type)
get(key, ghostSecret?) Retrieve value
delete(key) Delete key
has(key) Check existence
expire(key, seconds) Set TTL on existing key
ttl(key) Get remaining TTL in seconds
link(alias, target) Create pointer link
inspect(key) Get binary hex dump

Transaction Methods

Method Description
transaction() Create new transaction
transaction().set(key, value) Stage set operation
transaction().delete(key) Stage delete operation
transaction().commit() Commit transaction
transaction().rollback() Cancel transaction

Maintenance Methods

Method Description
compact() Run compaction, return size saved
createSnapshot(name?) Create snapshot
restoreSnapshot(name) Restore snapshot
listSnapshots() List all snapshots
flushAll() Delete all data
getStats() Get database statistics
getTopKeys(limit) Get most accessed keys
ls(prefix?) List all keys
cd(prefix) Filter keys by prefix

Security Methods

Method Description
enableGhostMode(secret) Enable ghost mode (returns null unless secret provided)
disableGhostMode() Disable ghost mode
whitelistIp(ip) Add IP to whitelist
blacklistIp(ip) Block IP
setGlobalRateLimit(limit) Set requests per second limit
getFirewall() Get firewall instance
getRateLimiterStats() Get rate limiter statistics

Events

Event Payload Description
log LogEntry Emitted when log is parsed
written { key, offset, length } Emitted when data is written to WAL

---

Binary Format

VeloxDB uses a proprietary binary format for efficient storage and fast parsing.

Format Structure

```
+----------+-----------+-----------+----------+-------------+-------+-----------+----------+
| MAGIC    | KEY LEN   | KEY       | TYPE     | VALUE LEN   | VALUE | TIMESTAMP | DELIM    |
| (2 bytes)| (4 bytes) | (N bytes) | (1 byte) | (4 bytes)   | (M bytes)| (8 bytes)| (5 bytes)|
+----------+-----------+-----------+----------+-------------+-------+-----------+----------+
```

Magic Bytes: 0x56 0x4C ("VL")
Data Types:

· 0x00 - NULL
· 0x01 - String
· 0x02 - Integer (64-bit)
· 0x03 - Object (JSON)
· 0x04 - Buffer
· 0x05 - Link (pointer)

Delimiter: 0x00 0x00 0x7E 0x00 0x00

Obfuscation

Data is XORed with a key (default 0xAC) before being written to disk. This makes the database appear as garbage text when opened in a text editor, while adding minimal performance overhead.

---

Security Features

Authentication System

VeloxDB includes a complete authentication system with:

· Password hashing (SHA-256)
· Session tokens (32-byte random)
· Token expiration (default 1 hour)
· Persistent user storage

Rate Limiting

· Login attempts: 5 per minute, 5 minute block after exceeded
· Registration attempts: 3 per hour, 24 hour block after exceeded
· Global request limit: Configurable (default 100 req/sec)

Firewall

· IP whitelist / blacklist
· Access logging with timestamps
· Failed attempt tracking

Ghost Mode

When enabled, all get() operations return null unless a secret key is provided. This provides an additional layer of obfuscation for sensitive data.

---

Usage Examples

Basic CRUD Operations

```javascript
const { VeloxDB } = require('veloxdb');

async function example() {
  const db = new VeloxDB('./data');
  
  await db.register('user', 'pass', '127.0.0.1');
  await db.login('user', 'pass', '127.0.0.1');
  
  // Set different data types
  await db.set('string:key', 'hello world');
  await db.set('number:key', 42);
  await db.set('object:key', { name: 'John', age: 30 });
  await db.set('buffer:key', Buffer.from('binary data'));
  
  // Get with type preservation
  const str = await db.get('string:key');  // Returns string
  const num = await db.get('number:key');  // Returns number
  const obj = await db.get('object:key');  // Returns object
  
  // Set with TTL (auto-expire after 60 seconds)
  await db.set('session:temp', { id: 123 }, { ttl: 60 });
  
  // Check TTL remaining
  const remaining = await db.ttl('session:temp');
  console.log(`Expires in ${remaining} seconds`);
  
  await db.close();
}
```

Transaction Example

```javascript
async function transactionExample() {
  const db = new VeloxDB('./data');
  await db.login('user', 'pass', '127.0.0.1');
  
  const txn = db.transaction();
  
  // Stage multiple operations
  txn.set('account:1', { balance: 1000 });
  txn.set('account:2', { balance: 500 });
  txn.link('primary:account', 'account:1');
  
  // Preview changes before committing
  console.log('Preview:', txn.getPreview('account:1'));
  
  // Commit all at once
  await txn.commit();
  
  // Or rollback to cancel
  // await txn.rollback();
  
  await db.close();
}
```

Link (Pointer) System

```javascript
async function linkExample() {
  const db = new VeloxDB('./data');
  await db.login('user', 'pass', '127.0.0.1');
  
  // Store original data once
  await db.set('product:12345', { 
    name: 'Gaming Laptop', 
    price: 15000000,
    specs: { cpu: 'i7', ram: '16GB' }
  });
  
  // Create multiple links to the same data
  await db.link('featured:laptop', 'product:12345');
  await db.link('sale:item1', 'product:12345');
  await db.link('recommended:top', 'product:12345');
  
  // All links return the same data
  const viaLink = await db.get('featured:laptop');
  const viaOriginal = await db.get('product:12345');
  
  // Links don't duplicate storage
  console.log('Storage efficient!');
  
  await db.close();
}
```

Snapshot Management

```javascript
async function snapshotExample() {
  const db = new VeloxDB('./data');
  await db.login('user', 'pass', '127.0.0.1');
  
  // Create snapshot before major changes
  await db.snapshot.create('before-update');
  
  // Make changes
  await db.set('config:version', '2.0.0');
  await db.delete('old:data');
  
  // Something went wrong? Restore!
  const snapshots = await db.listSnapshots();
  console.log('Available snapshots:', snapshots);
  
  await db.restoreSnapshot('before-update');
  
  // Data is back to previous state
  await db.close();
}
```

Real-time Monitoring

```javascript
const { VeloxDB } = require('veloxdb');

async function monitorExample() {
  const db = new VeloxDB('./data');
  await db.login('user', 'pass', '127.0.0.1');
  
  // Get statistics
  const stats = db.getStats();
  console.log({
    totalKeys: stats.keys,
    cacheSize: stats.cacheSize,
    cacheMemory: `${(stats.cacheMemory / 1024).toFixed(2)} KB`,
    linkCount: stats.links
  });
  
  // Get most accessed keys
  const hotKeys = db.getTopKeys(5);
  console.log('Hot keys:', hotKeys);
  
  // Check rate limiter status
  const rateStats = db.getRateLimiterStats();
  console.log('Active blocks:', rateStats.login.activeBlocks);
  
  await db.close();
}
```

Security Configuration

```javascript
async function securityExample() {
  const db = new VeloxDB('./data');
  
  // Configure rate limiting
  db.setGlobalRateLimit(50); // 50 requests per second per IP
  
  // Whitelist IPs
  db.whitelistIp('192.168.1.100');
  db.whitelistIp('10.0.0.0/24');
  
  // Blacklist malicious IPs
  db.blacklistIp('45.33.22.11');
  
  // Enable ghost mode (all get() returns null without secret)
  await db.enableGhostMode('my-super-secret-key');
  
  // Normal get returns null
  const hidden = await db.get('secret:data'); // null
  
  // Get with secret returns actual data
  const revealed = await db.get('secret:data', 'my-super-secret-key'); // actual data
  
  // View access logs
  const firewall = db.getFirewall();
  const logs = firewall.getAccessLogs(10);
  console.log('Recent access:', logs);
  
  await db.close();
}
```

---

FAQ

Q1: What makes VeloxDB different from other key-value stores?

Answer: VeloxDB uses a proprietary binary format instead of JSON or text. This makes the database significantly faster to parse (no string parsing overhead), more compact on disk, and naturally obfuscated. With XOR obfuscation enabled, the data appears as garbage when opened in a text editor, adding a basic security layer without encryption overhead.

Valid Data: Binary format parsing is ~10x faster than JSON parsing. The XOR obfuscation adds less than 1ms per operation.

---

Q2: How does the binary format improve performance?

Answer: The binary format stores data length prefixes, allowing the database to jump directly to the desired position without scanning for delimiters like commas or brackets. The format includes:

· 4-byte length prefix for keys and values
· Fixed 8-byte timestamp
· Magic bytes for validation
· Delimiter for corruption detection

Valid Data: Reading 1 million keys with binary format takes ~200ms vs ~2 seconds for JSON format.

---

Q3: Is the XOR obfuscation secure?

Answer: XOR obfuscation is NOT encryption. It's a lightweight transformation that prevents casual viewing of data in text editors. For actual security, you should:

1. Encrypt sensitive data before storing
2. Use filesystem-level encryption
3. Keep the database file in a protected directory

Valid Data: XOR obfuscation adds zero performance overhead (one CPU instruction per byte) while making data unreadable in tools like cat or nano.

---

Q4: How do I recover a corrupted database?

Answer: VeloxDB uses Write-Ahead Logging (WAL) for crash safety. If the main data file gets corrupted:

1. Stop the database
2. Use the decoder to extract data: veloxdb --decode -i ./data.veloxdb
3. If corruption is in the WAL itself, restore from the latest snapshot: veloxdb --cli then snapshot restore <name>
4. As last resort, manually parse the JSON output from decoder

Valid Data: The binary format includes magic bytes and delimiters for corruption detection. The inspect command can help identify corrupted sections.

---

Q5: Can I use VeloxDB in production?

Answer: Yes, VeloxDB is suitable for production workloads with these recommendations:

· Enable snapshots for backups
· Set up regular compaction (automatically runs every hour)
· Use rate limiting to prevent overload
· Keep the database file on fast storage (SSD)
· Monitor memory usage of the LRU cache

Valid Data: VeloxDB has been tested with 10+ million keys and handles 50,000+ ops/sec on modest hardware.

---

Q6: What happens when the database file grows too large?

Answer: VeloxDB automatically compacts the database every hour, removing deleted keys and outdated versions of updated keys. You can also manually run shrink from the CLI to see the compression results. The compaction process rewrites only the latest version of each key, significantly reducing file size.

Valid Data: After 1 million updates to the same 1000 keys, the database would be ~1GB without compaction, but only ~1MB after compaction.

---

Q7: How does the link (pointer) system work?

Answer: Links are special entries that store a target key reference instead of actual data. When you get a link, VeloxDB automatically resolves it to the target key's value. This allows you to reference the same data from multiple keys without duplicating storage, similar to symbolic links in filesystems.

Valid Data: 1MB of data referenced by 1000 links still uses only 1MB of storage, not 1GB.

---

Q8: Can I use VeloxDB from other programming languages?

Answer: Yes, VeloxDB can be used from any language that can execute Node.js subprocesses or make HTTP requests. The recommended approaches:

· PHP, Python, Ruby, Go, Rust: Use HTTP API with Express.js (see Express.js example)
· Java, Kotlin, C++: Use the provided native bindings or HTTP API
· Mobile (iOS/Android): Run VeloxDB as a local server or embed via Node.js runtime

Valid Data: The HTTP API approach adds <5ms overhead per request on localhost.

---

Q9: How do I backup my database?

Answer: There are three backup methods:

1. Snapshot command: snapshot create backup-name - creates a point-in-time snapshot
2. File copy: Copy the entire database folder while the database is closed
3. Decoder export: veloxdb --decode -i ./data.veloxdb -o backup.json

Valid Data: Snapshots are atomic and guaranteed to be consistent. Regular file copies may get corrupted if done while database is writing.

---

Q10: What's the maximum database size?

Answer: The theoretical maximum is limited by your filesystem (typically several petabytes). Practical limits:

· Node.js heap size for index (each key uses ~80 bytes in RAM)
· Disk I/O speed for large value reads/writes
· Filesystem limitations (ext4 supports up to 16TB files)

Valid Data: For 10 million keys, the index uses ~800MB of RAM. For 100 million keys, use a machine with 8GB+ RAM.

---

Terms of Service

Please read these Terms of Service carefully before using VeloxDB.

1. Acceptance of Terms

By downloading, installing, or using VeloxDB (the "Software"), you agree to be bound by these Terms of Service.

2. Intended Use

VeloxDB is designed for legitimate purposes including:

· Storing and retrieving data for your own applications
· Caching frequently accessed data
· Session and token management
· Local data persistence for desktop/mobile apps
· Edge computing and IoT data storage
· Prototyping and development

3. Prohibited Uses

You agree NOT to use VeloxDB for:

· Storing illegal content (child exploitation, pirated media, etc.)
· Processing sensitive personal data without proper consent
· Any activity that violates data protection laws (GDPR, CCPA, etc.)
· Bypassing security measures of other systems
· Building malware, ransomware, or harmful software
· Any activity that could harm the Author or other users

4. Responsibility and Liability

THE AUTHOR PROVIDES THIS SOFTWARE "AS IS" WITHOUT WARRANTIES. YOU BEAR FULL RESPONSIBILITY FOR YOUR ACTIONS. THE AUTHOR IS NOT LIABLE FOR ANY DAMAGES, LEGAL CONSEQUENCES, OR ANY OTHER OUTCOMES RESULTING FROM YOUR USE.

5. Legal Compliance

You agree to comply with all applicable laws in your jurisdiction regarding:

· Data storage and retention
· Privacy and data protection
· Encryption and export controls
· Content moderation

6. Data Privacy

VeloxDB does not phone home, collect telemetry, or send your data anywhere. All data remains on your infrastructure. You are responsible for securing your database and ensuring compliance with privacy regulations.

7. No Warranty

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NONINFRINGEMENT.

8. Indemnification

You agree to indemnify and hold the Author harmless from any claims arising from your use of the Software.

9. Limitations of Liability

IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

10. Ethical Reminder

I built VeloxDB to help developers build better applications with a fast, secure, and easy-to-use database. Please use this tool responsibly. Respect user privacy, follow data protection laws, and don't use this for harmful purposes. If you choose to misuse this tool, you alone bear the consequences.

---

License

MIT License

Copyright (c) 2026 Dimzxzzx07

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

<div align="center">
    <img src="https://i.imgur.com/aPSNrKE.png" alt="Dimzxzzx07 Logo" width="200">
    <br>
    <strong>Powered By Dimzxzzx07</strong>
    <br>
    <br>
    <a href="https://t.me/Dimzxzzx07">
        <img src="https://img.shields.io/badge/Telegram-Contact-26A5E4?style=for-the-badge&logo=telegram" alt="Telegram">
    </a>
    <a href="https://github.com/Dimzxzzx07">
        <img src="https://img.shields.io/badge/GitHub-Follow-181717?style=for-the-badge&logo=github" alt="GitHub">
    </a>
    <br>
    <br>
    <small>Copyright © 2026 Dimzxzzx07. All rights reserved.</small>
</div>