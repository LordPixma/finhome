'use client';

import { useEffect, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

interface DashboardTourProps {
  run: boolean;
  onFinish: () => void;
}

const tourSteps: Step[] = [
  {
    target: 'body',
    content: 'Welcome to Finhome360! Let\'s take a quick tour to help you get started with managing your finances.',
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tour="monthly-summary"]',
    content: 'View your income, expenses, and net savings. Switch between last 30 days or all-time view.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="accounts-section"]',
    content: 'This is your accounts overview. You can see all your financial accounts, their balances, and manage them here.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="add-account-btn"]',
    content: 'Click here to add a new manual account or connect to your bank using TrueLayer integration.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="sync-all-btn"]',
    content: 'Use this button to sync all your connected bank accounts and import new transactions automatically.',
    placement: 'left',
  },
  {
    target: '[data-tour="add-transaction-btn"]',
    content: 'Add manual transactions here for cash purchases or transactions not synced from your bank.',
    placement: 'left',
  },
  {
    target: '[data-tour="spending-insights"]',
    content: 'Get AI-powered spending insights and analysis. The AI analyzes your spending patterns and provides recommendations.',
    placement: 'top',
  },
  {
    target: '[data-tour="recent-transactions"]',
    content: 'Your recent transactions appear here. All imported transactions are automatically categorized using AI.',
    placement: 'top',
  },
  {
    target: 'body',
    content: 'That\'s it! You can restart this tour anytime from your settings page. Happy budgeting!',
    placement: 'center',
  },
];

export function DashboardTour({ run, onFinish }: DashboardTourProps) {
  const [stepIndex, setStepIndex] = useState(0);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, index } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setStepIndex(0);
      onFinish();
    } else if (index !== stepIndex) {
      setStepIndex(index);
    }
  };

  return (
    <Joyride
      steps={tourSteps}
      run={run}
      continuous
      showProgress
      showSkipButton
      stepIndex={stepIndex}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#3b82f6',
          textColor: '#1f2937',
          backgroundColor: '#ffffff',
          overlayColor: 'rgba(0, 0, 0, 0.4)',
          arrowColor: '#ffffff',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 8,
          fontSize: 14,
        },
        buttonNext: {
          backgroundColor: '#3b82f6',
          borderRadius: 6,
          fontSize: 14,
          padding: '8px 16px',
        },
        buttonBack: {
          color: '#6b7280',
          marginRight: 8,
        },
        buttonSkip: {
          color: '#6b7280',
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip Tour',
      }}
    />
  );
}
