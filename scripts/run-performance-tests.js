
#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Comprehensive Performance Testing Suite\n');

// Ensure results directory exists
const resultsDir = './test-results';
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

// Performance test results
let performanceResults = {
  timestamp: new Date().toISOString(),
  suites: {}
};

async function runPerformanceTests() {
  console.log('📊 Running Unit Performance Tests...');
  try {
    execSync('npx vitest run --config vitest.performance.config.ts', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    // Read performance results if available
    const perfResultsPath = './test-results/performance-results.json';
    if (fs.existsSync(perfResultsPath)) {
      const perfData = JSON.parse(fs.readFileSync(perfResultsPath, 'utf8'));
      performanceResults.suites.unit = perfData;
    }
    
    console.log('✅ Unit Performance Tests Completed\n');
  } catch (error) {
    console.error('❌ Unit Performance Tests Failed:', error.message);
    performanceResults.suites.unit = { error: error.message };
  }
}

async function runLoadTests() {
  console.log('🔄 Running Load Tests...');
  try {
    execSync('npx playwright test --config playwright.performance.config.ts', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    // Read load test results if available
    const loadResultsPath = './playwright-report/load-results.json';
    if (fs.existsSync(loadResultsPath)) {
      const loadData = JSON.parse(fs.readFileSync(loadResultsPath, 'utf8'));
      performanceResults.suites.load = loadData;
    }
    
    console.log('✅ Load Tests Completed\n');
  } catch (error) {
    console.error('❌ Load Tests Failed:', error.message);
    performanceResults.suites.load = { error: error.message };
  }
}

async function generateReport() {
  console.log('📋 Generating Performance Report...');
  
  const reportPath = './test-results/performance-summary.json';
  fs.writeFileSync(reportPath, JSON.stringify(performanceResults, null, 2));
  
  // Generate human-readable report
  const readableReportPath = './test-results/performance-summary.md';
  let markdownReport = `# Performance Test Summary\n\n`;
  markdownReport += `**Generated:** ${performanceResults.timestamp}\n\n`;
  
  // Unit Performance Tests
  if (performanceResults.suites.unit) {
    markdownReport += `## Unit Performance Tests\n\n`;
    if (performanceResults.suites.unit.error) {
      markdownReport += `❌ **Status:** Failed\n`;
      markdownReport += `**Error:** ${performanceResults.suites.unit.error}\n\n`;
    } else {
      markdownReport += `✅ **Status:** Completed\n\n`;
    }
  }
  
  // Load Tests
  if (performanceResults.suites.load) {
    markdownReport += `## Load Tests\n\n`;
    if (performanceResults.suites.load.error) {
      markdownReport += `❌ **Status:** Failed\n`;
      markdownReport += `**Error:** ${performanceResults.suites.load.error}\n\n`;
    } else {
      markdownReport += `✅ **Status:** Completed\n\n`;
    }
  }
  
  markdownReport += `## Recommendations\n\n`;
  markdownReport += `- Monitor memory usage trends\n`;
  markdownReport += `- Set up automated performance regression detection\n`;
  markdownReport += `- Consider implementing performance budgets\n`;
  markdownReport += `- Schedule regular load testing in CI/CD pipeline\n`;
  
  fs.writeFileSync(readableReportPath, markdownReport);
  
  console.log(`📊 Performance report saved to: ${reportPath}`);
  console.log(`📝 Readable report saved to: ${readableReportPath}`);
}

async function main() {
  try {
    await runPerformanceTests();
    await runLoadTests();
    await generateReport();
    
    console.log('\n🎉 Performance Testing Suite Completed Successfully!');
    console.log('Check ./test-results/ for detailed reports');
    
  } catch (error) {
    console.error('\n💥 Performance Testing Suite Failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { runPerformanceTests, runLoadTests, generateReport };
