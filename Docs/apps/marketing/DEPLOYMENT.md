# Cloudflare Pages Deployment Guide - Finhome360 Marketing Site

## ✅ Deployment Status: SUCCESSFUL

The marketing site has been deployed to Cloudflare Pages!

**Preview URL**: https://29f0c836.finhome360-marketing.pages.dev

---

## 🎯 Next Step: Configure Custom Domain

To make the site accessible at **finhome360.com** (root domain):

### Option 1: Using Cloudflare Dashboard (Recommended)

1. **Go to Cloudflare Dashboard**:
   - Navigate to https://dash.cloudflare.com
   - Click on "Workers & Pages"
   - Select your project: **finhome360-marketing**

2. **Add Custom Domain**:
   - Click on "Custom domains" tab
   - Click "Set up a custom domain"
   - Enter: `finhome360.com`
   - Click "Continue"

3. **Cloudflare will automatically**:
   - Create DNS records pointing to your Pages site
   - Set up SSL/TLS certificate
   - Configure routing

4. **Wait 1-2 minutes** for DNS propagation

### Option 2: Using Wrangler CLI

```bash
cd apps/marketing
wrangler pages domain add finhome360.com --project-name=finhome360-marketing
```

---

## 🔧 Configuration Summary

### Build Settings
- **Framework**: Next.js 14 (Static Export)
- **Build Command**: `npx next build`
- **Output Directory**: `out/`
- **Node Version**: 18+

### Deployment Settings
- **Project Name**: `finhome360-marketing`
- **Production Branch**: `main`
- **Preview URL**: https://29f0c836.finhome360-marketing.pages.dev

### Custom Domains (To Configure)
- **Production**: `finhome360.com` (root domain)
- **Web App**: `app.finhome360.com` (already configured)

---

## 🚀 Deployment Commands

### Manual Deployment (Future Updates)

```bash
# From workspace root
cd apps/marketing

# Build the site
npx next build

# Deploy to Cloudflare Pages
wrangler pages deploy out --project-name=finhome360-marketing --commit-dirty=true
```

### Automatic Deployment (Recommended Setup)

Connect your GitHub repository to Cloudflare Pages for automatic deployments on push:

1. Go to Cloudflare Dashboard → Workers & Pages
2. Click on **finhome360-marketing**
3. Go to Settings → Builds & deployments
4. Click "Connect to Git"
5. Select your repository: **LordPixma/finhome**
6. Configure:
   - **Production branch**: `main`
   - **Build command**: `cd apps/marketing && npx next build`
   - **Build output directory**: `apps/marketing/out`
   - **Root directory**: `/` (leave as root)

This way, every push to `main` will automatically rebuild and deploy your site!

---

## 📁 Deployed Files

The following files were deployed:
- 27 static files
- Total size: ~2.2MB
- Includes: HTML, CSS, JS, images, fonts
- _headers file (for security headers)
- _routes.json (for routing configuration)

---

## 🌐 DNS Configuration

### Current Setup
```
app.finhome360.com  → Cloudflare Workers (API + Web App)
finhome360.com      → Will point to Cloudflare Pages (Marketing Site)
```

### After Custom Domain Setup
When you add the custom domain, Cloudflare will automatically:
- Create a CNAME or A record for `finhome360.com`
- Point it to the Pages deployment
- Enable Universal SSL
- Set up HTTP → HTTPS redirect

---

## 🔒 Security Headers

The site includes the following security headers (via `_headers` file):
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` - Restricts camera, microphone, geolocation

### Caching Strategy
- Static assets (`/_next/static/*`): 1 year cache
- CSS/JS files: 1 year cache, immutable
- Favicon: 1 day cache
- HTML: No cache (fresh on every visit)

---

## 📊 Performance Optimizations

The site is optimized for performance:
- ✅ Static HTML generation (no server rendering)
- ✅ Code splitting and lazy loading
- ✅ Optimized images (unoptimized flag for Cloudflare)
- ✅ Minified CSS and JavaScript
- ✅ Gzip/Brotli compression by Cloudflare
- ✅ Global CDN distribution
- ✅ HTTP/2 and HTTP/3 support

---

## 🔄 Update Workflow

### Making Changes to the Marketing Site

1. **Edit files** in `apps/marketing/src/`
2. **Test locally** (optional):
   ```bash
   cd apps/marketing
   npx next dev -p 3005
   ```
3. **Build**:
   ```bash
   npx next build
   ```
4. **Deploy**:
   ```bash
   wrangler pages deploy out --project-name=finhome360-marketing --commit-dirty=true
   ```

Or just push to GitHub if you've set up automatic deployments!

---

## 🧪 Testing

### Preview the Site
Visit the preview URL: https://29f0c836.finhome360-marketing.pages.dev

### Test Checklist
- ✅ Hero section loads correctly
- ✅ All 6 feature cards display
- ✅ "Launch App" button links to app.finhome360.com
- ✅ "Get Started Free" buttons work
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Fast loading times
- ✅ No console errors

---

## 📝 Notes

### Environment Variables
The marketing site is static and doesn't require environment variables.

### Future Enhancements
Consider adding:
- Google Analytics or Cloudflare Web Analytics
- Contact form (using Cloudflare Workers or external service)
- Blog section (using static generation)
- Customer testimonials
- Pricing page
- FAQ section

### Monitoring
- View analytics in Cloudflare Dashboard → Pages → Analytics
- Monitor requests, bandwidth, and errors
- Check Web Vitals scores

---

## 🆘 Troubleshooting

### Site Not Loading
1. Check DNS propagation: https://dnschecker.org
2. Verify custom domain in Cloudflare Dashboard
3. Check SSL certificate status

### Build Failures
1. Ensure Node.js 18+ is installed
2. Run `npm install` in the root directory
3. Check for TypeScript errors: `npx tsc --noEmit`

### Deployment Errors
1. Verify you're authenticated: `wrangler whoami`
2. Check project name matches: `finhome360-marketing`
3. Ensure `out/` directory exists after build

---

## 📞 Support

If you encounter issues:
- Cloudflare Pages Docs: https://developers.cloudflare.com/pages/
- Wrangler Docs: https://developers.cloudflare.com/workers/wrangler/
- Next.js Docs: https://nextjs.org/docs

---

## ✨ Summary

**Deployment Complete!** 🎉

Your marketing site is now live on Cloudflare's global CDN. Once you configure the custom domain (finhome360.com), visitors will be able to access it at the root domain while your web app continues to run at app.finhome360.com.

**Next Action**: Add custom domain `finhome360.com` in Cloudflare Dashboard → Pages → finhome360-marketing → Custom domains.
