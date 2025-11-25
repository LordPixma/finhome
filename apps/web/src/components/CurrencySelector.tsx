'use client';

import { useState } from 'react';
import { CURRENCIES, CURRENCY_REGIONS, getCurrenciesByRegion, type Currency } from '@/lib/currencies';
import { MagnifyingGlassIcon, CheckIcon } from '@heroicons/react/24/outline';

interface CurrencySelectorProps {
  value: string;
  onChange: (currency: Currency) => void;
  showLabel?: boolean;
}

export function CurrencySelector({ value, onChange, showLabel = true }: CurrencySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<keyof typeof CURRENCY_REGIONS>('Popular');

  const selectedCurrency = CURRENCIES.find(c => c.code === value) || CURRENCIES[0];

  // Filter currencies by search query
  const filteredCurrencies = selectedRegion
    ? getCurrenciesByRegion(selectedRegion).filter(currency =>
        currency.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        currency.code.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : CURRENCIES.filter(currency =>
        currency.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        currency.code.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const handleSelect = (currency: Currency) => {
    onChange(currency);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative">
      {showLabel && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Currency
        </label>
      )}

      {/* Selected Currency Display */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded-lg hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{selectedCurrency.flag}</span>
          <div className="text-left">
            <div className="font-semibold text-gray-900">
              {selectedCurrency.code} - {selectedCurrency.symbol}
            </div>
            <div className="text-xs text-gray-500">{selectedCurrency.name}</div>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Content */}
          <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-2xl max-h-[500px] overflow-hidden">
            {/* Search */}
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search currencies..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Region Tabs */}
            <div className="flex overflow-x-auto border-b border-gray-200 bg-gray-50">
              {(Object.keys(CURRENCY_REGIONS) as Array<keyof typeof CURRENCY_REGIONS>).map((region) => (
                <button
                  key={region}
                  type="button"
                  onClick={() => setSelectedRegion(region)}
                  className={`flex-shrink-0 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    selectedRegion === region
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {region}
                </button>
              ))}
            </div>

            {/* Currency List */}
            <div className="max-h-[320px] overflow-y-auto">
              {filteredCurrencies.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No currencies found matching "{searchQuery}"
                </div>
              ) : (
                filteredCurrencies.map((currency) => (
                  <button
                    key={currency.code}
                    type="button"
                    onClick={() => handleSelect(currency)}
                    className={`w-full flex items-center justify-between px-4 py-3 hover:bg-blue-50 transition-colors ${
                      currency.code === value ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{currency.flag}</span>
                      <div className="text-left">
                        <div className="font-medium text-gray-900">
                          {currency.code} - {currency.symbol}
                        </div>
                        <div className="text-xs text-gray-500">{currency.name}</div>
                      </div>
                    </div>
                    {currency.code === value && (
                      <CheckIcon className="w-5 h-5 text-blue-600" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
