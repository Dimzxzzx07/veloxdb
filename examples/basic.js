const { VeloxDB } = require('../dist');

async function main() {
  const db = new VeloxDB('./data/my-db');
  
  const registerResult = await db.register('admin', 'password123', '127.0.0.1');
  console.log('Register:', registerResult.message);
  
  const loginResult = await db.login('admin', 'password123', '127.0.0.1');
  console.log('Login:', loginResult.message);
  
  if (loginResult.success) {
    await db.set('user:1', { name: 'Dimas', role: 'Dev' });
    console.log('Data saved');
    
    const user = await db.get('user:1');
    console.log('Retrieved:', user);
    
    await db.link('user:dimas', 'user:1');
    const viaLink = await db.get('user:dimas');
    console.log('Via link:', viaLink);
    
    await db.expire('user:1', 10);
    const ttl = await db.ttl('user:1');
    console.log('TTL:', ttl, 'seconds');
    
    console.log('Stats:', db.getStats());
    
    await db.close();
  }
}

main().catch(console.error);