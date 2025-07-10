
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('📋 Generating Comprehensive Test Report...\n');

class TestReportGenerator {
  constructor() {
    this.reports = {
      unit: null,
      integration: null,
      e2e: null,
      performance: null,
      load: null,
      coverage: null,
      qualityGates: null
    };
    this.summary = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      duration: 0,
      coverage: null
    };
  }

  loadReports() {
    console.log('📁 Loading test reports...');

    // Load various test reports
    this.loadReport('unit', 'test-results/unit-results.json');
    this.loadReport('integration', 'test-results/integration-results.json');
    this.loadReport('e2e', 'playwright-report/results.json');
    this.loadReport('performance', 'test-results/performance-results.json');
    this.loadReport('load', 'test-results/load-results.json');
    this.loadReport('coverage', 'coverage/coverage-summary.json');
    this.loadReport('qualityGates', 'test-results/quality-gates-report.json');
  }

  loadReport(type, filePath) {
    try {
      if (fs.existsSync(filePath)) {
        this.reports[type] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        console.log(`✅ Loaded ${type} report`);
      } else {
        console.log(`⚠️ ${type} report not found: ${filePath}`);
      }
    } catch (error) {
      console.log(`❌ Error loading ${type} report: ${error.message}`);
    }
  }

  calculateSummary() {
    console.log('🧮 Calculating test summary...');

    // Unit tests
    if (this.reports.unit) {
      this.addTestResults(this.reports.unit);
    }

    // Integration tests
    if (this.reports.integration) {
      this.addTestResults(this.reports.integration);
    }

    // E2E tests
    if (this.reports.e2e) {
      this.addE2EResults(this.reports.e2e);
    }

    // Coverage
    if (this.reports.coverage?.total) {
      this.summary.coverage = {
        lines: this.reports.coverage.total.lines.pct,
        branches: this.reports.coverage.total.branches.pct,
        functions: this.reports.coverage.total.functions.pct,
        statements: this.reports.coverage.total.statements.pct
      };
    }
  }

  addTestResults(report) {
    if (report.numTotalTests) {
      this.summary.totalTests += report.numTotalTests;
      this.summary.passedTests += report.numPassedTests || 0;
      this.summary.failedTests += report.numFailedTests || 0;
      this.summary.skippedTests += report.numPendingTests || 0;
    }
  }

  addE2EResults(report) {
    if (report.suites) {
      report.suites.forEach(suite => {
        suite.specs.forEach(spec => {
          this.summary.totalTests++;
          if (spec.ok) {
            this.summary.passedTests++;
          } else {
            this.summary.failedTests++;
          }
        });
      });
    }
  }

  generateMarkdownReport() {
    const timestamp = new Date().toISOString();
    const successRate = this.summary.totalTests > 0 
      ? ((this.summary.passedTests / this.summary.totalTests) * 100).toFixed(1)
      : 0;

    let markdown = `# 🧪 Comprehensive Test Report\n\n`;
    markdown += `**Generated:** ${timestamp}\n`;
    markdown += `**Branch:** ${process.env.GITHUB_REF_NAME || 'local'}\n`;
    markdown += `**Commit:** ${process.env.GITHUB_SHA?.substring(0, 7) || 'local'}\n\n`;

    // Executive Summary
    markdown += `## 📊 Executive Summary\n\n`;
    markdown += `| Metric | Value |\n`;
    markdown += `|--------|-------|\n`;
    markdown += `| Total Tests | ${this.summary.totalTests} |\n`;
    markdown += `| Passed | ${this.summary.passedTests} |\n`;
    markdown += `| Failed | ${this.summary.failedTests} |\n`;
    markdown += `| Success Rate | ${successRate}% |\n`;

    if (this.summary.coverage) {
      markdown += `| Coverage | ${this.summary.coverage.lines.toFixed(1)}% |\n`;
    }

    const overallStatus = this.summary.failedTests === 0 ? '✅ PASSED' : '❌ FAILED';
    markdown += `| **Overall Status** | **${overallStatus}** |\n\n`;

    // Test Suite Details
    markdown += `## 📋 Test Suite Details\n\n`;

    // Unit Tests
    if (this.reports.unit) {
      markdown += this.generateTestSectionMarkdown('Unit Tests', this.reports.unit, '🔬');
    }

    // Integration Tests
    if (this.reports.integration) {
      markdown += this.generateTestSectionMarkdown('Integration Tests', this.reports.integration, '🔗');
    }

    // E2E Tests
    if (this.reports.e2e) {
      markdown += this.generateE2ESectionMarkdown();
    }

    // Performance Tests
    if (this.reports.performance) {
      markdown += this.generatePerformanceSectionMarkdown();
    }

    // Coverage Report
    if (this.reports.coverage) {
      markdown += this.generateCoverageSectionMarkdown();
    }

    // Quality Gates
    if (this.reports.qualityGates) {
      markdown += this.generateQualityGatesSectionMarkdown();
    }

    // Recommendations
    markdown += this.generateRecommendations();

    return markdown;
  }

  generateTestSectionMarkdown(title, report, icon) {
    let section = `### ${icon} ${title}\n\n`;
    
    if (report.numTotalTests) {
      const successRate = ((report.numPassedTests / report.numTotalTests) * 100).toFixed(1);
      section += `- **Tests:** ${report.numTotalTests}\n`;
      section += `- **Passed:** ${report.numPassedTests}\n`;
      section += `- **Failed:** ${report.numFailedTests || 0}\n`;
      section += `- **Success Rate:** ${successRate}%\n`;
      
      if (report.testResults) {
        const failedTests = report.testResults
          .filter(test => test.status === 'failed')
          .map(test => test.ancestorTitles.concat(test.title).join(' > '));
        
        if (failedTests.length > 0) {
          section += `\n**Failed Tests:**\n`;
          failedTests.forEach(test => {
            section += `- ❌ ${test}\n`;
          });
        }
      }
    }
    
    section += '\n';
    return section;
  }

  generateE2ESectionMarkdown() {
    let section = `### 🎭 End-to-End Tests\n\n`;
    
    if (this.reports.e2e.suites) {
      let totalSpecs = 0;
      let passedSpecs = 0;
      const failedTests = [];

      this.reports.e2e.suites.forEach(suite => {
        suite.specs.forEach(spec => {
          totalSpecs++;
          if (spec.ok) {
            passedSpecs++;
          } else {
            failedTests.push(`${suite.title} > ${spec.title}`);
          }
        });
      });

      const successRate = totalSpecs > 0 ? ((passedSpecs / totalSpecs) * 100).toFixed(1) : 0;
      
      section += `- **Tests:** ${totalSpecs}\n`;
      section += `- **Passed:** ${passedSpecs}\n`;
      section += `- **Failed:** ${failedTests.length}\n`;
      section += `- **Success Rate:** ${successRate}%\n`;

      if (failedTests.length > 0) {
        section += `\n**Failed Tests:**\n`;
        failedTests.forEach(test => {
          section += `- ❌ ${test}\n`;
        });
      }
    }
    
    section += '\n';
    return section;
  }

  generatePerformanceSectionMarkdown() {
    let section = `### ⚡ Performance Tests\n\n`;
    
    if (this.reports.performance.summary) {
      const summary = this.reports.performance.summary;
      section += `- **Total Tests:** ${summary.totalTests}\n`;
      section += `- **Passed:** ${summary.passedTests}\n`;
      section += `- **Failed:** ${summary.failedTests}\n`;
      section += `- **Avg Execution Time:** ${summary.averageExecutionTime?.toFixed(2)}ms\n`;
      section += `- **Peak Memory Usage:** ${(summary.memoryUsage?.peak / 1024 / 1024)?.toFixed(2)}MB\n`;
    }

    if (this.reports.performance.metrics) {
      section += `\n**Key Metrics:**\n`;
      this.reports.performance.metrics
        .filter(m => m.threshold)
        .forEach(metric => {
          const status = metric.value <= metric.threshold ? '✅' : '❌';
          section += `- ${status} ${metric.name}: ${metric.value}${metric.unit} (threshold: ${metric.threshold}${metric.unit})\n`;
        });
    }
    
    section += '\n';
    return section;
  }

  generateCoverageSectionMarkdown() {
    let section = `### 📊 Code Coverage\n\n`;
    
    const coverage = this.reports.coverage.total;
    section += `| Type | Coverage | Threshold | Status |\n`;
    section += `|------|----------|-----------|--------|\n`;
    
    const thresholds = { lines: 80, branches: 80, functions: 80, statements: 80 };
    
    Object.entries(thresholds).forEach(([type, threshold]) => {
      const value = coverage[type].pct;
      const status = value >= threshold ? '✅' : '❌';
      section += `| ${type.charAt(0).toUpperCase() + type.slice(1)} | ${value.toFixed(1)}% | ${threshold}% | ${status} |\n`;
    });
    
    section += '\n';
    return section;
  }

  generateQualityGatesSectionMarkdown() {
    let section = `### 🎯 Quality Gates\n\n`;
    
    const qg = this.reports.qualityGates;
    section += `**Status:** ${qg.status === 'PASSED' ? '✅ PASSED' : '❌ FAILED'}\n\n`;
    
    if (qg.failures && qg.failures.length > 0) {
      section += `**Failures:**\n`;
      qg.failures.forEach(failure => {
        section += `- ❌ ${failure}\n`;
      });
      section += '\n';
    }
    
    if (qg.warnings && qg.warnings.length > 0) {
      section += `**Warnings:**\n`;
      qg.warnings.forEach(warning => {
        section += `- ⚠️ ${warning}\n`;
      });
      section += '\n';
    }
    
    return section;
  }

  generateRecommendations() {
    let section = `## 💡 Recommendations\n\n`;
    
    const recommendations = [];

    // Coverage recommendations
    if (this.summary.coverage) {
      if (this.summary.coverage.lines < 80) {
        recommendations.push('📊 Increase code coverage to meet the 80% threshold');
      }
      if (this.summary.coverage.branches < 80) {
        recommendations.push('🌿 Add more branch coverage tests');
      }
    }

    // Test failure recommendations
    if (this.summary.failedTests > 0) {
      recommendations.push('🔧 Fix failing tests before merging');
    }

    // Performance recommendations
    if (this.reports.performance?.summary?.failedTests > 0) {
      recommendations.push('⚡ Address performance test failures');
    }

    // General recommendations
    if (this.summary.totalTests < 100) {
      recommendations.push('🧪 Consider adding more comprehensive tests');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ All tests are passing - great work!');
      recommendations.push('🚀 Consider adding more edge case tests');
      recommendations.push('📈 Monitor performance trends over time');
    }

    recommendations.forEach(rec => {
      section += `- ${rec}\n`;
    });

    section += '\n';
    return section;
  }

  generateJSONReport() {
    return {
      timestamp: new Date().toISOString(),
      summary: this.summary,
      reports: this.reports,
      metadata: {
        branch: process.env.GITHUB_REF_NAME || 'local',
        commit: process.env.GITHUB_SHA || 'local',
        runId: process.env.GITHUB_RUN_ID || 'local'
      }
    };
  }

  async generate() {
    this.loadReports();
    this.calculateSummary();

    const markdownReport = this.generateMarkdownReport();
    const jsonReport = this.generateJSONReport();

    // Ensure results directory exists
    const resultsDir = './test-results';
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    // Save reports
    fs.writeFileSync(
      path.join(resultsDir, 'comprehensive-report.md'),
      markdownReport
    );

    fs.writeFileSync(
      path.join(resultsDir, 'comprehensive-report.json'),
      JSON.stringify(jsonReport, null, 2)
    );

    console.log('📋 Comprehensive test report generated successfully!');
    console.log(`   - Markdown: ${resultsDir}/comprehensive-report.md`);
    console.log(`   - JSON: ${resultsDir}/comprehensive-report.json`);

    return jsonReport;
  }
}

// Run if called directly
if (require.main === module) {
  const generator = new TestReportGenerator();
  generator.generate().catch(error => {
    console.error('Report generation failed:', error);
    process.exit(1);
  });
}

module.exports = { TestReportGenerator };
