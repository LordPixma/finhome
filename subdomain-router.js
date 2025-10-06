// Cloudflare Worker for subdomain routing to Pages
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const hostname = url.hostname;
    
    // Check if this is a subdomain request
    const subdomainMatch = hostname.match(/^([^.]+)\.finhome360\.com$/);
    
    if (subdomainMatch) {
      const subdomain = subdomainMatch[1];
      
      // System subdomains - redirect to Pages directly
      if (['app', 'www', 'api', 'admin', 'docs'].includes(subdomain)) {
        // For 'app' subdomain, serve from the finhome360 Pages project
        if (subdomain === 'app') {
          const pagesUrl = new URL(request.url);
          pagesUrl.hostname = 'finhome360.pages.dev';
          
          const response = await fetch(pagesUrl, {
            method: request.method,
            headers: request.headers,
            body: request.body,
          });
          
          return response;
        }
        
        // Other system subdomains - redirect to app
        return Response.redirect(`https://app.finhome360.com${url.pathname}${url.search}`, 302);
      }
      
      // Tenant subdomains - validate and serve
      // For now, serve from the same Pages deployment
      // Later we can add tenant validation here
      const pagesUrl = new URL(request.url);
      pagesUrl.hostname = 'finhome360.pages.dev';
      
      const response = await fetch(pagesUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });
      
      return response;
    }
    
    // Base domain - redirect to app subdomain
    if (hostname === 'finhome360.com') {
      return Response.redirect(`https://app.finhome360.com${url.pathname}${url.search}`, 301);
    }
    
    // Fallback
    return new Response('Not Found', { status: 404 });
  },
};