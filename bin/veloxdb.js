const { spawn } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);

if (args.includes('--cli') || args.includes('-c') || args.length === 0) {
  require('../dist/cli/cli.js');
} else if (args.includes('--decode') || args.includes('-d')) {
  require('../dist/cli/decoder.js');
} else if (args.includes('--monitor') || args.includes('-m')) {
  require('../dist/cli/monitor.js');
} else {
  console.log(`
VeloxDB - High Performance Database

Usage:
  veloxdb --cli          Start interactive CLI mode
  veloxdb --decode <file>  Decode database file to plain text
  veloxdb --monitor      Start real-time monitoring
  veloxdb --help         Show this help

Examples:
  veloxdb --cli
  veloxdb --decode ./data.veloxdb --output data.json
  veloxdb --monitor
`);
}