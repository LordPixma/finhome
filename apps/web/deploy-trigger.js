// Deployment trigger for Cloudflare Pages
// This file change will trigger a new deployment with the updated subdomain system

console.log('Triggering deployment with hybrid subdomain system...');
console.log('Changes include:');
console.log('- TenantIndicator component for tenant context display');
console.log('- Enhanced subdomain utilities with URL parameter fallback'); 
console.log('- SubdomainRedirect component for proper routing');
console.log('- Updated DashboardLayout with tenant context');
console.log('- API integration for tenant info retrieval');

// Deployment timestamp
console.log(`Deployment triggered at: ${new Date().toISOString()}`);