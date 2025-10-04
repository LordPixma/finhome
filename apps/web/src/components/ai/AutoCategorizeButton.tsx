'use client';

import { useState } from 'react';
import { Button } from '../Button';
import { api } from '@/lib/api';
import type { CategorizationResult } from '@finhome360/shared';

interface AutoCategorizeButtonProps {
  transactionId: string;
  onSuccess?: (categoryId: string, categoryName: string) => void;
  onError?: (error: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function AutoCategorizeButton({
  transactionId,
  onSuccess,
  onError,
  className = '',
  size = 'sm',
}: AutoCategorizeButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleAutoCategorize = async () => {
    setLoading(true);
    try {
      const response = await api.autoCategorizeTransaction(transactionId);
      
      if (response.success && response.data) {
        const result = response.data as CategorizationResult;
        const { applied, categoryId, categoryName, reasoning } = result;
        
        if (applied && categoryId && categoryName) {
          onSuccess?.(categoryId, categoryName);
        } else {
          onError?.(reasoning || 'Could not auto-categorize this transaction');
        }
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to categorize transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size={size}
      onClick={handleAutoCategorize}
      disabled={loading}
      className={`inline-flex items-center gap-2 ${className}`}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Categorizing...
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          Auto-Categorize
        </>
      )}
    </Button>
  );
}
