
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Running Quality Gate Analysis...\n');

// Ensure results directory exists
const resultsDir = './test-results';
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

// Quality Gate Configuration
const QUALITY_GATES = {
  coverage: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  },
  performance: {
    maxRenderTime: 100, // ms
    maxMemoryGrowth: 10, // MB
    maxLoadTime: 3000 // ms
  },
  e2e: {
    minSuccessRate: 95 // %
  },
  security: {
    maxHighVulnerabilities: 0,
    maxMediumVulnerabilities: 5
  }
};

class QualityGateAnalyzer {
  constructor() {
    this.results = {
      coverage: null,
      performance: null,
      e2e: null,
      security: null
    };
    this.failures = [];
    this.warnings = [];
  }

  async analyzeCoverage() {
    console.log('📊 Analyzing Code Coverage...');
    
    try {
      // Look for coverage reports from different test runs
      const coverageFiles = this.findFiles('.', 'coverage-summary.json');
      
      if (coverageFiles.length === 0) {
        this.warnings.push('No coverage reports found');
        return;
      }

      let totalCoverage = { branches: 0, functions: 0, lines: 0, statements: 0 };
      let reportCount = 0;

      for (const file of coverageFiles) {
        const coverage = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (coverage.total) {
          totalCoverage.branches += coverage.total.branches.pct;
          totalCoverage.functions += coverage.total.functions.pct;
          totalCoverage.lines += coverage.total.lines.pct;
          totalCoverage.statements += coverage.total.statements.pct;
          reportCount++;
        }
      }

      if (reportCount > 0) {
        // Average coverage across all reports
        Object.keys(totalCoverage).forEach(key => {
          totalCoverage[key] = totalCoverage[key] / reportCount;
        });

        this.results.coverage = totalCoverage;

        // Check thresholds
        Object.entries(QUALITY_GATES.coverage).forEach(([metric, threshold]) => {
          const actual = totalCoverage[metric];
          if (actual < threshold) {
            this.failures.push(`Coverage ${metric}: ${actual.toFixed(1)}% < ${threshold}%`);
          } else {
            console.log(`✅ Coverage ${metric}: ${actual.toFixed(1)}% >= ${threshold}%`);
          }
        });
      }
    } catch (error) {
      this.warnings.push(`Coverage analysis error: ${error.message}`);
    }
  }

  async analyzePerformance() {
    console.log('⚡ Analyzing Performance Metrics...');
    
    try {
      const performanceFiles = this.findFiles('.', 'performance-results.json');
      
      if (performanceFiles.length === 0) {
        this.warnings.push('No performance reports found');
        return;
      }

      for (const file of performanceFiles) {
        const results = JSON.parse(fs.readFileSync(file, 'utf8'));
        
        if (results.metrics) {
          results.metrics.forEach(metric => {
            const { name, value, unit, threshold } = metric;
            
            if (threshold && value > threshold) {
              this.failures.push(`Performance: ${name} = ${value}${unit} > ${threshold}${unit}`);
            } else if (threshold) {
              console.log(`✅ Performance: ${name} = ${value}${unit} <= ${threshold}${unit}`);
            }
          });
        }
      }
    } catch (error) {
      this.warnings.push(`Performance analysis error: ${error.message}`);
    }
  }

  async analyzeE2E() {
    console.log('🎭 Analyzing E2E Test Results...');
    
    try {
      const e2eFiles = this.findFiles('.', 'results.json');
      
      if (e2eFiles.length === 0) {
        this.warnings.push('No E2E test reports found');
        return;
      }

      let totalTests = 0;
      let passedTests = 0;

      for (const file of e2eFiles) {
        const results = JSON.parse(fs.readFileSync(file, 'utf8'));
        
        if (results.suites) {
          results.suites.forEach(suite => {
            suite.specs.forEach(spec => {
              totalTests++;
              if (spec.ok) passedTests++;
            });
          });
        }
      }

      if (totalTests > 0) {
        const successRate = (passedTests / totalTests) * 100;
        this.results.e2e = { successRate, totalTests, passedTests };

        if (successRate < QUALITY_GATES.e2e.minSuccessRate) {
          this.failures.push(`E2E Success Rate: ${successRate.toFixed(1)}% < ${QUALITY_GATES.e2e.minSuccessRate}%`);
        } else {
          console.log(`✅ E2E Success Rate: ${successRate.toFixed(1)}% >= ${QUALITY_GATES.e2e.minSuccessRate}%`);
        }
      }
    } catch (error) {
      this.warnings.push(`E2E analysis error: ${error.message}`);
    }
  }

  findFiles(dir, filename) {
    const results = [];
    
    function searchDir(currentDir) {
      try {
        const files = fs.readdirSync(currentDir);
        
        for (const file of files) {
          const filePath = path.join(currentDir, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
            searchDir(filePath);
          } else if (file === filename) {
            results.push(filePath);
          }
        }
      } catch (error) {
        // Ignore permission errors
      }
    }
    
    searchDir(dir);
    return results;
  }

  async generateReport() {
    console.log('\n📋 Generating Quality Gate Report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      status: this.failures.length === 0 ? 'PASSED' : 'FAILED',
      summary: {
        totalFailures: this.failures.length,
        totalWarnings: this.warnings.length,
        qualityGates: QUALITY_GATES
      },
      results: this.results,
      failures: this.failures,
      warnings: this.warnings
    };

    // Save JSON report
    fs.writeFileSync(
      path.join(resultsDir, 'quality-gates-report.json'),
      JSON.stringify(report, null, 2)
    );

    // Generate markdown report
    let markdown = `# Quality Gates Report\n\n`;
    markdown += `**Status:** ${report.status}\n`;
    markdown += `**Generated:** ${report.timestamp}\n\n`;

    if (this.failures.length > 0) {
      markdown += `## ❌ Failures (${this.failures.length})\n\n`;
      this.failures.forEach(failure => {
        markdown += `- ${failure}\n`;
      });
      markdown += '\n';
    }

    if (this.warnings.length > 0) {
      markdown += `## ⚠️ Warnings (${this.warnings.length})\n\n`;
      this.warnings.forEach(warning => {
        markdown += `- ${warning}\n`;
      });
      markdown += '\n';
    }

    if (this.results.coverage) {
      markdown += `## 📊 Coverage Results\n\n`;
      Object.entries(this.results.coverage).forEach(([metric, value]) => {
        const threshold = QUALITY_GATES.coverage[metric];
        const status = value >= threshold ? '✅' : '❌';
        markdown += `- ${status} ${metric}: ${value.toFixed(1)}% (threshold: ${threshold}%)\n`;
      });
      markdown += '\n';
    }

    if (this.results.e2e) {
      markdown += `## 🎭 E2E Test Results\n\n`;
      const { successRate, totalTests, passedTests } = this.results.e2e;
      const status = successRate >= QUALITY_GATES.e2e.minSuccessRate ? '✅' : '❌';
      markdown += `- ${status} Success Rate: ${successRate.toFixed(1)}% (${passedTests}/${totalTests})\n\n`;
    }

    fs.writeFileSync(
      path.join(resultsDir, 'quality-gates-report.md'),
      markdown
    );

    // Save failure indicator for CI
    if (this.failures.length > 0) {
      fs.writeFileSync(
        path.join(resultsDir, 'quality-gates-failed.txt'),
        this.failures.join('\n')
      );
    }

    console.log(`Quality Gates Report saved to ${resultsDir}/`);
    return report;
  }

  async run() {
    await this.analyzeCoverage();
    await this.analyzePerformance();
    await this.analyzeE2E();
    
    const report = await this.generateReport();
    
    console.log(`\n🎯 Quality Gates Result: ${report.status}`);
    
    if (report.status === 'FAILED') {
      console.log(`\n❌ ${this.failures.length} quality gate(s) failed:`);
      this.failures.forEach(failure => console.log(`   - ${failure}`));
      process.exit(1);
    } else {
      console.log('\n✅ All quality gates passed!');
    }
  }
}

// Run if called directly
if (require.main === module) {
  const analyzer = new QualityGateAnalyzer();
  analyzer.run().catch(error => {
    console.error('Quality gate analysis failed:', error);
    process.exit(1);
  });
}

module.exports = { QualityGateAnalyzer, QUALITY_GATES };
