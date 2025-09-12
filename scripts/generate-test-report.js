#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class TestReportGenerator {
  constructor() {
    this.resultsDir = 'test-results';
    this.reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0
      },
      suites: []
    };
  }

  async generateReport() {
    console.log('📊 Generating comprehensive test report...');
    
    // Ensure results directory exists
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }

    // Collect results from different test suites
    await this.collectUnitTestResults();
    await this.collectE2EResults();
    await this.collectPerformanceResults();

    // Generate reports
    await this.generateJSONReport();
    await this.generateMarkdownReport();
    
    console.log('✅ Test report generated successfully');
  }

  async collectUnitTestResults() {
    const coveragePath = path.join('coverage', 'coverage-summary.json');
    if (fs.existsSync(coveragePath)) {
      try {
        const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
        this.reportData.suites.push({
          name: 'Unit Tests',
          type: 'unit',
          coverage: coverage.total,
          status: 'passed'
        });
      } catch (error) {
        console.warn('Could not parse coverage results:', error.message);
      }
    }
  }

  async collectE2EResults() {
    const e2eResultsPath = path.join('playwright-report', 'results.json');
    if (fs.existsSync(e2eResultsPath)) {
      try {
        const results = JSON.parse(fs.readFileSync(e2eResultsPath, 'utf8'));
        this.reportData.suites.push({
          name: 'E2E Tests',
          type: 'e2e',
          results: results,
          status: results.stats?.failed > 0 ? 'failed' : 'passed'
        });
      } catch (error) {
        console.warn('Could not parse E2E results:', error.message);
      }
    }
  }

  async collectPerformanceResults() {
    const perfResultsPath = path.join(this.resultsDir, 'performance-results.json');
    if (fs.existsSync(perfResultsPath)) {
      try {
        const results = JSON.parse(fs.readFileSync(perfResultsPath, 'utf8'));
        this.reportData.suites.push({
          name: 'Performance Tests',
          type: 'performance',
          results: results,
          status: 'passed'
        });
      } catch (error) {
        console.warn('Could not parse performance results:', error.message);
      }
    }
  }

  async generateJSONReport() {
    const reportPath = path.join(this.resultsDir, 'comprehensive-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.reportData, null, 2));
    console.log(`📄 JSON report saved to: ${reportPath}`);
  }

  async generateMarkdownReport() {
    const reportPath = path.join(this.resultsDir, 'comprehensive-test-report.md');
    
    let markdown = `# Comprehensive Test Report\n\n`;
    markdown += `**Generated:** ${this.reportData.timestamp}\n\n`;
    
    markdown += `## Summary\n\n`;
    markdown += `| Metric | Value |\n`;
    markdown += `|--------|-------|\n`;
    markdown += `| Total Suites | ${this.reportData.suites.length} |\n`;
    markdown += `| Passed | ${this.reportData.suites.filter(s => s.status === 'passed').length} |\n`;
    markdown += `| Failed | ${this.reportData.suites.filter(s => s.status === 'failed').length} |\n\n`;

    markdown += `## Test Suites\n\n`;
    this.reportData.suites.forEach(suite => {
      const status = suite.status === 'passed' ? '✅' : '❌';
      markdown += `### ${status} ${suite.name}\n`;
      markdown += `- **Type:** ${suite.type}\n`;
      markdown += `- **Status:** ${suite.status}\n\n`;
    });

    fs.writeFileSync(reportPath, markdown);
    console.log(`📄 Markdown report saved to: ${reportPath}`);
  }
}

// Run if called directly
if (require.main === module) {
  const generator = new TestReportGenerator();
  generator.generateReport().catch(error => {
    console.error('Failed to generate test report:', error);
    process.exit(1);
  });
}

module.exports = { TestReportGenerator };