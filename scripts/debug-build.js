// Debug build script to log what files are being read and built
import { readFileSync, statSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const logPath = resolve(__dirname, '../.cursor/debug.log');
const logEndpoint = 'http://127.0.0.1:7242/ingest/2b258959-f12c-4dd6-b52b-301ce15c2cb0';

function log(level, message, data = {}) {
  const entry = {
    sessionId: 'debug-session',
    runId: 'build-debug',
    hypothesisId: data.hypothesisId || 'ALL',
    location: 'debug-build.js',
    message,
    level,
    data,
    timestamp: Date.now(),
  };
  
  // Write to file
  try {
    const fs = await import('fs');
    fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
  } catch (e) {
    // Ignore
  }
  
  // Also send via HTTP
  fetch(logEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  }).catch(() => {});
}

// Check key source files
const keyFiles = [
  'src/components/charts/mecca/MeccaXXDashboard.tsx',
  'src/components/charts/mecca/TimeframeSelector.tsx',
  'src/components/charts/mecca/NewsCalendar.tsx',
  'src/components/journal-xx/JournalXXComponent.tsx',
];

log('info', 'Starting build debug', { hypothesisId: 'A' });

for (const file of keyFiles) {
  try {
    const fullPath = resolve(__dirname, '..', file);
    const stats = statSync(fullPath);
    const content = readFileSync(fullPath, 'utf8');
    const lineCount = content.split('\n').length;
    
    // Check for key content markers
    const hasTradeTypes = content.includes('showTradingTypes');
    const hasInsightOnly = content.includes('insightOnly');
    const hasTRADING_STYLES = content.includes('TRADING_STYLES');
    
    log('info', `File checked: ${file}`, {
      hypothesisId: 'B',
      file,
      lastModified: stats.mtime.toISOString(),
      size: stats.size,
      lineCount,
      hasTradeTypes,
      hasInsightOnly,
      hasTRADING_STYLES,
      firstLine: content.split('\n')[0].substring(0, 100),
    });
  } catch (e) {
    log('error', `Failed to read ${file}`, { hypothesisId: 'B', file, error: e.message });
  }
}

// Check dist folder
try {
  const distPath = resolve(__dirname, '..', 'dist');
  const distStats = statSync(distPath);
  log('info', 'Dist folder exists', {
    hypothesisId: 'C',
    distPath,
    lastModified: distStats.mtime.toISOString(),
  });
  
  // Check assets
  const assetsPath = join(distPath, 'assets');
  if (statSync(assetsPath).isDirectory()) {
    const assets = readdirSync(assetsPath);
    const jsFiles = assets.filter(f => f.endsWith('.js'));
    log('info', 'Dist assets found', {
      hypothesisId: 'C',
      assetCount: assets.length,
      jsFiles: jsFiles.map(f => {
        const filePath = join(assetsPath, f);
        const stats = statSync(filePath);
        return {
          name: f,
          size: stats.size,
          lastModified: stats.mtime.toISOString(),
        };
      }),
    });
  }
} catch (e) {
  log('error', 'Dist folder check failed', { hypothesisId: 'C', error: e.message });
}

log('info', 'Build debug complete', { hypothesisId: 'A' });
