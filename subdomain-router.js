// Cloudflare Worker for subdomain routing to Pages
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const hostname = url.hostname;
    
    // Diagnostic endpoint: show router configuration
    if (url.pathname === '/_router-info') {
      return new Response(JSON.stringify({
        router: 'finhome-subdomain-router',
        env: env.ENVIRONMENT || 'unknown',
        apiHostname: env.API_HOSTNAME || 'finhome.samuel-1e5.workers.dev',
        pagesHostname: env.PAGES_HOSTNAME || 'd00a4a8d.finhome360-app.pages.dev',
        requestHost: hostname,
        timestamp: new Date().toISOString()
      }, null, 2), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check if this is a subdomain request
    const subdomainMatch = hostname.match(/^([^.]+)\.finhome360\.com$/);
    
    if (subdomainMatch) {
      const subdomain = subdomainMatch[1];
      
      // System subdomains - handle specially
      if (['app', 'www', 'api', 'admin', 'docs'].includes(subdomain)) {
        // API subdomain - proxy to Workers API
        if (subdomain === 'api') {
          const apiUrl = new URL(request.url);
          // Route API traffic to the Finhome API worker. Prefer env override.
          // IMPORTANT: The active API worker is "finhome" not "finhome-api".
          // Set API_HOSTNAME env var in Cloudflare to avoid hardcoding here.
          apiUrl.hostname = env.API_HOSTNAME || 'finhome.samuel-1e5.workers.dev';
          
          // CRITICAL: Don't follow redirects - pass them through to the browser
          // This is essential for OAuth callbacks that redirect to the frontend
          return fetch(apiUrl, {
            method: request.method,
            headers: request.headers,
            body: request.body,
            redirect: 'manual', // Don't follow redirects - return them as-is
          });
        }
        
        // App/www subdomain - serve from Pages
        if (subdomain === 'app' || subdomain === 'www') {
          return await serveFromPages(request, env);
        }
        
        // Other system subdomains - redirect to app
        return Response.redirect(`https://app.finhome360.com${url.pathname}${url.search}`, 302);
      }
      
      // Tenant subdomains - validate and serve with tenant context
      if (await isValidTenant(subdomain, env)) {
        // Add tenant parameter to URL for proper routing
        const tenantUrl = new URL(request.url);
        tenantUrl.searchParams.set('tenant', subdomain);
        
        // Serve from Pages with tenant context
        const tenantRequest = new Request(tenantUrl.toString(), {
          method: request.method,
          headers: request.headers,
          body: request.body,
        });
        return await serveFromPages(tenantRequest, env);
      } else {
        // Invalid tenant - redirect to app with error
        return Response.redirect(`https://app.finhome360.com?error=invalid-tenant`, 404);
      }
    }
    
    // Base domain - redirect to app subdomain  
    if (hostname === 'finhome360.com') {
      return Response.redirect(`https://app.finhome360.com${url.pathname}${url.search}`, 301);
    }
    
    // Fallback
    return new Response('Not Found', { status: 404 });
  },
};

// Helper function to serve content from Pages
async function serveFromPages(request, env) {
  const pagesUrl = new URL(request.url);
  pagesUrl.hostname = env.PAGES_HOSTNAME || 'd00a4a8d.finhome360-app.pages.dev';
  
  const response = await fetch(pagesUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });
  
  return response;
}

// Helper function to validate if subdomain is a valid tenant
async function isValidTenant(subdomain, env) {
  // Basic format validation to avoid obvious invalid requests
  const isValidFormat = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i.test(subdomain);
  if (!isValidFormat) {
    return false;
  }

  // We used to rely on a static allowlist which blocked newly created tenants.
  // Allow all well-formed subdomains to flow through so the app can validate
  // against the live tenant database and show an appropriate error if needed.
  return true;
}