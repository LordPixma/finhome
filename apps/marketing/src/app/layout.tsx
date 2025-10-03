import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Finhome360 - Your 360° View of Financial Freedom',
  description: 'Take control of your finances with detailed analytics, deep insights, and powerful tools to help you save, invest, and achieve your financial goals.',
  keywords: 'personal finance, budgeting, financial analytics, savings, investments, money management',
  openGraph: {
    title: 'Finhome360 - Your 360° View of Financial Freedom',
    description: 'Take control of your finances with detailed analytics and powerful insights.',
    type: 'website',
    url: 'https://finhome360.com',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
