/**
 * Custom hook to fetch and manage user settings
 */
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface UserSettings {
  currency: string;
  currencySymbol: string;
  language: string;
  timezone: string;
  dateFormat: string;
}

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await api.getSettings() as any;
      
      if (response.success && response.data) {
        setSettings({
          currency: response.data.currency || 'GBP',
          currencySymbol: response.data.currencySymbol || '£',
          language: response.data.language || 'en',
          timezone: response.data.timezone || 'Europe/London',
          dateFormat: response.data.dateFormat || 'DD/MM/YYYY',
        });
      } else {
        throw new Error('Failed to load user settings');
      }
    } catch (err) {
      console.error('Failed to load user settings:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      // Set default settings as fallback
      setSettings({
        currency: 'GBP',
        currencySymbol: '£',
        language: 'en',
        timezone: 'Europe/London',
        dateFormat: 'DD/MM/YYYY',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    try {
      const response = await api.updateSettings(newSettings) as any;
      
      if (response.success && response.data) {
        setSettings({
          currency: response.data.currency || 'GBP',
          currencySymbol: response.data.currencySymbol || '£',
          language: response.data.language || 'en',
          timezone: response.data.timezone || 'Europe/London',
          dateFormat: response.data.dateFormat || 'DD/MM/YYYY',
        });
        return true;
      } else {
        throw new Error('Failed to update user settings');
      }
    } catch (err) {
      console.error('Failed to update user settings:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    reload: loadSettings,
  };
}

/**
 * Helper function to format currency using user settings
 */
export function formatCurrencyWithSettings(
  amount: number,
  settings: UserSettings | null
): string {
  if (settings?.currencySymbol) {
    return `${settings.currencySymbol}${Math.abs(amount).toFixed(2)}`;
  }
  
  const currency = settings?.currency || 'GBP';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  }).format(amount);
}