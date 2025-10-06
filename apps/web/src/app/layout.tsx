import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { SubdomainRedirect } from '@/components/SubdomainRedirect';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Finhome360 - Family Financial Management',
  description: 'A multi-tenant SaaS for family budgeting and financial management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <SubdomainRedirect>
            {children}
          </SubdomainRedirect>
        </AuthProvider>
      </body>
    </html>
  );
}
