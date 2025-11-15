// Deployment trigger for Cloudflare Pages
// This file change will trigger a new deployment with global admin security fixes

console.log('Triggering deployment with global admin security and tenant management fixes...');
console.log('Changes include:');
console.log('- GlobalAdminGuard component for secure admin access control');
console.log('- Enhanced admin authentication with JWT validation'); 
console.log('- Fixed tenant management API with proper data structure');
console.log('- Updated admin tenants page with defensive programming');
console.log('- Unauthorized access page for non-admin users');
console.log('- Fixed admin route protection and layout security');

// Deployment timestamp
console.log(`Deployment triggered at: ${new Date().toISOString()}`);

// Global admin security deployment - 15/11/2025 - Production fixes deployed