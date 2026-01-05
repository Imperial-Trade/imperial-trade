/**
 * Generate Trade Imperial "TI" Logo Icons
 * 
 * Creates the orange gradient "TI" logo for all PWA icon sizes
 * - Orange gradient background
 * - White "TI" letters with italic/slanted style
 * - Clean, modern look
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Icon sizes to generate
const ICON_CONFIGS = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-512x512.png', size: 512 },
  { name: 'icon-maskable-192x192.png', size: 192, maskable: true },
  { name: 'icon-maskable-512x512.png', size: 512, maskable: true },
];

/**
 * Draw the complete TI logo matching the original exactly
 * - Orange gradient background  
 * - White "TI" with 3D effect, italic slant
 * - T has curved hook on left, horizontal bar, and angled stem
 * - I is a simple italic slash
 */
function drawTILogo(ctx, size, maskable) {
  const padding = maskable ? size * 0.15 : size * 0.1;
  const contentSize = size - padding * 2;
  const strokeWidth = Math.max(3, size * 0.075);
  
  // Position calculations
  const startY = padding + contentSize * 0.05;
  const endY = padding + contentSize * 0.95;
  const letterHeight = endY - startY;
  
  // Set up stroke style with subtle 3D effect
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.98)';
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Add shadow for depth
  ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
  ctx.shadowBlur = size * 0.015;
  ctx.shadowOffsetX = size * 0.008;
  ctx.shadowOffsetY = size * 0.008;
  
  // === DRAW "T" ===
  const tLeftX = padding + contentSize * 0.05;
  const tRightX = padding + contentSize * 0.55;
  const tTopY = startY;
  
  // T - curved hook on the left side (the distinctive swooping curve)
  ctx.beginPath();
  ctx.moveTo(tLeftX + contentSize * 0.15, tTopY + letterHeight * 0.18);
  ctx.quadraticCurveTo(
    tLeftX, tTopY + letterHeight * 0.08,
    tLeftX + contentSize * 0.02, tTopY + letterHeight * 0.02
  );
  ctx.quadraticCurveTo(
    tLeftX + contentSize * 0.08, tTopY - letterHeight * 0.02,
    tLeftX + contentSize * 0.2, tTopY
  );
  ctx.stroke();
  
  // T - horizontal top bar
  ctx.beginPath();
  ctx.moveTo(tLeftX + contentSize * 0.12, tTopY);
  ctx.lineTo(tRightX, tTopY + letterHeight * 0.02);
  ctx.stroke();
  
  // T - vertical stem (italic/slanted)
  const stemTopX = tLeftX + contentSize * 0.35;
  const stemBottomX = tLeftX + contentSize * 0.18;
  ctx.beginPath();
  ctx.moveTo(stemTopX, tTopY + strokeWidth * 0.3);
  ctx.lineTo(stemBottomX, endY);
  ctx.stroke();
  
  // === DRAW "I" ===
  const iTopX = padding + contentSize * 0.72;
  const iBottomX = padding + contentSize * 0.52;
  
  // I - simple italic line
  ctx.beginPath();
  ctx.moveTo(iTopX, startY);
  ctx.lineTo(iBottomX, endY);
  ctx.stroke();
  
  // Add subtle white highlight line (3D effect)
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = Math.max(1, strokeWidth * 0.2);
  
  // Highlight on T stem
  ctx.beginPath();
  ctx.moveTo(stemTopX + strokeWidth * 0.3, tTopY + strokeWidth);
  ctx.lineTo(stemBottomX + strokeWidth * 0.3, endY - strokeWidth);
  ctx.stroke();
  
  // Highlight on I
  ctx.beginPath();
  ctx.moveTo(iTopX + strokeWidth * 0.3, startY + strokeWidth);
  ctx.lineTo(iBottomX + strokeWidth * 0.3, endY - strokeWidth);
  ctx.stroke();
}

/**
 * Generate a single icon
 */
function generateIcon(config) {
  const { name, size, maskable } = config;
  
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Create orange gradient background (matching original logo)
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#ff9500'); // Bright orange at top-left
  gradient.addColorStop(0.25, '#ff8000');
  gradient.addColorStop(0.5, '#f97316'); // Main orange
  gradient.addColorStop(0.75, '#ea580c');
  gradient.addColorStop(1, '#e04a1a'); // Red-orange at bottom-right
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  // Add subtle gradient overlay for depth (lighter at top)
  const overlayGradient = ctx.createLinearGradient(0, 0, 0, size);
  overlayGradient.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
  overlayGradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.02)');
  overlayGradient.addColorStop(1, 'rgba(0, 0, 0, 0.08)');
  ctx.fillStyle = overlayGradient;
  ctx.fillRect(0, 0, size, size);
  
  // Draw the TI logo
  drawTILogo(ctx, size, maskable);
  
  // Save to file
  const outputPath = path.join(__dirname, '..', 'public', name);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  
  console.log(`✅ Generated: ${name} (${size}x${size})${maskable ? ' [maskable]' : ''}`);
}

/**
 * Main function
 */
function main() {
  console.log('🎨 Generating Trade Imperial "TI" Logo Icons...\n');
  console.log('Design:');
  console.log('  - Orange gradient background');
  console.log('  - White italic "TI" letters');
  console.log('');
  
  // Generate all icons
  ICON_CONFIGS.forEach(generateIcon);
  
  console.log('\n✅ All icons generated successfully!');
  console.log('📁 Files saved to: public/');
  console.log('\n⚠️  Remember to:');
  console.log('  1. Clear browser cache');
  console.log('  2. Remove the app from home screen');
  console.log('  3. Re-add to home screen to see the new icon');
}

main();

