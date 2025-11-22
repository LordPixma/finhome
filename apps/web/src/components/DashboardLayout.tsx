'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import Footer from './Footer';
import TextLogo from './TextLogo';
import {
  HomeIcon,
  BanknotesIcon,
  CreditCardIcon,
  ArrowPathIcon,
  ChartBarIcon,
  TrophyIcon,
  TagIcon,
  BellIcon,
  ChartPieIcon,
  SparklesIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Accounts & Banking', href: '/dashboard/accounts', icon: BanknotesIcon },
    { name: 'Transactions', href: '/dashboard/transactions', icon: CreditCardIcon },
    { name: 'Recurring', href: '/dashboard/recurring', icon: ArrowPathIcon },
    { name: 'Budgets', href: '/dashboard/budgets', icon: ChartBarIcon },
    { name: 'Goals', href: '/dashboard/goals', icon: TrophyIcon },
    { name: 'Categories', href: '/dashboard/categories', icon: TagIcon },
    { name: 'Bill Reminders', href: '/dashboard/bill-reminders', icon: BellIcon },
    { name: 'Analytics', href: '/dashboard/analytics', icon: ChartPieIcon },
    { name: 'AI Features', href: '/dashboard/ai', icon: SparklesIcon },
    { name: 'Import', href: '/dashboard/import', icon: ArrowDownTrayIcon },
    { name: 'Logs', href: '/dashboard/logs', icon: DocumentTextIcon },
    { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <div className="min-h-screen bg-surface-100">
      {/* Professional Header for Mobile */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white shadow-header">
        <div className="flex items-center justify-between px-4 py-4 h-18">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>
            <TextLogo size="sm" variant="dark" />
          </div>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center font-semibold text-sm">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
          </button>
        </div>
      </div>

      {/* Professional Sidebar - Desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:z-50">
        <div className="flex flex-col flex-grow bg-white shadow-sidebar overflow-y-auto">
          {/* Logo Section */}
          <div className="flex items-center flex-shrink-0 px-6 py-6 border-b border-gray-200">
            <TextLogo size="lg" variant="dark" />
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 space-y-1">
            {navigation.map((item) => {
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`nav-item group ${
                    isActive(item.href) ? 'nav-item-active' : ''
                  }`}
                >
                  <IconComponent className="w-5 h-5 mr-3 flex-shrink-0" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Professional User Section */}
          <div className="flex-shrink-0 p-4 border-t border-gray-200">
            <div className="bg-surface-200 rounded-xl p-4">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center font-semibold">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-error-700 bg-white border border-error-200 rounded-lg hover:bg-error-50 transition-all duration-200"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Professional Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-gray-900 bg-opacity-50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-white shadow-xl animate-slide-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
                <TextLogo size="sm" variant="dark" />
                <button 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {navigation.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`nav-item ${
                        isActive(item.href) ? 'nav-item-active' : ''
                      }`}
                    >
                      <IconComponent className="w-5 h-5 mr-3" />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* User section */}
              <div className="p-4 border-t border-gray-200">
                <div className="bg-surface-200 rounded-xl p-4">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center font-semibold">
                      {user?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-error-700 bg-white border border-error-200 rounded-lg hover:bg-error-50 transition-all duration-200"
                  >
                    <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Professional Mobile User Menu */}
      {isUserMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-30" onClick={() => setIsUserMenuOpen(false)}>
          <div className="absolute top-20 right-4 bg-white rounded-xl shadow-card-hover border border-gray-200 p-3 min-w-[220px] animate-scale-in">
            <div className="px-3 py-3 border-b border-gray-200 mb-2">
              <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center px-3 py-2 text-sm text-error-700 hover:bg-error-50 rounded-lg transition-colors"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      )}

      {/* Professional Main Content Container */}
      <div className="lg:pl-64 flex flex-col min-h-screen pb-18 lg:pb-0">
        <main className="flex-1 pt-18 lg:pt-0">
          <div className="max-w-7xl mx-auto py-8 px-6 lg:px-8 animate-fade-in">
            {children}
          </div>
        </main>
        <Footer />
      </div>

      {/* Professional Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white shadow-bottom-nav border-t border-gray-200">
        <div className="grid grid-cols-5 h-18">
          {navigation.slice(0, 5).map((item) => {
            const IconComponent = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center py-2 px-1 transition-all duration-200 ${
                  isActive(item.href)
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                }`}
              >
                <IconComponent className="w-6 h-6 mb-1" />
                <span className="text-xs font-medium truncate">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
