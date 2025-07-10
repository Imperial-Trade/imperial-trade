
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { glob } from 'glob';

interface TestFile {
  path: string;
  type: 'unit' | 'integration' | 'e2e' | 'performance';
  lastRun: Date | null;
  coverage: number;
  dependencies: string[];
  complexity: 'low' | 'medium' | 'high';
}

interface TestMaintenanceReport {
  totalTests: number;
  outdatedTests: TestFile[];
  lowCoverageTests: TestFile[];
  obsoleteTests: TestFile[];
  recommendations: string[];
  generatedAt: Date;
}

class TestMaintenanceManager {
  private testFiles: TestFile[] = [];
  private testPaths = [
    'src/__tests__/unit/**/*.test.{ts,tsx}',
    'src/__tests__/integration/**/*.test.{ts,tsx}',
    'src/__tests__/e2e/**/*.spec.ts',
    'src/__tests__/performance/**/*.test.ts'
  ];

  async scanTestFiles(): Promise<TestFile[]> {
    const files: string[] = [];
    
    for (const pattern of this.testPaths) {
      const matchedFiles = await glob(pattern);
      files.push(...matchedFiles);
    }

    this.testFiles = await Promise.all(
      files.map(filePath => this.analyzeTestFile(filePath))
    );

    return this.testFiles;
  }

  private async analyzeTestFile(filePath: string): Promise<TestFile> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const stats = fs.statSync(filePath);
    
    return {
      path: filePath,
      type: this.determineTestType(filePath),
      lastRun: this.getLastRunTime(filePath),
      coverage: this.calculateCoverage(content),
      dependencies: this.extractDependencies(content),
      complexity: this.assessComplexity(content)
    };
  }

  private determineTestType(filePath: string): TestFile['type'] {
    if (filePath.includes('/unit/')) return 'unit';
    if (filePath.includes('/integration/')) return 'integration';
    if (filePath.includes('/e2e/')) return 'e2e';
    if (filePath.includes('/performance/')) return 'performance';
    return 'unit';
  }

  private getLastRunTime(filePath: string): Date | null {
    try {
      const gitLog = execSync(`git log -1 --format=%ci "${filePath}"`, { encoding: 'utf-8' });
      return new Date(gitLog.trim());
    } catch {
      return null;
    }
  }

  private calculateCoverage(content: string): number {
    // Simple heuristic based on test assertions and describe blocks
    const testBlocks = (content.match(/describe|it|test/g) || []).length;
    const assertions = (content.match(/expect|assert/g) || []).length;
    
    if (testBlocks === 0) return 0;
    return Math.min((assertions / testBlocks) * 20, 100);
  }

  private extractDependencies(content: string): string[] {
    const imports = content.match(/from ['"]([^'"]+)['"]/g) || [];
    return imports.map(imp => imp.match(/from ['"]([^'"]+)['"]/)?.[1] || '').filter(Boolean);
  }

  private assessComplexity(content: string): TestFile['complexity'] {
    const lines = content.split('\n').length;
    const nestedDescribes = (content.match(/describe.*describe/g) || []).length;
    const asyncTests = (content.match(/async.*=>/g) || []).length;
    
    const complexityScore = lines / 50 + nestedDescribes * 2 + asyncTests;
    
    if (complexityScore > 10) return 'high';
    if (complexityScore > 5) return 'medium';
    return 'low';
  }

  generateMaintenanceReport(): TestMaintenanceReport {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const outdatedTests = this.testFiles.filter(test => 
      !test.lastRun || test.lastRun < thirtyDaysAgo
    );
    
    const lowCoverageTests = this.testFiles.filter(test => 
      test.coverage < 50
    );
    
    const obsoleteTests = this.findObsoleteTests();
    
    const recommendations = this.generateRecommendations(
      outdatedTests,
      lowCoverageTests,
      obsoleteTests
    );

    return {
      totalTests: this.testFiles.length,
      outdatedTests,
      lowCoverageTests,
      obsoleteTests,
      recommendations,
      generatedAt: now
    };
  }

  private findObsoleteTests(): TestFile[] {
    return this.testFiles.filter(test => {
      // Check if the component/file being tested still exists
      const componentPath = this.inferComponentPath(test.path);
      return componentPath && !fs.existsSync(componentPath);
    });
  }

  private inferComponentPath(testPath: string): string | null {
    // Extract component name from test file path
    const match = testPath.match(/\/([^/]+)\.test\.(ts|tsx)$/);
    if (!match) return null;
    
    const componentName = match[1];
    const possiblePaths = [
      `src/components/${componentName}.tsx`,
      `src/components/${componentName}/index.tsx`,
      `src/pages/${componentName}.tsx`,
      `src/hooks/${componentName}.ts`
    ];
    
    return possiblePaths.find(p => fs.existsSync(p)) || null;
  }

  private generateRecommendations(
    outdated: TestFile[],
    lowCoverage: TestFile[],
    obsolete: TestFile[]
  ): string[] {
    const recommendations: string[] = [];
    
    if (outdated.length > 0) {
      recommendations.push(`📅 ${outdated.length} tests haven't been run recently. Consider reviewing for relevance.`);
    }
    
    if (lowCoverage.length > 0) {
      recommendations.push(`📊 ${lowCoverage.length} tests have low coverage. Add more assertions and edge cases.`);
    }
    
    if (obsolete.length > 0) {
      recommendations.push(`🗑️ ${obsolete.length} tests appear to be testing non-existent components. Consider removal.`);
    }
    
    const highComplexityTests = this.testFiles.filter(t => t.complexity === 'high').length;
    if (highComplexityTests > 0) {
      recommendations.push(`🔧 ${highComplexityTests} tests are highly complex. Consider refactoring for maintainability.`);
    }
    
    const duplicateDependencies = this.findDuplicateDependencies();
    if (duplicateDependencies.length > 0) {
      recommendations.push(`♻️ Consider creating shared test utilities for commonly used dependencies.`);
    }
    
    return recommendations;
  }

  private findDuplicateDependencies(): string[] {
    const dependencyCounts = new Map<string, number>();
    
    this.testFiles.forEach(test => {
      test.dependencies.forEach(dep => {
        dependencyCounts.set(dep, (dependencyCounts.get(dep) || 0) + 1);
      });
    });
    
    return Array.from(dependencyCounts.entries())
      .filter(([_, count]) => count > 5)
      .map(([dep]) => dep);
  }

  async optimizeTestSuite(): Promise<void> {
    const report = this.generateMaintenanceReport();
    
    // Remove obsolete tests
    for (const obsoleteTest of report.obsoleteTests) {
      console.log(`🗑️ Removing obsolete test: ${obsoleteTest.path}`);
      // fs.unlinkSync(obsoleteTest.path); // Uncomment to actually remove
    }
    
    // Generate test templates for missing coverage
    await this.generateMissingTestTemplates();
    
    // Create maintenance report
    this.saveMaintenanceReport(report);
  }

  private async generateMissingTestTemplates(): Promise<void> {
    const componentFiles = await glob('src/components/**/*.tsx');
    const testedComponents = new Set(
      this.testFiles.map(test => this.inferComponentPath(test.path)).filter(Boolean)
    );
    
    const untestedComponents = componentFiles.filter(comp => !testedComponents.has(comp));
    
    for (const component of untestedComponents) {
      const testTemplate = this.generateTestTemplate(component);
      const testPath = this.getTestPath(component);
      
      if (!fs.existsSync(testPath)) {
        console.log(`📝 Generating test template for: ${component}`);
        fs.writeFileSync(testPath, testTemplate);
      }
    }
  }

  private generateTestTemplate(componentPath: string): string {
    const componentName = path.basename(componentPath, '.tsx');
    const relativePath = path.relative(process.cwd(), componentPath).replace(/\\/g, '/');
    
    return `import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ${componentName} } from '@/${relativePath.replace('src/', '').replace('.tsx', '')}';
import { TestWrapper } from '@/test/utils/test-helpers';

describe('${componentName}', () => {
  it('should render without crashing', () => {
    render(
      <TestWrapper>
        <${componentName} />
      </TestWrapper>
    );
    
    // TODO: Add meaningful assertions
  });
  
  // TODO: Add more comprehensive tests
  // - Test user interactions
  // - Test different props
  // - Test error scenarios
  // - Test accessibility
});
`;
  }

  private getTestPath(componentPath: string): string {
    const componentName = path.basename(componentPath, '.tsx');
    return `src/__tests__/unit/components/${componentName}.test.tsx`;
  }

  private saveMaintenanceReport(report: TestMaintenanceReport): void {
    const reportPath = './test-results/maintenance-report.json';
    const htmlReportPath = './test-results/maintenance-report.html';
    
    // Ensure directory exists
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    
    // Save JSON report
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Save HTML report
    const htmlReport = this.generateHTMLReport(report);
    fs.writeFileSync(htmlReportPath, htmlReport);
    
    console.log(`📋 Maintenance report saved: ${reportPath}`);
    console.log(`📋 HTML report saved: ${htmlReportPath}`);
  }

  private generateHTMLReport(report: TestMaintenanceReport): string {
    return `<!DOCTYPE html>
<html>
<head>
    <title>Test Maintenance Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .section { margin: 20px 0; }
        .test-list { list-style-type: none; padding: 0; }
        .test-item { padding: 10px; margin: 5px 0; border: 1px solid #ddd; border-radius: 3px; }
        .outdated { background: #fff3cd; }
        .low-coverage { background: #f8d7da; }
        .obsolete { background: #d1ecf1; }
        .recommendation { background: #d4edda; padding: 10px; margin: 5px 0; border-radius: 3px; }
    </style>
</head>
<body>
    <h1>Test Maintenance Report</h1>
    
    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Total Tests:</strong> ${report.totalTests}</p>
        <p><strong>Outdated Tests:</strong> ${report.outdatedTests.length}</p>
        <p><strong>Low Coverage Tests:</strong> ${report.lowCoverageTests.length}</p>
        <p><strong>Obsolete Tests:</strong> ${report.obsoleteTests.length}</p>
        <p><strong>Generated:</strong> ${report.generatedAt.toISOString()}</p>
    </div>
    
    <div class="section">
        <h2>Recommendations</h2>
        ${report.recommendations.map(rec => `<div class="recommendation">${rec}</div>`).join('')}
    </div>
    
    <div class="section">
        <h2>Outdated Tests</h2>
        <ul class="test-list">
            ${report.outdatedTests.map(test => `
                <li class="test-item outdated">
                    <strong>${test.path}</strong><br>
                    Type: ${test.type}, Complexity: ${test.complexity}<br>
                    Last Run: ${test.lastRun?.toLocaleDateString() || 'Never'}
                </li>
            `).join('')}
        </ul>
    </div>
    
    <div class="section">
        <h2>Low Coverage Tests</h2>
        <ul class="test-list">
            ${report.lowCoverageTests.map(test => `
                <li class="test-item low-coverage">
                    <strong>${test.path}</strong><br>
                    Coverage: ${test.coverage.toFixed(1)}%
                </li>
            `).join('')}
        </ul>
    </div>
</body>
</html>`;
  }
}

export { TestMaintenanceManager, TestFile, TestMaintenanceReport };
