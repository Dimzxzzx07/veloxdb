import * as readline from 'readline';
import { VeloxDB } from '../veloxdb';
import { Commands } from './commands';

export class REPL {
  private rl: readline.Interface;
  private db: VeloxDB;
  private commands: Commands;

  constructor(db: VeloxDB) {
    this.db = db;
    this.commands = new Commands(db);
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'velox> '
    });
  }

  start(): void {
    this.rl.prompt();
    
    this.rl.on('line', async (line: string) => {
      const result = await this.commands.execute(line);
      if (result) {
        console.log(result);
      }
      this.rl.prompt();
    });
    
    this.rl.on('close', () => {
      console.log('\nGoodbye!');
      process.exit(0);
    });
  }
}