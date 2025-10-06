'use client';

import { useEffect, ReactNode } from 'react';
import { shouldRedirectToTenantSubdomain, redirectToTenantSubdomain } from '@/lib/subdomain';

interface SubdomainRedirectProps {
  children: ReactNode;
}

/**
 * Component that handles automatic redirection to tenant subdomains
 * when users access the app domain with authentication
 */
export function SubdomainRedirect({ children }: SubdomainRedirectProps) {
  useEffect(() => {
    const handleSubdomainRedirect = async () => {
      if (shouldRedirectToTenantSubdomain()) {
        try {
          await redirectToTenantSubdomain();
        } catch (error) {
          console.warn('Failed to redirect to tenant subdomain:', error);
          // Continue rendering if redirect fails
        }
      }
    };

    // Small delay to ensure auth state is initialized
    const timer = setTimeout(handleSubdomainRedirect, 100);
    return () => clearTimeout(timer);
  }, []);

  return <>{children}</>;
}