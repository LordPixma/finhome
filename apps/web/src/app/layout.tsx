import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { SubdomainRedirect } from '@/components/SubdomainRedirect';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Finhome360 - Family Financial Management',
  description: 'A multi-tenant SaaS for family budgeting and financial management',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
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
