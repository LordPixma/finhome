export type PdfDateFormat = 'dd/MM/yyyy' | 'MM/dd/yyyy' | 'yyyy-MM-dd';

export interface BankPdfTemplate {
  id: string;
  displayName: string;
  description?: string;
  detectKeywords: string[];
  rowPattern: RegExp;
  dateFormat: PdfDateFormat;
  amountStyle: 'debitCredit' | 'signed';
  groups: {
    date: string;
    description: string;
    debit?: string;
    credit?: string;
    amount?: string;
  };
  currencySymbol?: string;
  multiLineDescriptions?: boolean;
  skipLineIncludes?: string[];
  notes?: string;
}

export const BANK_PDF_TEMPLATES: BankPdfTemplate[] = [
  {
    id: 'uk-generic',
    displayName: 'UK Generic Statement',
    description: 'Date, description, debit, credit columns',
    detectKeywords: ['Sort Code', 'Account Number', 'Balance Brought Forward'],
    rowPattern: /^(?<date>\d{2}\/\d{2}\/\d{4})\s+(?<description>.+?)\s+(?<debit>-?[£\d,]+\.\d{2})?\s+(?<credit>-?[£\d,]+\.\d{2})?\s*(?<balance>-?[£\d,]+\.\d{2})?$/,
    dateFormat: 'dd/MM/yyyy',
    amountStyle: 'debitCredit',
    groups: {
      date: 'date',
      description: 'description',
      debit: 'debit',
      credit: 'credit',
    },
    currencySymbol: '£',
    multiLineDescriptions: true,
    skipLineIncludes: ['Date', 'Description', 'Money Out', 'Money In', 'Balance'],
    notes: 'Matches most UK retail bank statements with debit/credit columns.',
  },
  {
    id: 'us-generic',
    displayName: 'US Generic Statement',
    description: 'Date, description, amount (signed) columns',
    detectKeywords: ['Beginning Balance', 'Ending Balance', 'Deposits and Credits'],
    rowPattern: /^(?<date>\d{2}\/\d{2}\/\d{4})\s+(?<description>.+?)\s+(?<amount>[-+]?\$?[\d,]+\.\d{2})$/, 
    dateFormat: 'MM/dd/yyyy',
    amountStyle: 'signed',
    groups: {
      date: 'date',
      description: 'description',
      amount: 'amount',
    },
    currencySymbol: '$',
    multiLineDescriptions: true,
    skipLineIncludes: ['Date', 'Description', 'Amount', 'Deposits and Credits'],
    notes: 'Matches many US statements where credits are positive and debits negative.',
  },
];

export function detectPdfTemplate(text: string, templateId?: string): BankPdfTemplate | undefined {
  if (templateId) {
    return BANK_PDF_TEMPLATES.find(t => t.id === templateId);
  }
  const haystack = text.toLowerCase();
  return BANK_PDF_TEMPLATES.find(template =>
    template.detectKeywords.every(keyword => haystack.includes(keyword.toLowerCase()))
  );
}
