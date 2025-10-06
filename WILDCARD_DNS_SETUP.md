# Wildcard DNS Setup for Subdomain Routing

## 🎯 Goal
Configure DNS to route all subdomains (`*.finhome360.com`) through our Cloudflare Worker for proper multi-tenant subdomain handling.

## 📋 What We Need to Set Up

### DNS Records Required:
1. **Root domain**: `finhome360.com` → Worker  
2. **Wildcard**: `*.finhome360.com` → Worker
3. **API subdomain**: `api.finhome360.com` → Worker (proxies to API Worker)
4. **App subdomain**: `app.finhome360.com` → Worker (proxies to Pages)

## 🔧 Implementation Steps

### Step 1: Access Cloudflare DNS Dashboard
1. Go to https://dash.cloudflare.com
2. Select your domain: `finhome360.com`
3. Click on **DNS** in the left sidebar

### Step 2: Configure DNS Records

#### Record 1: Root Domain (A Record)
- **Type**: A
- **Name**: `@` (or `finhome360.com`)  
- **Value**: `192.0.2.1` (placeholder IP - will be overridden by Worker route)
- **Proxy Status**: ✅ **Proxied** (orange cloud)
- **TTL**: Auto

#### Record 2: Wildcard Subdomain (A Record)
- **Type**: A  
- **Name**: `*`
- **Value**: `192.0.2.1` (placeholder IP - will be overridden by Worker route)
- **Proxy Status**: ✅ **Proxied** (orange cloud)
- **TTL**: Auto

### Step 3: Verify Worker Route Configuration
The Worker is already deployed with these routes:
```
✅ finhome360.com/* (zone name: finhome360.com)  
✅ *.finhome360.com/* (zone name: finhome360.com)
```

### Step 4: Test Subdomain Routing

Once DNS is configured, these URLs should work:

1. **Root domain**: `https://finhome360.com` → redirects to app
2. **App subdomain**: `https://app.finhome360.com` → serves Pages app
3. **API subdomain**: `https://api.finhome360.com` → proxies to API Worker  
4. **Tenant subdomains**: 
   - `https://odekunle.finhome360.com` → serves app with `?tenant=odekunle`
   - `https://demofamily.finhome360.com` → serves app with `?tenant=demofamily`

## 🚀 How It Works

```
User Request: https://odekunle.finhome360.com
     ↓
DNS Resolution: *.finhome360.com → Worker  
     ↓
Worker Logic:
  - Extract subdomain: "odekunle"
  - Validate tenant exists: ✅
  - Add ?tenant=odekunle parameter
  - Proxy to Pages: d00a4a8d.finhome360-app.pages.dev?tenant=odekunle
     ↓
Frontend receives request with tenant context
```

## 🔍 Testing Commands

After DNS setup, test with curl:

```bash
# Test root domain redirect
curl -I https://finhome360.com

# Test app subdomain  
curl -I https://app.finhome360.com

# Test API subdomain
curl -I https://api.finhome360.com/health

# Test tenant subdomain
curl -I https://odekunle.finhome360.com
```

## ⚠️ Important Notes

1. **DNS Propagation**: Changes may take 5-10 minutes to propagate
2. **Proxy Status**: Must be **Proxied** (orange cloud) for Worker routes to work
3. **Placeholder IPs**: The IP addresses (192.0.2.1) are placeholders - Workers routes override them
4. **SSL**: Cloudflare automatically handles SSL certificates for all subdomains

## ✅ Success Indicators

When working correctly:
- ✅ `https://odekunle.finhome360.com` loads the app
- ✅ TenantIndicator shows "odekunle" in the dashboard  
- ✅ API calls include proper tenant context
- ✅ No more need for `?tenant=` URL parameters

## 🐛 Troubleshooting

**If subdomains don't work:**
1. Check DNS records are **Proxied** (orange cloud)
2. Verify Worker routes are deployed
3. Check browser developer tools for errors
4. Wait for DNS propagation (up to 24 hours max)

**If tenant context is missing:**
1. Check Worker logs in Cloudflare dashboard
2. Verify tenant name is in `validTenants` array
3. Ensure frontend SubdomainRedirect component is working