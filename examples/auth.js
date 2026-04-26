const { VeloxDB } = require('../dist');

async function main() {
  const db = new VeloxDB('./data/auth-db');
  
  console.log('=== Registration ===');
  const reg = await db.register('alice', 'securepass123', '192.168.1.100');
  console.log(reg.message);
  
  console.log('\n=== Failed Login ===');
  const badLogin = await db.login('alice', 'wrongpass', '192.168.1.100');
  console.log(badLogin.message);
  
  console.log('\n=== Successful Login ===');
  const goodLogin = await db.login('alice', 'securepass123', '192.168.1.100');
  console.log(goodLogin.message);
  
  if (goodLogin.success) {
    await db.set('secret', 'classified data');
    console.log('\nData stored');
    
    const whoami = await db.whoami();
    console.log('Whoami:', whoami);
    
    const rateStats = db.getRateLimiterStats();
    console.log('Rate limiter stats:', rateStats);
    
    await db.close();
  }
}

main().catch(console.error);