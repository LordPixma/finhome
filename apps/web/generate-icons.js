#!/usr/bin/env node

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function generateIcons() {
  const logoPath = path.join(__dirname, 'public', 'logo.png');
  const publicDir = path.join(__dirname, 'public');
  
  // Check if logo exists
  if (!fs.existsSync(logoPath)) {
    console.error('Logo file not found at:', logoPath);
    process.exit(1);
  }
  
  console.log('Generating icons from logo.png...');
  
  // Define the icon sizes we need to generate
  const iconSizes = [
    { size: 16, name: 'favicon-16x16.png' },
    { size: 32, name: 'favicon-32x32.png' },
    { size: 180, name: 'apple-touch-icon.png' },
    { size: 192, name: 'icon-192x192.png' },
    { size: 512, name: 'icon-512x512.png' }
  ];
  
  try {
    // Generate each icon size
    for (const icon of iconSizes) {
      const outputPath = path.join(publicDir, icon.name);
      
      await sharp(logoPath)
        .resize(icon.size, icon.size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent background
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generated ${icon.name} (${icon.size}x${icon.size})`);
    }
    
    // Generate favicon.ico (multi-size ICO file)
    const faviconPath = path.join(publicDir, 'favicon.ico');
    await sharp(logoPath)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(faviconPath);
    
    console.log('✅ Generated favicon.ico (32x32)');
    
    console.log('\n🎉 All icons generated successfully!');
    console.log('\nGenerated files:');
    iconSizes.forEach(icon => {
      console.log(`  - ${icon.name} (${icon.size}x${icon.size})`);
    });
    console.log('  - favicon.ico (32x32)');
    
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

// Run the function
generateIcons().catch(console.error);