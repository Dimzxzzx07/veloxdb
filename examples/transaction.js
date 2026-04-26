const { VeloxDB } = require('../dist');

async function main() {
  const db = new VeloxDB('./data/txn-db');
  
  await db.register('user', 'pass', '127.0.0.1');
  await db.login('user', 'pass', '127.0.0.1');
  
  console.log('=== Starting Transaction ===');
  const txn = db.transaction();
  
  txn.set('account:1', { balance: 1000 });
  txn.set('account:2', { balance: 500 });
  txn.link('acc:primary', 'account:1');
  
  console.log('Preview account:1:', txn.getPreview('account:1'));
  console.log('Preview link:', txn.getPreview('acc:primary'));
  
  console.log('\nCommitting transaction...');
  await txn.commit();
  
  const acc1 = await db.get('account:1');
  const acc2 = await db.get('account:2');
  const link = await db.get('acc:primary');
  
  console.log('Committed values:', { acc1, acc2, link });
  
  await db.close();
}

main().catch(console.error);