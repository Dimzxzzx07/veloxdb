import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { VeloxDB } from '../veloxdb';
import { Banner } from './banner';
import { Commands } from './commands';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

async function main() {
  const dbPath = process.env.VELOXDB_PATH || './veloxdb_data';
  const tokenPath = path.join(dbPath, '.token');
  
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
  }
  
  const db = new VeloxDB(dbPath);
  const commands = new Commands(db);
  
  let token: string | null = null;
  if (fs.existsSync(tokenPath)) {
    token = fs.readFileSync(tokenPath, 'utf8').trim();
  }
  
  if (!db.hasUsers()) {
    console.log('\n=== First Time Setup ===\n');
    const username = await question('Create username: ');
    const password = await question('Create password: ');
    const confirm = await question('Confirm password: ');
    
    if (password !== confirm) {
      console.log('Passwords do not match. Exiting.');
      process.exit(1);
    }
    
    const result = await db.register(username, password, '127.0.0.1');
    if (!result.success) {
      console.log(`Registration failed: ${result.message}`);
      process.exit(1);
    }
    
    console.log('\nUser created successfully!\n');
  }
  
  let validToken = false;
  if (token) {
    try {
      const loginResult = await db.login('dummy', 'dummy', '127.0.0.1');
      validToken = false;
    } catch {
      validToken = false;
    }
  }
  
  if (!validToken) {
    console.log('\n=== VeloxDB Login ===\n');
    const username = await question('Username: ');
    const password = await question('Password: ');
    
    const result = await db.login(username, password, '127.0.0.1');
    if (!result.success) {
      console.log(`\nLogin failed: ${result.message}`);
      process.exit(1);
    }
    
    if (result.token) {
      fs.writeFileSync(tokenPath, result.token);
    }
    console.log('\nLogin successful!\n');
  }
  
  console.log(Banner.getSystemInfo(dbPath));
  console.log(Banner.getPrompt());
  
  const prompt = Banner.getPrompt();
  process.stdout.write(prompt);
  
  rl.on('line', async (input: string) => {
    if (input.trim() === '') {
      process.stdout.write(prompt);
      return;
    }
    
    const result = await commands.execute(input);
    if (result) {
      console.log(result);
    }
    process.stdout.write(prompt);
  });
  
  rl.on('close', async () => {
    await db.close();
    process.exit(0);
  });
}

main().catch(console.error);