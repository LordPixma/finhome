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
    // 1-based indices of capturing groups in rowPattern
    date: number;
    description: number;
    debit?: number;
    credit?: number;
    amount?: number;
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
    // 1: date, 2: description, 3: debit (optional), 4: credit (optional), 5: balance (optional)
    rowPattern: /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(-?[£\d,]+\.\d{2})?\s+(-?[£\d,]+\.\d{2})?\s*(-?[£\d,]+\.\d{2})?$/,
    dateFormat: 'dd/MM/yyyy',
    amountStyle: 'debitCredit',
    groups: {
      date: 1,
      description: 2,
      debit: 3,
      credit: 4,
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
    // 1: date, 2: description, 3: amount
    rowPattern: /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([-+]?\$?[\d,]+\.\d{2})$/, 
    dateFormat: 'MM/dd/yyyy',
    amountStyle: 'signed',
    groups: {
      date: 1,
      description: 2,
      amount: 3,
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
