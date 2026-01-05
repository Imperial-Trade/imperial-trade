/**
 * Generate Open Graph Image for Social Media & Search
 * 
 * Creates a 1200x630 image with the TI logo for:
 * - Google Search previews
 * - Facebook/Twitter/LinkedIn shares
 * - Social media cards
 */

const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

async function generateOGImage() {
  const width = 1200;
  const height = 630;
  
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Dark gradient background matching the brand
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#0a0a0a');
  gradient.addColorStop(0.5, '#111111');
  gradient.addColorStop(1, '#1a1a1a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Add subtle gold accent line at top
  const accentGradient = ctx.createLinearGradient(0, 0, width, 0);
  accentGradient.addColorStop(0, 'rgba(192, 154, 88, 0)');
  accentGradient.addColorStop(0.3, 'rgba(192, 154, 88, 0.8)');
  accentGradient.addColorStop(0.7, 'rgba(192, 154, 88, 0.8)');
  accentGradient.addColorStop(1, 'rgba(192, 154, 88, 0)');
  ctx.fillStyle = accentGradient;
  ctx.fillRect(0, 0, width, 3);
  
  // Load and draw the TI logo in the center
  const logoPath = path.join(__dirname, '..', 'public', 'ti-logo-source.png');
  const logo = await loadImage(logoPath);
  
  // Draw logo centered, sized appropriately
  const logoSize = 280;
  const logoX = (width - logoSize) / 2;
  const logoY = (height - logoSize) / 2 - 40;
  ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
  
  // Add "TRADE IMPERIAL" text below logo
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('TRADE IMPERIAL', width / 2, logoY + logoSize + 60);
  
  // Add tagline
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '24px Arial, sans-serif';
  ctx.fillText('Premium Trading Education & Professional Mentorship', width / 2, logoY + logoSize + 100);
  
  // Save as PNG (higher quality)
  const pngPath = path.join(__dirname, '..', 'public', 'og-image.png');
  const pngBuffer = canvas.toBuffer('image/png');
  fs.writeFileSync(pngPath, pngBuffer);
  console.log('✅ Generated: og-image.png');
  
  // Save as JPG for compatibility
  const jpgPath = path.join(__dirname, '..', 'public', 'og-image.jpg');
  const jpgBuffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
  fs.writeFileSync(jpgPath, jpgBuffer);
  console.log('✅ Generated: og-image.jpg');
  
  console.log('\n✅ Open Graph images generated!');
  console.log('📁 Files saved to: public/og-image.png and public/og-image.jpg');
}

generateOGImage().catch(console.error);

