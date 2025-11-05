# Custom Domain Setup - finhome360.com

## Current Status

✅ **Marketing Site Deployed**: https://29f0c836.finhome360-marketing.pages.dev  
⏳ **Custom Domain Pending**: finhome360.com

---

## Quick Setup (5 Minutes)

### Step 1: Access Cloudflare Dashboard

1. Go to https://dash.cloudflare.com
2. Log in with your Cloudflare account
3. Click on **"Workers & Pages"** in the left sidebar

### Step 2: Select Your Project

1. Find and click on: **finhome360-marketing**
2. You should see your deployment listed

### Step 3: Add Custom Domain

1. Click on the **"Custom domains"** tab
2. Click the **"Set up a custom domain"** button
3. In the domain field, enter: `finhome360.com`
4. Click **"Continue"**
5. Cloudflare will show you what it's going to do
6. Click **"Activate domain"**

### Step 4: DNS Configuration (Automatic)

Cloudflare will automatically:
- ✅ Create a CNAME record for `finhome360.com` → your Pages project
- ✅ Generate and apply SSL certificate (Universal SSL)
- ✅ Enable HTTP → HTTPS redirect
- ✅ Configure edge routing

**No manual DNS changes needed!** 🎉

### Step 5: Wait for Propagation

- **Typical time**: 1-2 minutes
- **Maximum time**: 5-10 minutes
- You'll see a green checkmark when it's ready

---

## Verification

### Check DNS
```powershell
# Windows PowerShell
nslookup finhome360.com

# Should resolve to Cloudflare's Pages infrastructure
```

### Test the Site
Once configured, visit:
- http://finhome360.com (should redirect to HTTPS)
- https://finhome360.com (your marketing site!)

---

## Expected DNS Records

After configuration, your DNS will look like:

```
Type    Name             Target/Value                           Proxy
────────────────────────────────────────────────────────────────────
CNAME   @                finhome360-marketing.pages.dev        Proxied
CNAME   app              finhome-api.samuel-1e5.workers.dev    Proxied
TXT     @                v=spf1 include:relay.mailchannels...  DNS only
TXT     _mailchannels    v=mc1 cfid=YOUR_ACCOUNT_ID            DNS only
TXT     _dmarc           v=DMARC1; p=quarantine...             DNS only
```

**Note**: The `@` CNAME for finhome360.com will be added automatically when you set up the custom domain.

---

## Alternative: Using Wrangler CLI

If you prefer command line:

```bash
cd apps/marketing
wrangler pages domain add finhome360.com --project-name=finhome360-marketing
```

This does the same thing as the dashboard method.

---

## Troubleshooting

### Domain Not Resolving

**Issue**: Site not accessible at finhome360.com after 10 minutes

**Solutions**:
1. Check if domain is already in use:
   - Go to Cloudflare Dashboard → Websites
   - Make sure finhome360.com is listed as a zone
2. Clear DNS cache:
   ```powershell
   ipconfig /flushdns
   ```
3. Try incognito/private browsing mode
4. Check DNS propagation: https://dnschecker.org

### SSL Certificate Errors

**Issue**: Browser shows SSL warning

**Solutions**:
1. Wait 5-10 more minutes (certificate provisioning)
2. Check SSL/TLS mode:
   - Cloudflare Dashboard → SSL/TLS
   - Should be "Full" or "Full (strict)"
3. Force HTTPS:
   - Cloudflare Dashboard → SSL/TLS → Edge Certificates
   - Enable "Always Use HTTPS"

### Conflicting DNS Records

**Issue**: Domain already has DNS records

**Solutions**:
1. Cloudflare will handle this automatically
2. If you manually created records, delete them first
3. Let Cloudflare Pages manage the DNS for the root domain

---

## Domain Architecture After Setup

```
┌─────────────────────────────────────────────────────────┐
│  User Request                                            │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────┐
         │  finhome360.com         │
         │  (Root Domain)          │
         └─────────────┬───────────┘
                       │
                       ▼
         ┌─────────────────────────┐
         │  Cloudflare DNS         │
         │  (Proxy Enabled)        │
         └─────────────┬───────────┘
                       │
                       ▼
         ┌─────────────────────────┐
         │  Cloudflare Pages       │
         │  (Static Site)          │
         │  - Marketing Landing    │
         │  - Global CDN           │
         └─────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  app.finhome360.com                                     │
│  (Subdomain - Already Configured)                      │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────┐
         │  Cloudflare Workers     │
         │  (API + Web App)        │
         └─────────────────────────┘
```

---

## Post-Setup Checklist

After custom domain is configured:

- [ ] Visit https://finhome360.com and verify it loads
- [ ] Test all buttons and links
- [ ] Check "Launch App" button goes to app.finhome360.com
- [ ] Test on mobile device
- [ ] Run Lighthouse audit (should score 95+ on all metrics)
- [ ] Check SSL certificate (should show Cloudflare)
- [ ] Verify HTTP redirects to HTTPS
- [ ] Test page load speed (should be < 1 second)

---

## Updating the Site

After custom domain is set up, any time you want to update the marketing site:

```bash
# Navigate to marketing directory
cd apps/marketing

# Make your changes in src/app/page.tsx or other files

# Build the site
npx next build

# Deploy to production
wrangler pages deploy out --project-name=finhome360-marketing --commit-dirty=true
```

Changes go live immediately!

---

## Analytics Setup (Optional)

Consider adding analytics after domain is configured:

### Cloudflare Web Analytics (Free, Privacy-Focused)
1. Cloudflare Dashboard → Account Home → Web Analytics
2. Add site: finhome360.com
3. Copy the analytics script
4. Add to `apps/marketing/src/app/layout.tsx` in the `<head>`

### Google Analytics
Add to `apps/marketing/src/app/layout.tsx`:
```tsx
<Script src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID" />
<Script id="google-analytics">
  {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'GA_MEASUREMENT_ID');
  `}
</Script>
```

---

## Summary

**Current State**:
- ✅ Marketing site deployed to Cloudflare Pages
- ✅ Preview URL working: https://29f0c836.finhome360-marketing.pages.dev
- ⏳ Custom domain pending: finhome360.com

**Next Step**:
Go to Cloudflare Dashboard and add custom domain `finhome360.com` to the finhome360-marketing project.

**Time Required**: 5 minutes setup + 2 minutes propagation = 7 minutes total

**Result**: 
Your professional marketing site will be live at https://finhome360.com with:
- Fast global delivery
- Automatic SSL
- 99.99% uptime
- Zero configuration needed

---

**Ready to go live?** 🚀

Follow Step 1-5 above and your site will be live at finhome360.com in minutes!
