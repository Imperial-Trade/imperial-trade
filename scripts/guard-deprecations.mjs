
#!/usr/bin/env node

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const DEPRECATED_PATTERNS = [
  'trading-journal-ai-coach-gemini',
  'trading-journal-ai-coach-gemeni',
  'getCoachFeedback'
];

const ALLOWED_FILES = [
  'supabase/functions/trading-journal-ai-coach-gemini/index.ts',
  'supabase/functions/trading-journal-ai-coach-gemeni/index.ts',
  'src/api/entities.ts', // Contains deprecation warning
  'scripts/guard-deprecations.mjs' // This file itself
];

async function findFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const files = [];
  
  async function walk(currentPath) {
    const entries = await readdir(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(currentPath, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        await walk(fullPath);
      } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }
  
  await walk(dir);
  return files;
}

async function checkFile(filePath) {
  const content = await readFile(filePath, 'utf-8');
  const violations = [];
  
  for (const pattern of DEPRECATED_PATTERNS) {
    if (content.includes(pattern)) {
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (line.includes(pattern)) {
          violations.push({
            file: filePath,
            line: index + 1,
            pattern,
            content: line.trim()
          });
        }
      });
    }
  }
  
  return violations;
}

async function main() {
  console.log('🔍 Checking for deprecated function usage...');
  
  const files = await findFiles('src');
  const allViolations = [];
  
  for (const file of files) {
    // Skip allowed files
    if (ALLOWED_FILES.some(allowed => file.includes(allowed))) {
      continue;
    }
    
    const violations = await checkFile(file);
    allViolations.push(...violations);
  }
  
  if (allViolations.length > 0) {
    console.error('\n❌ DEPRECATED FUNCTION USAGE DETECTED:\n');
    
    for (const violation of allViolations) {
      console.error(`  ${violation.file}:${violation.line}`);
      console.error(`    Pattern: ${violation.pattern}`);
      console.error(`    Code: ${violation.content}`);
      console.error('');
    }
    
    console.error('🚫 SOLUTION:');
    console.error('  - Replace trading-journal-ai-coach-gemini/gemeni with "journal-coach"');
    console.error('  - Replace getCoachFeedback() with useCoachInvocation().invokeCoach()');
    console.error('');
    
    process.exit(1);
  }
  
  console.log('✅ No deprecated function usage found');
}

main().catch(error => {
  console.error('Script error:', error);
  process.exit(1);
});
