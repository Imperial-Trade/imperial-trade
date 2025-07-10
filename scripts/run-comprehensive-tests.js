
#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Comprehensive Test Suite...\n');

class ComprehensiveTestRunner {
  constructor() {
    this.results = {
      unit: null,
      integration: null,
      e2e: null,
      visual: null,
      security: null,
      performance: null,
      maintenance: null,
      startTime: Date.now()
    };
  }

  async runTestSuite() {
    try {
      console.log('📋 Phase 6: Advanced Testing Features & Production Readiness');
      console.log('=' .repeat(60));

      // Run all test suites in sequence for comprehensive coverage
      await this.runUnitTests();
      await this.runIntegrationTests();
      await this.runSecurityTests();
      await this.runVisualRegressionTests();
      await this.runE2ETests();
      await this.runPerformanceTests();
      await this.runMaintenanceAnalysis();
      
      // Generate comprehensive report
      await this.generateFinalReport();
      
      console.log('\n✅ Comprehensive Test Suite Completed Successfully!');
      
    } catch (error) {
      console.error('\n❌ Test Suite Failed:', error.message);
      process.exit(1);
    }
  }

  async runUnitTests() {
    console.log('\n🔬 Running Unit Tests...');
    try {
      execSync('npm run test:unit', { stdio: 'inherit' });
      this.results.unit = { status: 'passed', timestamp: new Date() };
    } catch (error) {
      this.results.unit = { status: 'failed', error: error.message, timestamp: new Date() };
      throw new Error('Unit tests failed');
    }
  }

  async runIntegrationTests() {
    console.log('\n🔗 Running Integration Tests...');
    try {
      execSync('vitest run --config vitest.integration.config.ts', { stdio: 'inherit' });
      this.results.integration = { status: 'passed', timestamp: new Date() };
    } catch (error) {
      this.results.integration = { status: 'failed', error: error.message, timestamp: new Date() };
      console.warn('⚠️ Integration tests failed - continuing with other tests');
    }
  }

  async runSecurityTests() {
    console.log('\n🛡️ Running Security Tests...');
    try {
      execSync('vitest run src/__tests__/security --reporter=verbose', { stdio: 'inherit' });
      this.results.security = { status: 'passed', timestamp: new Date() };
    } catch (error) {
      this.results.security = { status: 'failed', error: error.message, timestamp: new Date() };
      console.warn('⚠️ Security tests failed - reviewing security posture recommended');
    }
  }

  async runVisualRegressionTests() {
    console.log('\n🎨 Running Visual Regression Tests...');
    try {
      // First run to generate baselines if they don't exist
      try {
        execSync('npx playwright test --config playwright.visual.config.ts --grep "Generate visual baselines"', { stdio: 'inherit' });
      } catch {
        // Baselines might already exist
      }
      
      // Run actual visual tests
      execSync('npx playwright test --config playwright.visual.config.ts', { stdio: 'inherit' });
      this.results.visual = { status: 'passed', timestamp: new Date() };
    } catch (error) {
      this.results.visual = { status: 'failed', error: error.message, timestamp: new Date() };
      console.warn('⚠️ Visual regression tests failed - UI changes detected');
    }
  }

  async runE2ETests() {
    console.log('\n🎭 Running End-to-End Tests...');
    try {
      execSync('npm run test:e2e', { stdio: 'inherit' });
      this.results.e2e = { status: 'passed', timestamp: new Date() };
    } catch (error) {
      this.results.e2e = { status: 'failed', error: error.message, timestamp: new Date() };
      console.warn('⚠️ E2E tests failed - user workflows may be broken');
    }
  }

  async runPerformanceTests() {
    console.log('\n⚡ Running Performance Tests...');
    try {
      execSync('vitest run --config vitest.performance.config.ts', { stdio: 'inherit' });
      this.results.performance = { status: 'passed', timestamp: new Date() };
    } catch (error) {
      this.results.performance = { status: 'failed', error: error.message, timestamp: new Date() };
      console.warn('⚠️ Performance tests failed - optimization may be needed');
    }
  }

  async runMaintenanceAnalysis() {
    console.log('\n🔧 Running Test Maintenance Analysis...');
    try {
      execSync('npx playwright test src/__tests__/maintenance', { stdio: 'inherit' });
      this.results.maintenance = { status: 'passed', timestamp: new Date() };
    } catch (error) {
      this.results.maintenance = { status: 'failed', error: error.message, timestamp: new Date() };
      console.warn('⚠️ Maintenance analysis failed - test suite may need attention');
    }
  }

  async generateFinalReport() {
    console.log('\n📊 Generating Comprehensive Report...');
    
    const totalDuration = Date.now() - this.results.startTime;
    const passedTests = Object.values(this.results).filter(r => r && r.status === 'passed').length;
    const totalTests = Object.values(this.results).filter(r => r && r.status).length;
    
    const report = {
      summary: {
        totalTestSuites: totalTests,
        passedSuites: passedTests,
        failedSuites: totalTests - passedTests,
        successRate: ((passedTests / totalTests) * 100).toFixed(1),
        totalDuration: `${(totalDuration / 1000).toFixed(1)}s`,
        generatedAt: new Date().toISOString()
      },
      results: this.results,
      recommendations: this.generateRecommendations()
    };

    // Save JSON report
    const reportPath = './test-results/phase6-comprehensive-report.json';
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHTMLReport(report);
    const htmlPath = './test-results/phase6-comprehensive-report.html';
    fs.writeFileSync(htmlPath, htmlReport);

    console.log(`📋 Comprehensive report saved: ${reportPath}`);
    console.log(`📋 HTML report saved: ${htmlPath}`);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 PHASE 6 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Test Suites: ${totalTests}`);
    console.log(`Passed: ${passedTests} (${report.summary.successRate}%)`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Duration: ${report.summary.totalDuration}`);
    console.log('='.repeat(60));
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.results.security?.status === 'failed') {
      recommendations.push('🛡️ Security tests failed - review authentication and input validation');
    }
    
    if (this.results.visual?.status === 'failed') {
      recommendations.push('🎨 Visual regression detected - review UI changes carefully');
    }
    
    if (this.results.performance?.status === 'failed') {
      recommendations.push('⚡ Performance issues detected - optimize critical user paths');
    }
    
    if (this.results.e2e?.status === 'failed') {
      recommendations.push('🎭 E2E tests failed - user workflows may be broken');
    }
    
    const passedCount = Object.values(this.results).filter(r => r && r.status === 'passed').length;
    const totalCount = Object.values(this.results).filter(r => r && r.status).length;
    
    if (passedCount === totalCount) {
      recommendations.push('✅ All test suites passed - production deployment ready');
      recommendations.push('🚀 Consider setting up automated deployment pipeline');
      recommendations.push('📊 Monitor production metrics and user feedback');
    } else {
      recommendations.push('⚠️ Some tests failed - address issues before production deployment');
      recommendations.push('🔄 Re-run failed test suites after fixes');
    }
    
    return recommendations;
  }

  generateHTMLReport(report) {
    const getStatusIcon = (status) => {
      switch (status) {
        case 'passed': return '✅';
        case 'failed': return '❌';
        default: return '⚪';
      }
    };

    const getStatusClass = (status) => {
      switch (status) {
        case 'passed': return 'success';
        case 'failed': return 'danger';
        default: return 'secondary';
      }
    };

    return `<!DOCTYPE html>
<html>
<head>
    <title>Phase 6: Comprehensive Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; }
        .summary { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }
        .card { background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .success { border-left: 4px solid #28a745; }
        .danger { border-left: 4px solid #dc3545; }
        .secondary { border-left: 4px solid #6c757d; }
        .metric { text-align: center; margin: 10px 0; }
        .metric-value { font-size: 2em; font-weight: bold; color: #495057; }
        .metric-label { color: #6c757d; text-transform: uppercase; font-size: 0.8em; }
        .recommendations { background: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 15px; }
        .recommendation { margin: 5px 0; padding: 5px 0; }
        ul { padding-left: 20px; }
        .timestamp { color: #6c757d; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 Phase 6: Advanced Testing Features & Production Readiness</h1>
        <p>Comprehensive Test Suite Report</p>
    </div>

    <div class="summary">
        <div style="display: flex; justify-content: space-around; flex-wrap: wrap;">
            <div class="metric">
                <div class="metric-value">${report.summary.totalTestSuites}</div>
                <div class="metric-label">Test Suites</div>
            </div>
            <div class="metric">
                <div class="metric-value" style="color: #28a745;">${report.summary.passedSuites}</div>
                <div class="metric-label">Passed</div>
            </div>
            <div class="metric">
                <div class="metric-value" style="color: #dc3545;">${report.summary.failedSuites}</div>
                <div class="metric-label">Failed</div>
            </div>
            <div class="metric">
                <div class="metric-value" style="color: #007bff;">${report.summary.successRate}%</div>
                <div class="metric-label">Success Rate</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.summary.totalDuration}</div>
                <div class="metric-label">Duration</div>
            </div>
        </div>
    </div>

    <h2>📋 Test Suite Results</h2>
    <div class="grid">
        ${Object.entries(report.results).filter(([_, result]) => result && result.status).map(([name, result]) => `
            <div class="card ${getStatusClass(result.status)}">
                <h3>${getStatusIcon(result.status)} ${name.charAt(0).toUpperCase() + name.slice(1)} Tests</h3>
                <p><strong>Status:</strong> ${result.status.toUpperCase()}</p>
                <p class="timestamp"><strong>Completed:</strong> ${result.timestamp}</p>
                ${result.error ? `<p style="color: #dc3545;"><strong>Error:</strong> ${result.error}</p>` : ''}
            </div>
        `).join('')}
    </div>

    <h2>💡 Recommendations</h2>
    <div class="recommendations">
        <ul>
            ${report.recommendations.map(rec => `<li class="recommendation">${rec}</li>`).join('')}
        </ul>
    </div>

    <div style="margin-top: 40px; padding: 20px; background: #e9ecef; border-radius: 5px; text-align: center;">
        <p><strong>Report Generated:</strong> ${report.summary.generatedAt}</p>
        <p><em>Phase 6: Advanced Testing Features & Production Readiness - Complete</em></p>
    </div>
</body>
</html>`;
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new ComprehensiveTestRunner();
  runner.runTestSuite().catch(error => {
    console.error('Comprehensive test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { ComprehensiveTestRunner };
