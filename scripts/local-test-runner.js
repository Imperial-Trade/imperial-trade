
#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const testCommands = {
  'unit': 'npx vitest run --coverage',
  'security': 'npx vitest run src/__tests__/security --reporter=verbose',
  'integration': 'npx vitest run --config vitest.integration.config.ts',
  'performance': 'npx vitest run --config vitest.performance.config.ts',
  'e2e': 'npx playwright test',
  'visual': 'npx playwright test --config playwright.visual.config.ts',
  'load': 'npx playwright test --config playwright.performance.config.ts',
  'maintenance': 'npx playwright test src/__tests__/maintenance',
  'monitoring': 'npx playwright test src/__tests__/monitoring',
  'all': 'node scripts/run-comprehensive-tests.js'
};

const testType = process.argv[2];

if (!testType || !testCommands[testType]) {
  console.log('Usage: node scripts/local-test-runner.js <test-type>');
  console.log('\nAvailable test types:');
  Object.keys(testCommands).forEach(type => {
    console.log(`  ${type}: ${testCommands[type]}`);
  });
  process.exit(1);
}

console.log(`🧪 Running ${testType} tests...`);
console.log(`Command: ${testCommands[testType]}\n`);

const [command, ...args] = testCommands[testType].split(' ');
const child = spawn(command, args, {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd()
});

child.on('close', (code) => {
  if (code === 0) {
    console.log(`\n✅ ${testType} tests completed successfully!`);
  } else {
    console.log(`\n❌ ${testType} tests failed with exit code ${code}`);
  }
  process.exit(code);
});

child.on('error', (error) => {
  console.error(`\n❌ Failed to start ${testType} tests:`, error.message);
  process.exit(1);
});
