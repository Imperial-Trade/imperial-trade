
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('📈 Running Performance Regression Check...\n');

const REGRESSION_THRESHOLDS = {
  renderTime: { max: 150, regression: 20 }, // max 150ms, regression if >20% increase
  memoryUsage: { max: 15, regression: 25 }, // max 15MB, regression if >25% increase
  loadTime: { max: 5000, regression: 15 }, // max 5s, regression if >15% increase
  bundleSize: { max: 5000000, regression: 10 } // max 5MB, regression if >10% increase
};

class PerformanceRegressionChecker {
  constructor() {
    this.currentResults = null;
    this.baselineResults = null;
    this.regressions = [];
    this.improvements = [];
  }

  loadCurrentResults() {
    try {
      const resultsPath = './test-results/performance-results.json';
      if (fs.existsSync(resultsPath)) {
        this.currentResults = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
        console.log('✅ Current performance results loaded');
      } else {
        console.log('⚠️ No current performance results found');
      }
    } catch (error) {
      console.error('Error loading current results:', error.message);
    }
  }

  loadBaselineResults() {
    try {
      // Try to load from previous runs or baseline file
      const baselinePaths = [
        './test-results/performance-baseline.json',
        './performance-baseline.json',
        './.github/performance-baseline.json'
      ];

      for (const baselinePath of baselinePaths) {
        if (fs.existsSync(baselinePath)) {
          this.baselineResults = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
          console.log(`✅ Baseline results loaded from ${baselinePath}`);
          break;
        }
      }

      if (!this.baselineResults) {
        console.log('⚠️ No baseline results found - creating initial baseline');
        this.createBaseline();
      }
    } catch (error) {
      console.error('Error loading baseline results:', error.message);
    }
  }

  createBaseline() {
    if (this.currentResults) {
      this.baselineResults = JSON.parse(JSON.stringify(this.currentResults));
      
      // Save baseline for future comparisons
      fs.writeFileSync(
        './test-results/performance-baseline.json',
        JSON.stringify(this.baselineResults, null, 2)
      );
      
      console.log('📊 Performance baseline created');
    }
  }

  compareMetrics() {
    if (!this.currentResults || !this.baselineResults) {
      console.log('⚠️ Cannot compare - missing current or baseline results');
      return;
    }

    console.log('🔍 Comparing performance metrics...\n');

    const currentMetrics = this.extractMetrics(this.currentResults);
    const baselineMetrics = this.extractMetrics(this.baselineResults);

    Object.keys(currentMetrics).forEach(metricName => {
      const current = currentMetrics[metricName];
      const baseline = baselineMetrics[metricName];

      if (baseline !== undefined) {
        const change = ((current - baseline) / baseline) * 100;
        const threshold = this.getThreshold(metricName);

        const comparison = {
          name: metricName,
          current,
          baseline,
          change: change.toFixed(2),
          threshold: threshold?.regression || 20
        };

        if (Math.abs(change) > comparison.threshold) {
          if (change > 0) {
            this.regressions.push({
              ...comparison,
              severity: this.getSeverity(current, metricName)
            });
          } else {
            this.improvements.push(comparison);
          }
        }

        this.logComparison(comparison, change);
      } else {
        console.log(`🆕 New metric: ${metricName} = ${current}`);
      }
    });
  }

  extractMetrics(results) {
    const metrics = {};

    // Extract from performance reporter format
    if (results.metrics) {
      results.metrics.forEach(metric => {
        let key = metric.name.replace(/_/g, '').toLowerCase();
        
        // Normalize metric names
        if (key.includes('duration') || key.includes('time')) {
          key = 'renderTime';
        } else if (key.includes('memory')) {
          key = 'memoryUsage';
        }
        
        metrics[key] = metric.value;
      });
    }

    // Extract from summary if available
    if (results.summary) {
      if (results.summary.averageExecutionTime) {
        metrics.renderTime = results.summary.averageExecutionTime;
      }
      if (results.summary.memoryUsage?.peak) {
        metrics.memoryUsage = results.summary.memoryUsage.peak / 1024 / 1024; // Convert to MB
      }
    }

    return metrics;
  }

  getThreshold(metricName) {
    const key = Object.keys(REGRESSION_THRESHOLDS).find(k => 
      metricName.toLowerCase().includes(k.toLowerCase())
    );
    return REGRESSION_THRESHOLDS[key];
  }

  getSeverity(currentValue, metricName) {
    const threshold = this.getThreshold(metricName);
    if (!threshold) return 'medium';

    if (currentValue > threshold.max) {
      return 'high';
    } else if (currentValue > threshold.max * 0.8) {
      return 'medium';
    }
    return 'low';
  }

  logComparison(comparison, change) {
    const { name, current, baseline } = comparison;
    
    if (Math.abs(change) <= 5) {
      console.log(`✅ ${name}: ${current} (stable, ${change}%)`);
    } else if (change > 0) {
      console.log(`⚠️ ${name}: ${current} (↑${change}% from ${baseline})`);
    } else {
      console.log(`📈 ${name}: ${current} (↓${Math.abs(change)}% from ${baseline})`);
    }
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      status: this.regressions.length === 0 ? 'PASSED' : 'FAILED',
      summary: {
        regressions: this.regressions.length,
        improvements: this.improvements.length,
        highSeverityRegressions: this.regressions.filter(r => r.severity === 'high').length
      },
      regressions: this.regressions,
      improvements: this.improvements,
      thresholds: REGRESSION_THRESHOLDS
    };

    // Save JSON report
    fs.writeFileSync(
      './test-results/performance-regression-report.json',
      JSON.stringify(report, null, 2)
    );

    // Generate markdown report
    let markdown = `# Performance Regression Report\n\n`;
    markdown += `**Status:** ${report.status}\n`;
    markdown += `**Generated:** ${report.timestamp}\n\n`;

    if (this.regressions.length > 0) {
      markdown += `## 📉 Performance Regressions (${this.regressions.length})\n\n`;
      this.regressions.forEach(regression => {
        const severity = regression.severity === 'high' ? '🔴' : 
                        regression.severity === 'medium' ? '🟡' : '🟢';
        markdown += `${severity} **${regression.name}**: ${regression.current} (${regression.change >= 0 ? '+' : ''}${regression.change}% from ${regression.baseline})\n`;
      });
      markdown += '\n';
    }

    if (this.improvements.length > 0) {
      markdown += `## 📈 Performance Improvements (${this.improvements.length})\n\n`;
      this.improvements.forEach(improvement => {
        markdown += `✅ **${improvement.name}**: ${improvement.current} (${improvement.change}% from ${improvement.baseline})\n`;
      });
      markdown += '\n';
    }

    if (this.regressions.length === 0 && this.improvements.length === 0) {
      markdown += `## ✅ No Significant Changes\n\nAll performance metrics are within acceptable thresholds.\n\n`;
    }

    fs.writeFileSync(
      './test-results/performance-regression-report.md',
      markdown
    );

    console.log('\n📊 Performance regression report generated');
    return report;
  }

  async run() {
    this.loadCurrentResults();
    this.loadBaselineResults();
    this.compareMetrics();
    
    const report = this.generateReport();
    
    console.log(`\n🎯 Performance Regression Check: ${report.status}`);
    
    if (report.summary.highSeverityRegressions > 0) {
      console.log(`\n❌ ${report.summary.highSeverityRegressions} high-severity performance regression(s) detected!`);
      this.regressions
        .filter(r => r.severity === 'high')
        .forEach(r => console.log(`   - ${r.name}: ${r.change}% regression`));
      
      process.exit(1);
    } else if (report.regressions.length > 0) {
      console.log(`\n⚠️ ${report.regressions.length} performance regression(s) detected (non-critical)`);
    } else {
      console.log('\n✅ No performance regressions detected');
    }
  }
}

// Run if called directly
if (require.main === module) {
  const checker = new PerformanceRegressionChecker();
  checker.run().catch(error => {
    console.error('Performance regression check failed:', error);
    process.exit(1);
  });
}

module.exports = { PerformanceRegressionChecker };
