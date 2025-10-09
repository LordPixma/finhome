import { api } from './api';

/**
 * Utility functions for handling tenant subdomains
 */

/**
 * Get the current subdomain from hostname or URL parameter
 * Prefers actual subdomain routing over URL parameter fallback
 */
export function getCurrentSubdomain(): string | null {
  if (typeof window === 'undefined') return null;
  
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  
  // First, check hostname subdomain (preferred method)
  // For localhost development
  if (hostname.includes('localhost')) {
    if (parts.length === 2 && parts[1] === 'localhost') {
      return parts[0]; // e.g., "demo.localhost" -> "demo"
    }
  }
  
  // For production (finhome360.com) - check for actual subdomain
  if (parts.length >= 3) {
    const subdomain = parts[0];
    // Skip system subdomains (www, api, admin) but allow app and tenant subdomains
    // 'app' is treated as a special case - no specific tenant required
    if (['www', 'api', 'admin'].includes(subdomain)) {
      return null; // System subdomains don't have tenant context
    }
    // For 'app' subdomain, check if there's a tenant in URL params or localStorage
    if (subdomain === 'app') {
      // Check URL parameter first
      const urlParams = new URLSearchParams(window.location.search);
      const tenantParam = urlParams.get('tenant');
      if (tenantParam) {
        return tenantParam;
      }
      // Check localStorage for last used tenant
      const savedTenant = localStorage.getItem('lastTenant');
      if (savedTenant) {
        return savedTenant;
      }
      // No tenant context for app subdomain
      return null;
    }
    // Regular tenant subdomain
    return subdomain;
  }
  
  // Fallback to URL parameter if no valid subdomain found
  const urlParams = new URLSearchParams(window.location.search);
  const tenantParam = urlParams.get('tenant');
  if (tenantParam) {
    return tenantParam;
  }
  
  return null;
}

/**
 * Test if subdomain routing is available by making a quick request
 */
async function testSubdomainAvailability(subdomain: string): Promise<boolean> {
  try {
    // Test if we can reach the subdomain
    const testUrl = `https://${subdomain}.finhome360.com`;
    await fetch(testUrl, { 
      method: 'HEAD', 
      mode: 'no-cors',
      signal: AbortSignal.timeout(3000) // 3 second timeout
    });
    return true;
  } catch (error) {
    // If subdomain routing fails, fall back to URL parameters
    console.log('Subdomain routing not available, using URL parameter fallback');
    return false;
  }
}

/**
 * Check if current domain is the app domain (app.finhome360.com)
 */
export function isAppDomain(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.startsWith('app.');
}

/**
 * Redirect to dashboard with tenant context (subdomain preferred, URL parameter fallback)
 */
export async function redirectToTenantSubdomain(): Promise<void> {
  if (typeof window === 'undefined') return;
  
  try {
    // Get user's tenant information
    const response = await api.getTenantInfo() as any;
    if (response.success && response.data) {
      const { subdomain } = response.data;
      
      // Save tenant to localStorage for app subdomain
      localStorage.setItem('lastTenant', subdomain);
      
      // Try subdomain approach first (if wildcard DNS is configured)
      const isSubdomainAvailable = await testSubdomainAvailability(subdomain);
      
      let targetUrl: URL;
      
      if (isSubdomainAvailable) {
        // Use actual subdomain routing
        targetUrl = new URL(`https://${subdomain}.finhome360.com`);
        targetUrl.pathname = '/dashboard';
      } else {
        // Fallback to URL parameter approach or stay on app domain
        targetUrl = new URL(window.location.href);
        targetUrl.searchParams.set('tenant', subdomain);
        
        // Redirect to dashboard if coming from login/register
        if (targetUrl.pathname === '/login' || targetUrl.pathname === '/register' || targetUrl.pathname === '/') {
          targetUrl.pathname = '/dashboard';
        }
      }
      
      // Only redirect if we're actually changing location
      if (targetUrl.toString() !== window.location.href) {
        window.location.href = targetUrl.toString();
      }
    }
  } catch (error) {
    console.error('Failed to redirect with tenant context:', error);
    // Fallback to dashboard without tenant parameter
    if (window.location.pathname !== '/dashboard') {
      window.location.href = '/dashboard';
    }
  }
}

/**
 * Check if user should be redirected to their tenant subdomain
 */
export function shouldRedirectToTenantSubdomain(): boolean {
  // Only redirect if:
  // 1. We're on the app domain
  // 2. User is authenticated (has token)
  // 3. We're on login/register pages (redirect after successful auth)
  
  if (!isAppDomain()) return false;
  
  if (typeof window === 'undefined') return false;
  
  // Check if user has a token
  const hasToken = localStorage.getItem('accessToken');
  if (!hasToken) return false;
  
  // Only redirect on auth pages (after successful login/register)
  const pathname = window.location.pathname;
  if (pathname === '/login' || pathname === '/register' || pathname === '/') {
    return true;
  }
  
  // Don't redirect if already on other pages - they can work without tenant context
  return false;
}

/**
 * Get the proper tenant URL for a given subdomain
 */
export function getTenantUrl(subdomain: string, path: string = '/'): string {
  if (typeof window === 'undefined') return path;
  
  const currentHost = window.location.hostname;
  let tenantHost: string;
  
  if (currentHost.includes('localhost')) {
    const port = window.location.port ? `:${window.location.port}` : '';
    tenantHost = `${subdomain}.localhost${port}`;
  } else {
    // For production, replace the current host with the tenant subdomain
    if (currentHost.startsWith('app.')) {
      tenantHost = currentHost.replace('app.', `${subdomain}.`);
    } else {
      // If already on a subdomain, replace it
      const parts = currentHost.split('.');
      parts[0] = subdomain;
      tenantHost = parts.join('.');
    }
  }
  
  return `${window.location.protocol}//${tenantHost}${path}`;
}

/**
 * Redirect to app domain for login/register
 */
export function redirectToAppDomain(path: string = '/login'): void {
  if (typeof window === 'undefined') return;
  
  const currentHost = window.location.hostname;
  let appHost: string;
  
  if (currentHost.includes('localhost')) {
    const port = window.location.port ? `:${window.location.port}` : '';
    appHost = `app.localhost${port}`;
  } else {
    // Replace subdomain with 'app'
    const parts = currentHost.split('.');
    parts[0] = 'app';
    appHost = parts.join('.');
  }
  
  const appUrl = `${window.location.protocol}//${appHost}${path}`;
  window.location.href = appUrl;
}