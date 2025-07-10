
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Test Optimization Utility\n');

class TestOptimizer {
  constructor() {
    this.testFiles = [];
    this.metrics = {
      totalTests: 0,
      slowTests: [],
      duplicateTests: [],
      unusedMocks: [],
      outdatedSnapshots: []
    };
  }

  analyzeTestSuite() {
    console.log('🔍 Analyzing test suite...');
    
    this.findTestFiles();
    this.analyzeSlow Tests();
    this.findDuplicateTests();
    this.findUnusedMocks();
    this.checkSnapshots();
  }

  findTestFiles() {
    const searchDirs = ['src/__tests__', 'e2e', 'test'];
    
    searchDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        this.scanDirectory(dir);
      }
    });
    
    console.log(`📁 Found ${this.testFiles.length} test files`);
  }

  scanDirectory(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    files.forEach(file => {
      const filePath = path.join(dir, file.name);
      
      if (file.isDirectory()) {
        this.scanDirectory(filePath);
      } else if (this.isTestFile(file.name)) {
        this.testFiles.push(filePath);
      }
    });
  }

  isTestFile(filename) {
    return filename.match(/\.(test|spec)\.(js|ts|tsx)$/) ||
           filename.match(/\.e2e\.(js|ts)$/);
  }

  analyzeSlowTests() {
    console.log('⏱️ Analyzing test performance...');
    
    // This would integrate with test runner to get timing data
    // For now, we'll scan for potential slow operations
    this.testFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      
      // Look for potentially slow operations
      if (content.includes('setTimeout') && content.includes('10000')) {
        this.metrics.slowTests.push({
          file,
          reason: 'Contains long timeout (10s+)',
          line: this.findLineNumber(content, 'setTimeout')
        });
      }
      
      if (content.includes('waitFor') && !content.includes('timeout:')) {
        this.metrics.slowTests.push({
          file,
          reason: 'waitFor without timeout specified',
          line: this.findLineNumber(content, 'waitFor')
        });
      }
    });
  }

  findDuplicateTests() {
    console.log('🔍 Checking for duplicate tests...');
    
    const testDescriptions = new Map();
    
    this.testFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const matches = content.match(/(?:it|test)\s*\(\s*['"`]([^'"`]+)['"`]/g);
      
      if (matches) {
        matches.forEach(match => {
          const description = match.match(/['"`]([^'"`]+)['"`]/)[1];
          
          if (testDescriptions.has(description)) {
            this.metrics.duplicateTests.push({
              description,
              files: [testDescriptions.get(description), file]
            });
          } else {
            testDescriptions.set(description, file);
          }
        });
      }
    });
  }

  findUnusedMocks() {
    console.log('🎭 Checking for unused mocks...');
    
    this.testFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      
      // Find all mocked modules/functions
      const mocks = content.match(/vi\.mock\(['"`]([^'"`]+)['"`]/g) || [];
      const mockFunctions = content.match(/const\s+(\w+)\s*=\s*vi\.fn\(\)/g) || [];
      
      mocks.forEach(mock => {
        const moduleName = mock.match(/['"`]([^'"`]+)['"`]/)[1];
        
        // Simple check - if module is mocked but never referenced
        if (!content.includes(moduleName.split('/').pop())) {
          this.metrics.unusedMocks.push({
            file,
            type: 'module',
            name: moduleName
          });
        }
      });
      
      mockFunctions.forEach(mockFn => {
        const fnName = mockFn.match(/const\s+(\w+)/)[1];
        
        // Check if mock function is defined but never used
        const usageCount = (content.match(new RegExp(fnName, 'g')) || []).length;
        if (usageCount === 1) { // Only the definition
          this.metrics.unusedMocks.push({
            file,
            type: 'function',
            name: fnName
          });
        }
      });
    });
  }

  checkSnapshots() {
    console.log('📸 Checking snapshot files...');
    
    const snapshotDirs = ['__snapshots__'];
    
    snapshotDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        const snapshots = fs.readdirSync(dir)
          .filter(f => f.endsWith('.snap'));
        
        snapshots.forEach(snapshot => {
          const snapshotPath = path.join(dir, snapshot);
          const testFile = snapshot.replace('.snap', '');
          
          // Check if corresponding test file exists
          const possibleTestFiles = [
            `${testFile}.test.ts`,
            `${testFile}.test.tsx`,
            `${testFile}.spec.ts`,
            `${testFile}.spec.tsx`
          ];
          
          const testFileExists = possibleTestFiles.some(tf => 
            fs.existsSync(tf) || this.testFiles.some(f => f.includes(tf))
          );
          
          if (!testFileExists) {
            this.metrics.outdatedSnapshots.push(snapshotPath);
          }
        });
      }
    });
  }

  findLineNumber(content, searchText) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(searchText)) {
        return i + 1;
      }
    }
    return null;
  }

  generateOptimizationReport() {
    console.log('\n📊 Generating optimization report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTestFiles: this.testFiles.length,
        slowTests: this.metrics.slowTests.length,
        duplicateTests: this.metrics.duplicateTests.length,
        unusedMocks: this.metrics.unusedMocks.length,
        outdatedSnapshots: this.metrics.outdatedSnapshots.length
      },
      details: this.metrics,
      recommendations: this.generateRecommendations()
    };

    // Save JSON report
    if (!fs.existsSync('./test-results')) {
      fs.mkdirSync('./test-results', { recursive: true });
    }

    fs.writeFileSync(
      './test-results/test-optimization-report.json',
      JSON.stringify(report, null, 2)
    );

    // Generate markdown report
    let markdown = `# 🚀 Test Optimization Report\n\n`;
    markdown += `**Generated:** ${report.timestamp}\n\n`;

    markdown += `## 📊 Summary\n\n`;
    markdown += `- **Total Test Files:** ${report.summary.totalTestFiles}\n`;
    markdown += `- **Slow Tests:** ${report.summary.slowTests}\n`;
    markdown += `- **Duplicate Tests:** ${report.summary.duplicateTests}\n`;
    markdown += `- **Unused Mocks:** ${report.summary.unusedMocks}\n`;
    markdown += `- **Outdated Snapshots:** ${report.summary.outdatedSnapshots}\n\n`;

    if (this.metrics.slowTests.length > 0) {
      markdown += `## ⏱️ Slow Tests\n\n`;
      this.metrics.slowTests.forEach(test => {
        markdown += `- **${path.basename(test.file)}** (line ${test.line}): ${test.reason}\n`;
      });
      markdown += '\n';
    }

    if (this.metrics.duplicateTests.length > 0) {
      markdown += `## 🔍 Duplicate Tests\n\n`;
      this.metrics.duplicateTests.forEach(dup => {
        markdown += `- **"${dup.description}"** found in:\n`;
        dup.files.forEach(file => {
          markdown += `  - ${path.basename(file)}\n`;
        });
      });
      markdown += '\n';
    }

    if (this.metrics.unusedMocks.length > 0) {
      markdown += `## 🎭 Unused Mocks\n\n`;
      this.metrics.unusedMocks.forEach(mock => {
        markdown += `- **${mock.name}** (${mock.type}) in ${path.basename(mock.file)}\n`;
      });
      markdown += '\n';
    }

    markdown += `## 💡 Recommendations\n\n`;
    report.recommendations.forEach(rec => {
      markdown += `- ${rec}\n`;
    });

    fs.writeFileSync(
      './test-results/test-optimization-report.md',
      markdown
    );

    console.log('📋 Test optimization report generated');
    return report;
  }

  generateRecommendations() {
    const recommendations = [];

    if (this.metrics.slowTests.length > 0) {
      recommendations.push('⚡ Optimize slow tests by reducing timeouts and using more specific waitFor conditions');
    }

    if (this.metrics.duplicateTests.length > 0) {
      recommendations.push('🔍 Remove or consolidate duplicate test cases');
    }

    if (this.metrics.unusedMocks.length > 0) {
      recommendations.push('🎭 Clean up unused mock declarations');
    }

    if (this.metrics.outdatedSnapshots.length > 0) {
      recommendations.push('📸 Remove outdated snapshot files');
    }

    if (this.testFiles.length > 100) {
      recommendations.push('📁 Consider organizing tests into more focused test suites');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Test suite is well optimized!');
      recommendations.push('🚀 Consider adding parallel test execution for faster CI runs');
    }

    return recommendations;
  }

  async optimize() {
    console.log('🛠️ Starting test optimization...\n');
    
    this.analyzeTestSuite();
    const report = this.generateOptimizationReport();
    
    console.log('\n🎯 Optimization Summary:');
    console.log(`   - Test Files: ${report.summary.totalTestFiles}`);
    console.log(`   - Issues Found: ${Object.values(report.summary).reduce((a, b) => a + b, 0) - report.summary.totalTestFiles}`);
    console.log(`   - Recommendations: ${report.recommendations.length}`);

    return report;
  }
}

// Run if called directly
if (require.main === module) {
  const optimizer = new TestOptimizer();
  optimizer.optimize().catch(error => {
    console.error('Test optimization failed:', error);
    process.exit(1);
  });
}

module.exports = { TestOptimizer };
