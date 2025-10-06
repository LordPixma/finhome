import { api } from './api';

/**
 * Utility functions for handling tenant subdomains
 */

/**
 * Get the current subdomain from hostname or URL parameter
 */
export function getCurrentSubdomain(): string | null {
  if (typeof window === 'undefined') return null;
  
  // First check URL parameter (fallback method)
  const urlParams = new URLSearchParams(window.location.search);
  const tenantParam = urlParams.get('tenant');
  if (tenantParam) {
    return tenantParam;
  }
  
  // Then check hostname subdomain
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  
  // For localhost development
  if (hostname.includes('localhost')) {
    if (parts.length === 2 && parts[1] === 'localhost') {
      return parts[0]; // e.g., "demo.localhost" -> "demo"
    }
    return null;
  }
  
  // For production (finhome360.com)
  if (parts.length >= 3) {
    const subdomain = parts[0];
    // Skip system subdomains
    if (['www', 'app', 'api', 'admin'].includes(subdomain)) {
      return null;
    }
    return subdomain;
  }
  
  return null;
}

/**
 * Check if current domain is the app domain (app.finhome360.com)
 */
export function isAppDomain(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.startsWith('app.');
}

/**
 * Redirect to dashboard with tenant context (using URL parameter for now)
 */
export async function redirectToTenantSubdomain(): Promise<void> {
  if (typeof window === 'undefined') return;
  
  try {
    // Get user's tenant information
    const response = await api.getTenantInfo() as any;
    if (response.success && response.data) {
      const { subdomain } = response.data;
      
      // For now, use URL parameter approach until wildcard DNS is configured
      // Later this can be updated to use actual subdomains
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('tenant', subdomain);
      
      // Redirect to dashboard if coming from login/register
      if (currentUrl.pathname === '/login' || currentUrl.pathname === '/register' || currentUrl.pathname === '/') {
        currentUrl.pathname = '/dashboard';
      }
      
      window.location.href = currentUrl.toString();
    }
  } catch (error) {
    console.error('Failed to redirect with tenant context:', error);
    // Fallback to dashboard without tenant parameter
    window.location.href = '/dashboard';
  }
}

/**
 * Check if user should be redirected to their tenant subdomain
 */
export function shouldRedirectToTenantSubdomain(): boolean {
  // Only redirect if:
  // 1. We're on the app domain
  // 2. User is authenticated (has token)
  // 3. We're not on login/register pages
  
  if (!isAppDomain()) return false;
  
  if (typeof window === 'undefined') return false;
  
  // Check if user has a token
  const hasToken = localStorage.getItem('accessToken');
  if (!hasToken) return false;
  
  // Don't redirect on auth pages
  const pathname = window.location.pathname;
  if (pathname === '/login' || pathname === '/register' || pathname === '/') {
    return false;
  }
  
  return true;
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