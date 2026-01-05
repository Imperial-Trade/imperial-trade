/**
 * Generate PWA Icons with Dark Background and Gold Crown
 * 
 * This script creates all necessary PWA icons with the Trade Imperial branding:
 * - Dark navy background (#1a1a2e)
 * - Gold crown icon
 * - Gold glow effect
 * - Rounded corners
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Colors
const BACKGROUND_COLOR = '#1a1a2e';
const GOLD_PRIMARY = '#c09a58';
const GOLD_LIGHT = '#d4af37';
const GOLD_DARK = '#aa8640';

// Icon sizes to generate
const ICON_SIZES = [
  { name: 'favicon-16x16.png', size: 16, rounded: true },
  { name: 'favicon-32x32.png', size: 32, rounded: true },
  { name: 'apple-touch-icon.png', size: 180, rounded: false }, // iOS adds its own rounding
  { name: 'icon-192x192.png', size: 192, rounded: true },
  { name: 'icon-512x512.png', size: 512, rounded: true },
  { name: 'icon-maskable-192x192.png', size: 192, rounded: false, maskable: true },
  { name: 'icon-maskable-512x512.png', size: 512, rounded: false, maskable: true },
];

/**
 * Draw a rounded rectangle
 */
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Draw the crown icon - matching the imperial-logo.png style
 * 3 peaks with curved swoops and two horizontal base lines
 */
function drawCrown(ctx, centerX, centerY, crownWidth, crownHeight, strokeWidth) {
  const halfWidth = crownWidth / 2;
  const halfHeight = crownHeight / 2;
  
  // Create gradient for crown
  const gradient = ctx.createLinearGradient(
    centerX - halfWidth, centerY - halfHeight,
    centerX + halfWidth, centerY + halfHeight
  );
  gradient.addColorStop(0, GOLD_LIGHT);
  gradient.addColorStop(0.5, GOLD_PRIMARY);
  gradient.addColorStop(1, GOLD_DARK);
  
  ctx.strokeStyle = gradient;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Crown shape - matching the logo with 3 peaks
  // The crown has: swooping sides, center peak highest, two side peaks
  const baseY = centerY + halfHeight * 0.2;
  const centerPeakY = centerY - halfHeight * 0.85;
  const sidePeakY = centerY - halfHeight * 0.35;
  const valleyY = centerY - halfHeight * 0.05;
  
  ctx.beginPath();
  
  // Start from bottom left, swooping up
  ctx.moveTo(centerX - halfWidth * 0.95, baseY);
  
  // Curve up to left peak
  ctx.quadraticCurveTo(
    centerX - halfWidth * 0.8, sidePeakY - halfHeight * 0.2,
    centerX - halfWidth * 0.55, sidePeakY
  );
  
  // Down to left valley
  ctx.quadraticCurveTo(
    centerX - halfWidth * 0.35, valleyY + halfHeight * 0.1,
    centerX - halfWidth * 0.2, valleyY
  );
  
  // Up to center peak (tallest) - sharp point
  ctx.lineTo(centerX, centerPeakY);
  
  // Down to right valley
  ctx.lineTo(centerX + halfWidth * 0.2, valleyY);
  ctx.quadraticCurveTo(
    centerX + halfWidth * 0.35, valleyY + halfHeight * 0.1,
    centerX + halfWidth * 0.55, sidePeakY
  );
  
  // Curve down to bottom right
  ctx.quadraticCurveTo(
    centerX + halfWidth * 0.8, sidePeakY - halfHeight * 0.2,
    centerX + halfWidth * 0.95, baseY
  );
  
  ctx.stroke();
  
  // Draw first base line (thicker band)
  const bandY1 = centerY + halfHeight * 0.55;
  ctx.lineWidth = strokeWidth * 1.2;
  ctx.beginPath();
  ctx.moveTo(centerX - halfWidth * 0.75, bandY1);
  ctx.lineTo(centerX + halfWidth * 0.75, bandY1);
  ctx.stroke();
  
  // Draw second base line (thinner, lower)
  const bandY2 = centerY + halfHeight * 0.85;
  ctx.lineWidth = strokeWidth * 0.9;
  ctx.beginPath();
  ctx.moveTo(centerX - halfWidth * 0.6, bandY2);
  ctx.lineTo(centerX + halfWidth * 0.6, bandY2);
  ctx.stroke();
}

/**
 * Draw gold glow effect around the edges
 */
function drawGlow(ctx, size, radius, glowSize) {
  // Create outer glow
  ctx.save();
  ctx.shadowColor = GOLD_PRIMARY;
  ctx.shadowBlur = glowSize;
  ctx.strokeStyle = GOLD_PRIMARY;
  ctx.lineWidth = 2;
  
  roundRect(ctx, glowSize/2, glowSize/2, size - glowSize, size - glowSize, radius);
  ctx.stroke();
  ctx.restore();
}

/**
 * Generate a single icon
 */
function generateIcon(config) {
  const { name, size, rounded, maskable } = config;
  
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Calculate dimensions
  const padding = maskable ? size * 0.1 : 0; // Maskable icons need safe zone
  const cornerRadius = rounded ? size * 0.15 : 0;
  const glowSize = size * 0.03;
  
  // Fill background
  ctx.fillStyle = BACKGROUND_COLOR;
  if (rounded) {
    roundRect(ctx, 0, 0, size, size, cornerRadius);
    ctx.fill();
  } else {
    ctx.fillRect(0, 0, size, size);
  }
  
  // Add glow effect for non-maskable icons
  if (!maskable && size >= 32) {
    drawGlow(ctx, size, cornerRadius, Math.max(4, size * 0.02));
  }
  
  // Draw crown
  const crownSize = size * (maskable ? 0.4 : 0.5);
  const strokeWidth = Math.max(2, size * 0.04);
  const centerY = size * (maskable ? 0.48 : 0.45);
  
  drawCrown(ctx, size / 2, centerY, crownSize, crownSize * 0.8, strokeWidth);
  
  // Save to file
  const outputPath = path.join(__dirname, '..', 'public', name);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  
  console.log(`✅ Generated: ${name} (${size}x${size})`);
}

/**
 * Main function
 */
function main() {
  console.log('🎨 Generating Trade Imperial PWA Icons...\n');
  console.log('Design specs:');
  console.log(`  Background: ${BACKGROUND_COLOR}`);
  console.log(`  Crown: ${GOLD_PRIMARY}`);
  console.log('');
  
  // Generate all icons
  ICON_SIZES.forEach(generateIcon);
  
  console.log('\n✅ All icons generated successfully!');
  console.log('📁 Files saved to: public/');
  console.log('\n⚠️  Remember to:');
  console.log('  1. Clear browser cache');
  console.log('  2. Remove the app from home screen');
  console.log('  3. Re-add to home screen to see the new icon');
}

main();

