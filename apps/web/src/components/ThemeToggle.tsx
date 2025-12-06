'use client';

import { useTheme, Theme } from '@/contexts/ThemeContext';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';

interface ThemeToggleProps {
  variant?: 'icon' | 'dropdown' | 'radio';
  className?: string;
}

export function ThemeToggle({ variant = 'icon', className = '' }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  if (variant === 'icon') {
    return (
      <button
        onClick={toggleTheme}
        className={`p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${className}`}
        aria-label={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
      >
        {resolvedTheme === 'light' ? (
          <MoonIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        ) : (
          <SunIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        )}
      </button>
    );
  }

  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`}>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as Theme)}
          className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 pr-8 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          {theme === 'light' && <SunIcon className="w-4 h-4 text-gray-500" />}
          {theme === 'dark' && <MoonIcon className="w-4 h-4 text-gray-500" />}
          {theme === 'system' && <ComputerDesktopIcon className="w-4 h-4 text-gray-500" />}
        </div>
      </div>
    );
  }

  // Radio variant for settings page
  return (
    <div className={`space-y-3 ${className}`}>
      <ThemeOption
        value="light"
        label="Light"
        description="Always use light mode"
        icon={<SunIcon className="w-5 h-5" />}
        selected={theme === 'light'}
        onSelect={() => setTheme('light')}
      />
      <ThemeOption
        value="dark"
        label="Dark"
        description="Always use dark mode"
        icon={<MoonIcon className="w-5 h-5" />}
        selected={theme === 'dark'}
        onSelect={() => setTheme('dark')}
      />
      <ThemeOption
        value="system"
        label="System"
        description="Follow system preferences"
        icon={<ComputerDesktopIcon className="w-5 h-5" />}
        selected={theme === 'system'}
        onSelect={() => setTheme('system')}
      />
    </div>
  );
}

interface ThemeOptionProps {
  value: Theme;
  label: string;
  description: string;
  icon: React.ReactNode;
  selected: boolean;
  onSelect: () => void;
}

function ThemeOption({ label, description, icon, selected, onSelect }: ThemeOptionProps) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
        selected
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <div
        className={`p-2 rounded-lg ${
          selected
            ? 'bg-primary-100 text-primary-600 dark:bg-primary-800 dark:text-primary-400'
            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
        }`}
      >
        {icon}
      </div>
      <div className="flex-1 text-left">
        <p className={`font-medium ${selected ? 'text-primary-900 dark:text-primary-100' : 'text-gray-900 dark:text-gray-100'}`}>
          {label}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
          selected
            ? 'border-primary-500 bg-primary-500'
            : 'border-gray-300 dark:border-gray-600'
        }`}
      >
        {selected && (
          <div className="w-2 h-2 rounded-full bg-white" />
        )}
      </div>
    </button>
  );
}
