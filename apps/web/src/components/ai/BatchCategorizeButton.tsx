'use client';

import { useState } from 'react';
import { Button } from '../Button';
import { api } from '@/lib/api';
import type { BatchCategorizationResult } from '@finhome360/shared';

interface BatchCategorizeButtonProps {
  transactionIds?: string[];
  autoApply?: boolean;
  onSuccess?: (results: { processed: number; applied: number }) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function BatchCategorizeButton({
  transactionIds,
  autoApply = false,
  onSuccess,
  onError,
  className = '',
}: BatchCategorizeButtonProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ processed: number; total: number } | null>(null);

  const handleBatchCategorize = async () => {
    setLoading(true);
    setProgress(null);

    try {
      const response = await api.autoCategorizeTransactionsBatch({
        transactionIds,
        autoApply,
      });

      if (response.success && response.data) {
        const result = response.data as BatchCategorizationResult;
        const { processed, applied } = result;
        setProgress({ processed, total: processed });
        onSuccess?.({ processed, applied });
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to batch categorize');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`inline-flex flex-col gap-2 ${className}`}>
      <Button
        variant="primary"
        onClick={handleBatchCategorize}
        disabled={loading}
        className="inline-flex items-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
            Processing...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {autoApply ? 'Auto-Categorize All' : 'Get Suggestions for All'}
          </>
        )}
      </Button>

      {progress && (
        <div className="text-xs text-gray-600 text-center">
          Processed {progress.processed} transaction{progress.processed !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
