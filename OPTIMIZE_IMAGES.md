# Image Optimization Guide

## Current Issue

The favicon and logo images in the `public/` directory are currently 1.5MB each (6MB total). This significantly impacts page load performance.

## Files to Optimize

- `public/favicon.ico` (1.5MB) → should be ~10-50KB
- `public/favicon.png` (1.5MB) → should be ~10-50KB
- `public/apple-touch-icon.png` (1.5MB) → should be ~50-100KB
- `public/paperboy-logo.png` (1.5MB) → depends on usage, but likely ~100-200KB

## Recommended Optimization Steps

### Option 1: Using Online Tools

1. **For favicons (favicon.ico, favicon.png)**:
   - Visit https://realfavicongenerator.net/
   - Upload your logo
   - Generate optimized favicons in proper sizes
   - Download and replace existing files

2. **For PNG images**:
   - Visit https://tinypng.com/
   - Upload the PNG files
   - Download compressed versions
   - Replace existing files

### Option 2: Using Command Line Tools

#### Install sharp (Node.js)

```bash
npm install --save-dev sharp
```

Then create and run this script:

```javascript
// optimize-images.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function optimizeImages() {
  const publicDir = path.join(__dirname, 'public');

  // Optimize logo
  await sharp(path.join(publicDir, 'paperboy-logo.png'))
    .resize(512, 512, { fit: 'inside' })
    .png({ quality: 80, compressionLevel: 9 })
    .toFile(path.join(publicDir, 'paperboy-logo-optimized.png'));

  // Create favicon.png
  await sharp(path.join(publicDir, 'paperboy-logo.png'))
    .resize(32, 32)
    .png({ quality: 80 })
    .toFile(path.join(publicDir, 'favicon-optimized.png'));

  // Create apple-touch-icon
  await sharp(path.join(publicDir, 'paperboy-logo.png'))
    .resize(180, 180)
    .png({ quality: 80 })
    .toFile(path.join(publicDir, 'apple-touch-icon-optimized.png'));

  console.log('Images optimized! Replace the original files with the -optimized versions.');
}

optimizeImages().catch(console.error);
```

Run: `node optimize-images.js`

#### Using ImageMagick

```bash
# Install ImageMagick first
# macOS: brew install imagemagick
# Ubuntu: sudo apt-get install imagemagick

# Optimize logo
convert public/paperboy-logo.png -resize 512x512 -quality 85 public/paperboy-logo-optimized.png

# Create favicon
convert public/paperboy-logo.png -resize 32x32 public/favicon-optimized.png
convert public/favicon-optimized.png public/favicon-optimized.ico

# Create apple touch icon
convert public/paperboy-logo.png -resize 180x180 -quality 85 public/apple-touch-icon-optimized.png
```

### Option 3: Using Modern Web Formats

Consider using WebP format for even better compression:

```bash
# Convert to WebP
npx @squoosh/cli --webp auto public/paperboy-logo.png
```

## Target Sizes

- `favicon.ico`: 16x16, 32x32 (multi-resolution ICO file, <50KB)
- `favicon.png`: 32x32 (<10KB)
- `apple-touch-icon.png`: 180x180 (<100KB)
- `paperboy-logo.png`: 512x512 or original dimensions (<200KB)

## After Optimization

1. Replace the original files with optimized versions
2. Test page load performance
3. Verify images display correctly across different devices
4. Consider adding these to your build process to prevent regressions

## Expected Performance Improvement

- Before: ~6MB of images loaded on every page
- After: ~200-400KB of images loaded on every page
- **Result: ~15-30x reduction in image payload** leading to faster initial page loads
