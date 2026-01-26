/**
 * Resize Logo to PWA Icons
 * 
 * This script takes a source logo image and resizes it to all required PWA icon sizes.
 * Place the source logo as 'ti-logo-source.png' in the public folder before running.
 */

const { createCanvas, loadImage } = require('canvas');
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

async function generateIcons() {
  const sourcePath = path.join(__dirname, '..', 'public', 'ti-logo-source.png');
  const publicDir = path.join(__dirname, '..', 'public');
  
  // Check if source exists
  if (!fs.existsSync(sourcePath)) {
    console.error('❌ Source logo not found at:', sourcePath);
    console.log('Please save the TI logo as "ti-logo-source.png" in the public folder');
    process.exit(1);
  }
  
  console.log('🎨 Loading source logo...');
  const sourceImage = await loadImage(sourcePath);
  console.log(`✅ Loaded: ${sourceImage.width}x${sourceImage.height}`);
  
  console.log('\n📦 Generating icons...\n');
  
  for (const config of ICON_CONFIGS) {
    const { name, size, maskable } = config;
    
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    if (maskable) {
      // For maskable icons, add padding (safe zone is 80% of the icon)
      // Fill background with the dominant color (orange)
      ctx.fillStyle = '#f97316'; // Orange background
      ctx.fillRect(0, 0, size, size);
      
      // Draw image with 10% padding on each side (80% in center)
      const padding = size * 0.1;
      const drawSize = size * 0.8;
      ctx.drawImage(sourceImage, padding, padding, drawSize, drawSize);
    } else {
      // Draw image at full size
      ctx.drawImage(sourceImage, 0, 0, size, size);
    }
    
    // Save to file
    const outputPath = path.join(publicDir, name);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    
    console.log(`✅ Generated: ${name} (${size}x${size})${maskable ? ' [maskable]' : ''}`);
  }
  
  console.log('\n✅ All icons generated successfully!');
  console.log('📁 Files saved to: public/');
  console.log('\n⚠️  Remember to:');
  console.log('  1. Clear browser cache');
  console.log('  2. Remove the app from home screen');
  console.log('  3. Re-add to home screen to see the new icon');
}

generateIcons().catch(console.error);

