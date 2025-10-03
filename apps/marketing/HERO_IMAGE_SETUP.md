# Hero Background Image Setup

## Image Placement

To use your financial analytics chart image as the hero background:

1. **Save the image** you attached as:
   ```
   apps/marketing/public/hero-background.jpg
   ```

2. **The code is already configured** to use this image at `/hero-background.jpg`

## Manual Steps (Do This Now)

### Step 1: Add the Image File
```powershell
# From the workspace root, copy your image file:
# Save the attached image as: apps/marketing/public/hero-background.jpg
```

Or manually:
1. Navigate to `d:\DEV\finhome\apps\marketing\public\`
2. Save/copy the financial chart image there
3. Name it: `hero-background.jpg`

### Step 2: Rebuild and Deploy
```powershell
# Build the site
cd apps/marketing
npx next build

# Deploy to Cloudflare Pages
wrangler pages deploy out --project-name=finhome360-marketing --commit-dirty=true
```

## What Was Updated

### Hero Section Styling
The landing page now features:
- ✅ **Full-screen hero background** using your financial analytics image
- ✅ **Dark overlay** (blue-900/90 to purple-900/90) for text readability
- ✅ **White text** with drop shadows for contrast
- ✅ **Glassmorphism effects** on stat cards (backdrop-blur)
- ✅ **Updated header** with white text and contrasting button
- ✅ **Improved CTAs** with better visibility on dark background

### Visual Hierarchy
- Background image fills entire hero section
- Dark gradient overlay ensures text is readable
- Stats cards use glass morphism (semi-transparent with blur)
- Header has subtle gradient background
- All text elements have proper contrast

## Image Requirements

For best results, your hero background image should be:
- **Format**: JPG or PNG
- **Size**: 1920x1080 or larger (Full HD+)
- **Aspect Ratio**: 16:9 or wider
- **File Size**: < 500KB (optimized for web)
- **Content**: Financial charts, analytics dashboard, graphs

Your provided image (financial analytics chart with candlesticks) is perfect! ✅

## Testing

After adding the image and rebuilding:
1. Open preview URL: https://29f0c836.finhome360-marketing.pages.dev
2. Check that:
   - Background image loads
   - Text is readable over the image
   - Stats cards have glass effect
   - Buttons are clearly visible
   - Mobile layout works well

## Fallback

If the image doesn't load:
- Page will show the gradient overlays on a transparent background
- Site remains functional and readable
- No broken image icons (background images fail gracefully)

## Alternative: Use Unsplash or Stock Image

If you don't have the image readily available, you can use a stock image temporarily:

```tsx
// In page.tsx, replace the backgroundImage line with:
style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1642790595397-7047dc98fa72?w=1920)' }}
```

This uses a free financial analytics image from Unsplash.

## Next Steps

1. ✅ Code updated (done)
2. ⏳ Add image file to `apps/marketing/public/hero-background.jpg`
3. ⏳ Rebuild: `npx next build`
4. ⏳ Deploy: `wrangler pages deploy out --project-name=finhome360-marketing --commit-dirty=true`
5. ✅ View updated site!
