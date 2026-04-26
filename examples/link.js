const { VeloxDB } = require('../dist');

async function main() {
  const db = new VeloxDB('./data/link-db');
  
  await db.register('user', 'pass', '127.0.0.1');
  await db.login('user', 'pass', '127.0.0.1');
  
  await db.set('product:12345', { name: 'Laptop', price: 15000000 });
  console.log('Original product stored');
  
  await db.link('featured:laptop', 'product:12345');
  console.log('Created link: featured:laptop → product:12345');
  
  const viaOriginal = await db.get('product:12345');
  const viaLink = await db.get('featured:laptop');
  
  console.log('Via original:', viaOriginal);
  console.log('Via link:', viaLink);
  
  const inspection = await db.inspect('featured:laptop');
  console.log('\nLink binary inspection:');
  console.log('Hex:', inspection?.hex.slice(0, 60) + '...');
  
  await db.close();
}

main().catch(console.error);