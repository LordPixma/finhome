// Cloudflare Worker for subdomain routing to Pages
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const hostname = url.hostname;
    
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
          
          return fetch(apiUrl, {
            method: request.method,
            headers: request.headers,
            body: request.body,
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
  // List of valid tenant subdomains (in production, this would query your database)
  const validTenants = [
    'odekunle', 'demofamily', 'family', 'smith', 'johnson', 
    'williams', 'brown', 'jones', 'garcia', 'miller'
  ];
  
  return validTenants.includes(subdomain);
}