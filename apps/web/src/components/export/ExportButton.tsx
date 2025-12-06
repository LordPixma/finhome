'use client';

import { useState } from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { ExportModal, ExportDataType } from './ExportModal';

interface ExportButtonProps {
  dataType: ExportDataType;
  title?: string;
  variant?: 'primary' | 'secondary' | 'icon';
  className?: string;
}

export function ExportButton({ dataType, title, variant = 'secondary', className = '' }: ExportButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getButtonLabel = () => {
    switch (dataType) {
      case 'transactions':
        return 'Export Transactions';
      case 'budgets':
        return 'Export Budgets';
      case 'goals':
        return 'Export Goals';
      case 'analytics':
        return 'Export Analytics';
      case 'all':
        return 'Export All Data';
      default:
        return 'Export';
    }
  };

  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className={`p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors ${className}`}
          title={title || getButtonLabel()}
        >
          <ArrowDownTrayIcon className="w-5 h-5" />
        </button>
        <ExportModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          dataType={dataType}
          title={title}
        />
      </>
    );
  }

  const baseStyles = variant === 'primary'
    ? 'bg-primary-600 text-white hover:bg-primary-700'
    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50';

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${baseStyles} ${className}`}
      >
        <ArrowDownTrayIcon className="w-4 h-4" />
        {title || getButtonLabel()}
      </button>
      <ExportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        dataType={dataType}
        title={title}
      />
    </>
  );
}
