
#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load package scripts
const packageScriptsPath = path.join(__dirname, 'package-scripts.json');
const packageScripts = JSON.parse(fs.readFileSync(packageScriptsPath, 'utf8'));

const scriptName = process.argv[2];
const scriptArgs = process.argv.slice(3).join(' ');

if (!scriptName) {
  console.log('Available test scripts:');
  Object.keys(packageScripts.scripts).forEach(script => {
    console.log(`  npm run ${script}`);
  });
  process.exit(0);
}

const scriptCommand = packageScripts.scripts[scriptName];
if (!scriptCommand) {
  console.error(`Script "${scriptName}" not found`);
  process.exit(1);
}

try {
  console.log(`Running: ${scriptCommand} ${scriptArgs}`);
  execSync(`${scriptCommand} ${scriptArgs}`, { stdio: 'inherit' });
} catch (error) {
  console.error(`Script failed with exit code ${error.status}`);
  process.exit(error.status || 1);
}
