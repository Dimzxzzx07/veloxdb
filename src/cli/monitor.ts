import { VeloxDB } from '../veloxdb';

async function main() {
  const dbPath = process.env.VELOXDB_PATH || './veloxdb_data';
  const db = new VeloxDB(dbPath);
  
  const hasUsers = db.hasUsers();
  if (hasUsers) {
    console.log('Please login via CLI first: veloxdb --cli');
    process.exit(1);
  }
  
  await (db as any).connectInternal();
  
  console.log('\n=== VeloxDB Monitor ===\n');
  console.log('Press Ctrl+C to exit\n');
  
  const interval = setInterval(() => {
    const stats = db.getStats();
    const topKeys = db.getTopKeys(5);
    
    console.clear();
    console.log(`=== VeloxDB Monitor - ${new Date().toLocaleTimeString()} ===\n`);
    console.log(`Database Stats:`);
    console.log(`  Keys: ${stats.keys}`);
    console.log(`  Links: ${stats.links}`);
    console.log(`  Cache: ${stats.cacheSize} items (${(stats.cacheMemory / 1024).toFixed(2)} KB)`);
    console.log(`  Path: ${stats.path}\n`);
    
    console.log(`Most Active Keys:`);
    for (const item of topKeys) {
      console.log(`  ${item.key}: ${item.accessCount} accesses`);
    }
    
    const rateStats = db.getRateLimiterStats();
    console.log(`\nSecurity:`);
    console.log(`  Active blocks: ${rateStats.login.activeBlocks}`);
    
  }, 1000);
  
  process.on('SIGINT', async () => {
    console.log('\n\nShutting down monitor...');
    clearInterval(interval);
    await db.close();
    process.exit(0);
  });
}

main().catch(console.error);