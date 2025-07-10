
import { test, expect } from '@playwright/test';
import { TestMaintenanceManager } from './TestMaintenanceTools';

test.describe('Test Maintenance Tools', () => {
  let maintenanceManager: TestMaintenanceManager;

  test.beforeEach(() => {
    maintenanceManager = new TestMaintenanceManager();
  });

  test('should scan and analyze test files', async () => {
    const testFiles = await maintenanceManager.scanTestFiles();
    
    expect(testFiles.length).toBeGreaterThan(0);
    
    testFiles.forEach(file => {
      expect(file).toHaveProperty('path');
      expect(file).toHaveProperty('type');
      expect(file).toHaveProperty('coverage');
      expect(file).toHaveProperty('dependencies');
      expect(file).toHaveProperty('complexity');
      expect(['unit', 'integration', 'e2e', 'performance']).toContain(file.type);
      expect(['low', 'medium', 'high']).toContain(file.complexity);
    });
  });

  test('should generate comprehensive maintenance report', async () => {
    await maintenanceManager.scanTestFiles();
    const report = maintenanceManager.generateMaintenanceReport();
    
    expect(report).toHaveProperty('totalTests');
    expect(report).toHaveProperty('outdatedTests');
    expect(report).toHaveProperty('lowCoverageTests');
    expect(report).toHaveProperty('obsoleteTests');
    expect(report).toHaveProperty('recommendations');
    expect(report).toHaveProperty('generatedAt');
    
    expect(Array.isArray(report.recommendations)).toBe(true);
    expect(report.totalTests).toBeGreaterThan(0);
  });

  test('should identify optimization opportunities', async () => {
    await maintenanceManager.scanTestFiles();
    const report = maintenanceManager.generateMaintenanceReport();
    
    // Check that recommendations are meaningful
    if (report.recommendations.length > 0) {
      const hasValidRecommendations = report.recommendations.some(rec => 
        rec.includes('tests') && (
          rec.includes('coverage') || 
          rec.includes('outdated') || 
          rec.includes('complex') ||
          rec.includes('obsolete')
        )
      );
      expect(hasValidRecommendations).toBe(true);
    }
  });

  test('should handle edge cases gracefully', async () => {
    // Test with empty test directory
    const emptyManager = new TestMaintenanceManager();
    emptyManager['testPaths'] = ['non-existent-path/**/*.test.ts'];
    
    const testFiles = await emptyManager.scanTestFiles();
    expect(testFiles).toEqual([]);
    
    const report = emptyManager.generateMaintenanceReport();
    expect(report.totalTests).toBe(0);
    expect(report.recommendations).toBeDefined();
  });
});

test.describe('Test Documentation Generation', () => {
  test('should generate test documentation', async () => {
    const manager = new TestMaintenanceManager();
    await manager.scanTestFiles();
    const report = manager.generateMaintenanceReport();
    
    // Verify HTML report structure
    const htmlContent = manager['generateHTMLReport'](report);
    
    expect(htmlContent).toContain('<!DOCTYPE html>');
    expect(htmlContent).toContain('Test Maintenance Report');
    expect(htmlContent).toContain('Total Tests:');
    expect(htmlContent).toContain('Outdated Tests:');
    expect(htmlContent).toContain('Low Coverage Tests:');
    expect(htmlContent).toContain('Recommendations');
  });
});
