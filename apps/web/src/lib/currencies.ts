/**
 * Currency utilities for multi-currency support
 */

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  decimals: number;
}

export const CURRENCIES: Currency[] = [
  // Major Currencies
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸', decimals: 2 },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', decimals: 2 },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧', decimals: 2 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵', decimals: 0 },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭', decimals: 2 },

  // Americas
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦', decimals: 2 },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'Mex$', flag: '🇲🇽', decimals: 2 },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷', decimals: 2 },
  { code: 'ARS', name: 'Argentine Peso', symbol: 'AR$', flag: '🇦🇷', decimals: 2 },

  // Asia Pacific
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳', decimals: 2 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳', decimals: 2 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺', decimals: 2 },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', flag: '🇳🇿', decimals: 2 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬', decimals: 2 },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰', decimals: 2 },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', flag: '🇰🇷', decimals: 0 },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', flag: '🇹🇭', decimals: 2 },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾', decimals: 2 },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', flag: '🇵🇭', decimals: 2 },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', flag: '🇮🇩', decimals: 0 },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', flag: '🇻🇳', decimals: 0 },

  // Europe
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', flag: '🇸🇪', decimals: 2 },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', flag: '🇳🇴', decimals: 2 },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', flag: '🇩🇰', decimals: 2 },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', flag: '🇵🇱', decimals: 2 },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', flag: '🇨🇿', decimals: 2 },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', flag: '🇭🇺', decimals: 0 },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei', flag: '🇷🇴', decimals: 2 },
  { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв', flag: '🇧🇬', decimals: 2 },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', flag: '🇹🇷', decimals: 2 },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', flag: '🇷🇺', decimals: 2 },

  // Middle East & Africa
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪', decimals: 2 },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', flag: '🇸🇦', decimals: 2 },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪', flag: '🇮🇱', decimals: 2 },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦', decimals: 2 },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£', flag: '🇪🇬', decimals: 2 },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬', decimals: 2 },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', flag: '🇰🇪', decimals: 2 },
];

export function getCurrency(code: string): Currency | undefined {
  return CURRENCIES.find(c => c.code === code);
}

export function getCurrencySymbol(code: string): string {
  return getCurrency(code)?.symbol || code;
}

export function formatAmount(amount: number, currencyCode: string, options?: {
  showSymbol?: boolean;
  showCode?: boolean;
  compact?: boolean;
}): string {
  const currency = getCurrency(currencyCode);
  const decimals = currency?.decimals ?? 2;
  const symbol = currency?.symbol ?? currencyCode;

  const {
    showSymbol = true,
    showCode = false,
    compact = false
  } = options || {};

  let formattedAmount: string;

  if (compact && Math.abs(amount) >= 1000) {
    // Compact notation for large numbers
    if (Math.abs(amount) >= 1000000) {
      formattedAmount = (amount / 1000000).toFixed(1) + 'M';
    } else {
      formattedAmount = (amount / 1000).toFixed(1) + 'K';
    }
  } else {
    // Standard formatting
    formattedAmount = amount.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  if (showSymbol && showCode) {
    return `${symbol}${formattedAmount} ${currencyCode}`;
  } else if (showSymbol) {
    return `${symbol}${formattedAmount}`;
  } else if (showCode) {
    return `${formattedAmount} ${currencyCode}`;
  } else {
    return formattedAmount;
  }
}

/**
 * Group currencies by region for better UX
 */
export const CURRENCY_REGIONS = {
  'Popular': ['USD', 'EUR', 'GBP', 'JPY', 'CHF'],
  'Americas': ['USD', 'CAD', 'MXN', 'BRL', 'ARS'],
  'Asia Pacific': ['CNY', 'INR', 'JPY', 'AUD', 'NZD', 'SGD', 'HKD', 'KRW', 'THB', 'MYR', 'PHP', 'IDR', 'VND'],
  'Europe': ['EUR', 'GBP', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'TRY', 'RUB'],
  'Middle East & Africa': ['AED', 'SAR', 'ILS', 'ZAR', 'EGP', 'NGN', 'KES'],
};

export function getCurrenciesByRegion(region: keyof typeof CURRENCY_REGIONS): Currency[] {
  const codes = CURRENCY_REGIONS[region];
  return codes.map(code => getCurrency(code)!).filter(Boolean);
}
