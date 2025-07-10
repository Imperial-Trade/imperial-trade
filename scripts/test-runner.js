
#!/usr/bin/env node

const { execSync } = require('child_process');

const testCommands = {
  'unit': 'npm run test:unit',
  'security': 'npm run test:security',
  'integration': 'npm run test:integration',
  'performance': 'npm run test:performance',
  'e2e': 'npm run test:e2e',
  'visual': 'npm run test:visual',
  'load': 'npm run test:load',
  'maintenance': 'npm run test:maintenance',
  'monitoring': 'npm run test:monitoring',
  'comprehensive': 'npm run test:comprehensive',
  'all': 'npm run test:comprehensive'
};

const testType = process.argv[2];

if (!testType || !testCommands[testType]) {
  console.log('Usage: node scripts/test-runner.js <test-type>');
  console.log('\nAvailable test types:');
  Object.keys(testCommands).forEach(type => {
    console.log(`  ${type}`);
  });
  process.exit(1);
}

console.log(`🧪 Running ${testType} tests...`);
console.log(`Command: ${testCommands[testType]}\n`);

try {
  execSync(testCommands[testType], { stdio: 'inherit' });
  console.log(`\n✅ ${testType} tests completed successfully!`);
} catch (error) {
  console.log(`\n❌ ${testType} tests failed with exit code ${error.status}`);
  process.exit(error.status || 1);
}
