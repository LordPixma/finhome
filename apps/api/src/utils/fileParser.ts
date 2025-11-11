import { detectPdfTemplate, type BankPdfTemplate } from '@finhome360/shared';
import { getDocument } from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';

// CSV Parser utility
export interface CSVParseResult {
  headers: string[];
  rows: Record<string, string>[];
}

/**
 * Parse CSV line handling quoted fields properly
 * Handles fields with commas inside quotes, e.g.: "Field 1","Field,2","Field 3"
 */
function parseCSVLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      // Handle escaped quotes ("")
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Push the last field
  result.push(current.trim());
  
  return result;
}

export function parseCSV(csvContent: string): CSVParseResult {
  const lines = csvContent.trim().split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    throw new Error('Empty CSV file');
  }

  // Detect delimiter (comma or semicolon)
  const firstLine = lines[0];
  const delimiter = firstLine.includes(';') && !firstLine.includes(',') ? ';' : ',';
  
  // Parse headers
  const headers = parseCSVLine(lines[0], delimiter);
  const rows: Record<string, string>[] = [];

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue; // Skip empty lines
    
    const values = parseCSVLine(lines[i], delimiter);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    rows.push(row);
  }

  return { headers, rows };
}

// Transaction mapping for common CSV formats
export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  notes?: string;
  category?: string;
}

/**
 * Smart field detection - finds the best matching column for each field type
 */
function detectFields(headers: string[]): {
  date: string | null;
  description: string | null;
  amount: string | null;
  moneyIn: string | null;
  moneyOut: string | null;
  type: string | null;
  category: string | null;
  notes: string | null;
} {
  const headerLower = headers.map(h => h.toLowerCase());
  
  // Date field detection
  const datePatterns = ['date', 'transaction date', 'posted date', 'value date', 'booking date'];
  const dateField = headers.find((_, i) => 
    datePatterns.some(p => headerLower[i].includes(p))
  ) || null;
  
  // Description field detection
  const descPatterns = ['description', 'name', 'memo', 'narrative', 'details', 'merchant'];
  const descriptionField = headers.find((_, i) => 
    descPatterns.some(p => headerLower[i].includes(p)) && 
    !headerLower[i].includes('category')
  ) || null;
  
  // Amount field detection
  const amountPatterns = ['amount', 'value', 'transaction amount'];
  const amountField = headers.find((_, i) => 
    amountPatterns.some(p => headerLower[i] === p || headerLower[i].includes(p)) &&
    !headerLower[i].includes('local')
  ) || null;
  
  // Money In/Out (Monzo and other banks)
  const moneyInField = headers.find((_, i) => 
    headerLower[i].includes('money in') || 
    headerLower[i] === 'credit' || 
    headerLower[i] === 'deposits'
  ) || null;
  
  const moneyOutField = headers.find((_, i) => 
    headerLower[i].includes('money out') || 
    headerLower[i] === 'debit' || 
    headerLower[i] === 'withdrawals'
  ) || null;
  
  // Type field
  const typeField = headers.find((_, i) => headerLower[i] === 'type') || null;
  
  // Category field
  const categoryField = headers.find((_, i) => headerLower[i] === 'category') || null;
  
  // Notes field
  const notesField = headers.find((_, i) => 
    headerLower[i].includes('notes') || 
    headerLower[i].includes('tags') ||
    headerLower[i] === 'memo'
  ) || null;
  
  return {
    date: dateField,
    description: descriptionField,
    amount: amountField,
    moneyIn: moneyInField,
    moneyOut: moneyOutField,
    type: typeField,
    category: categoryField,
    notes: notesField,
  };
}

/**
 * Parse date from various formats
 * Prioritizes DD/MM/YYYY (UK) format for slash-separated dates
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Try DD/MM/YYYY format first (UK banks like Monzo, Barclays, HSBC)
  const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, first, second, year] = slashMatch;
    // Assume DD/MM/YYYY for slash format (UK standard)
    const day = parseInt(first);
    const month = parseInt(second) - 1; // JS months are 0-indexed
    const yearNum = parseInt(year);
    
    // Validate it's a valid date
    const date = new Date(yearNum, month, day);
    if (!isNaN(date.getTime()) && 
        date.getFullYear() === yearNum &&
        date.getMonth() === month &&
        date.getDate() === day) {
      return date;
    }
  }
  
  // Try YYYY-MM-DD format (ISO standard)
  const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date;
  }
  
  // Try MM-DD-YYYY or MM/DD/YYYY with dash (less ambiguous US format)
  const dashMatch = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) {
    const [, month, day, year] = dashMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date;
  }
  
  // Last resort: try standard Date parsing (works for many formats)
  // But skip if it looks like DD/MM/YYYY to avoid misinterpretation
  if (!slashMatch) {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date;
  }
  
  return null;
}

/**
 * Parse amount from string, handling various formats
 */
function parseAmount(amountStr: string): number | null {
  if (!amountStr || amountStr.trim() === '') return null;
  
  // Remove common currency symbols, commas, and whitespace
  // Support more currencies: $ £ € ¥ ₹ ₽ ¢ ₦ ₨ ₪ ₩ ₡ ₴ ₵ ₲ ₭ ₱ ₿
  const cleaned = amountStr.replace(/[$£€¥₹₽¢₦₨₪₩₡₴₵₲₭₱₿,\s]/g, '').trim();
  
  // Handle parentheses for negative amounts
  if (cleaned.includes('(') && cleaned.includes(')')) {
    const num = parseFloat(cleaned.replace(/[()]/g, ''));
    return isNaN(num) ? null : -num;
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export function mapCSVToTransactions(
  rows: Record<string, string>[],
  mapping?: {
    date?: string;
    description?: string;
    amount?: string;
    type?: string;
  }
): ParsedTransaction[] {
  if (rows.length === 0) return [];
  
  // Get headers from first row
  const headers = Object.keys(rows[0]);
  
  // Detect fields automatically
  const fields = detectFields(headers);
  
  console.log('Detected fields:', fields);
  
  const transactions: ParsedTransaction[] = [];

  for (const row of rows) {
    try {
      // Extract date
      const dateField = mapping?.date || fields.date;
      if (!dateField) continue;
      
      const dateValue = row[dateField];
      const date = parseDate(dateValue);
      if (!date) {
        console.warn('Could not parse date:', dateValue);
        continue;
      }

      // Extract description
      const descField = mapping?.description || fields.description;
      const description = descField ? row[descField] : 'Unknown';

      // Extract amount - handle both single amount column and Money In/Out columns
      let amount: number | null = null;
      let type: 'income' | 'expense' = 'expense';
      
      // Check for Money In/Out columns (Monzo style)
      if (fields.moneyIn && fields.moneyOut) {
        const moneyIn = parseAmount(row[fields.moneyIn]);
        const moneyOut = parseAmount(row[fields.moneyOut]);
        
        if (moneyIn && moneyIn > 0) {
          amount = moneyIn;
          type = 'income';
        } else if (moneyOut && moneyOut !== 0) {
          amount = Math.abs(moneyOut);
          type = 'expense';
        }
      } else if (fields.amount || mapping?.amount) {
        // Single amount column
        const amountField = mapping?.amount || fields.amount;
        if (amountField) {
          const amountValue = parseAmount(row[amountField]);
          if (amountValue !== null) {
            type = amountValue < 0 ? 'expense' : 'income';
            amount = Math.abs(amountValue);
          }
        }
      }
      
      if (amount === null || amount === 0) continue;

      // Extract optional fields
      const notes = fields.notes ? row[fields.notes] : undefined;
      const category = fields.category ? row[fields.category] : undefined;

      transactions.push({
        date,
        description: description || 'Unknown Transaction',
        amount,
        type,
        notes,
        category,
      });
    } catch (error) {
      console.error('Error parsing row:', row, error);
      continue;
    }
  }

  console.log(`Successfully parsed ${transactions.length} transactions`);
  return transactions;
}

// OFX Parser utility
export interface OFXTransaction {
  type: string;
  date: Date;
  amount: number;
  fitId: string;
  name: string;
  memo: string;
}

export function parseOFX(ofxContent: string): OFXTransaction[] {
  const transactions: OFXTransaction[] = [];

  // Extract STMTTRN blocks
  const stmtTrnRegex = /<STMTTRN>(.*?)<\/STMTTRN>/gs;
  const matches = ofxContent.matchAll(stmtTrnRegex);

  const getTagValue = (block: string, tag: string): string => {
    const tagRegex = new RegExp(`<${tag}>([^<\n]+)`, 'i');
    const tagMatch = block.match(tagRegex);
    return tagMatch ? tagMatch[1].trim() : '';
  };

  for (const match of matches) {
    const block = match[1];

    try {
      const dateStr = getTagValue(block, 'DTPOSTED');
      const amountStr = getTagValue(block, 'TRNAMT');

      if (!dateStr || !amountStr) continue;

      // Parse OFX date format (YYYYMMDD or YYYYMMDDHHMMSS)
      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6)) - 1;
      const day = parseInt(dateStr.substring(6, 8));
      const date = new Date(year, month, day);

      const amount = Math.abs(parseFloat(amountStr));
      const type = getTagValue(block, 'TRNTYPE');

      transactions.push({
        type,
        date,
        amount,
        fitId: getTagValue(block, 'FITID'),
        name: getTagValue(block, 'NAME'),
        memo: getTagValue(block, 'MEMO'),
      });
    } catch (error) {
      console.error('Error parsing OFX transaction:', error);
      continue;
    }
  }

  return transactions;
}

export function mapOFXToTransactions(ofxTransactions: OFXTransaction[]): ParsedTransaction[] {
  return ofxTransactions.map(tx => ({
    date: tx.date,
    description: tx.name || tx.memo || 'Unknown',
    amount: tx.amount,
    type: tx.type === 'CREDIT' || tx.type === 'DEP' ? 'income' : 'expense',
    notes: tx.memo,
  }));
}

// JSON Parser for structured transaction data
export function parseJSON(jsonContent: string): ParsedTransaction[] {
  try {
    const data = JSON.parse(jsonContent);
    
    // Handle different JSON structures
    let transactions: any[] = [];
    
    if (Array.isArray(data)) {
      transactions = data;
    } else if (data.transactions && Array.isArray(data.transactions)) {
      transactions = data.transactions;
    } else if (data.data && Array.isArray(data.data)) {
      transactions = data.data;
    } else {
      throw new Error('Invalid JSON structure - expected array of transactions');
    }
    
    return transactions.map(tx => ({
      date: new Date(tx.date || tx.transactionDate || tx.posted_date),
      description: tx.description || tx.merchant || tx.name || tx.memo || 'Unknown',
      amount: Math.abs(parseFloat(tx.amount || tx.value || '0')),
      type: (tx.type === 'credit' || tx.amount > 0) ? 'income' : 'expense' as 'income' | 'expense',
      notes: tx.notes || tx.memo || tx.reference,
      category: tx.category || tx.categoryName,
    }));
  } catch (error) {
    throw new Error(`Invalid JSON file: ${error}`);
  }
}

// XML Parser for various bank formats
export function parseXML(xmlContent: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  // Simple XML parsing for transaction data
  // Look for common XML transaction patterns
  const transactionRegex = /<transaction[^>]*>(.*?)<\/transaction>/gis;
  const matches = xmlContent.matchAll(transactionRegex);
  
  const getXMLValue = (block: string, tag: string): string => {
    const tagRegex = new RegExp(`<${tag}[^>]*>([^<]+)<\/${tag}>`, 'i');
    const match = block.match(tagRegex);
    return match ? match[1].trim() : '';
  };
  
  for (const match of matches) {
    const block = match[1];
    
    try {
      const dateStr = getXMLValue(block, 'date') || getXMLValue(block, 'transactionDate');
      const amountStr = getXMLValue(block, 'amount') || getXMLValue(block, 'value');
      const description = getXMLValue(block, 'description') || getXMLValue(block, 'merchant') || getXMLValue(block, 'name');
      
      if (!dateStr || !amountStr) continue;
      
      const date = parseDate(dateStr);
      if (!date) continue;
      
      const amount = parseAmount(amountStr);
      if (amount === null) continue;
      
      const type = getXMLValue(block, 'type');
      const notes = getXMLValue(block, 'notes') || getXMLValue(block, 'memo');
      const category = getXMLValue(block, 'category');
      
      transactions.push({
        date,
        description: description || 'Unknown Transaction',
        amount: Math.abs(amount),
        type: (type === 'credit' || amount > 0) ? 'income' : 'expense',
        notes,
        category,
      });
    } catch (error) {
      console.error('Error parsing XML transaction:', error);
      continue;
    }
  }
  
  return transactions;
}

// PDF Parser (basic text extraction for bank statements)
export interface BankPdfParseOptions {
  templateId?: string;
}

export interface BankPdfParseResult {
  template?: BankPdfTemplate;
  transactions: ParsedTransaction[];
  unmatchedLines: string[];
  warnings: string[];
}

export async function parsePDF(
  pdfContent: ArrayBuffer,
  options: BankPdfParseOptions = {}
): Promise<ParsedTransaction[]> {
  const result = await parseBankPdf(pdfContent, options);

  if (result.warnings.length > 0) {
    console.warn('PDF parse warnings:', result.warnings);
  }

  if (result.unmatchedLines.length > 0) {
    console.debug('PDF unmatched lines sample:', result.unmatchedLines.slice(0, 10));
  }

  return result.transactions;
}

export async function parseBankPdf(
  pdfContent: ArrayBuffer,
  options: BankPdfParseOptions = {}
): Promise<BankPdfParseResult> {
  const text = await extractPdfText(pdfContent);
  const template = detectPdfTemplate(text, options.templateId);

  if (!template) {
    return {
      transactions: [],
      warnings: ['No matching PDF template detected'],
      unmatchedLines: text.split(/\r?\n/).map(sanitizeLine).filter(Boolean),
    };
  }

  const lines = text.split(/\r?\n/);
  const skipMatchers = (template.skipLineIncludes || []).map(value => value.toLowerCase());

  const unmatchedLines: string[] = [];
  const warnings: string[] = [];
  const transactions: ParsedTransaction[] = [];

  let currentTransaction: ParsedTransaction | null = null;

  const flushCurrent = () => {
    if (!currentTransaction) return;
    transactions.push(currentTransaction);
    currentTransaction = null;
  };

  for (const rawLine of lines) {
    const line = sanitizeLine(rawLine);
    if (!line) continue;

    if (skipMatchers.some(skip => line.toLowerCase().includes(skip))) {
      continue;
    }

    const match = template.rowPattern.exec(line);
    template.rowPattern.lastIndex = 0;

    if (match && match.groups) {
      flushCurrent();
      const parsed = buildTransactionFromMatch(template, match);

      if (!parsed) {
        warnings.push(`Unable to parse transaction from line: "${line}"`);
        continue;
      }

      currentTransaction = parsed;
      continue;
    }

    if (template.multiLineDescriptions && currentTransaction) {
      currentTransaction.description = `${currentTransaction.description} ${line}`.trim();
      continue;
    }

    unmatchedLines.push(line);
  }

  flushCurrent();

  return {
    template,
    transactions,
    unmatchedLines,
    warnings,
  };
}

// Parse a single text line against a bank PDF template
// Useful for unit tests and safer refactors around regex groups
export function parsePdfLine(
  template: BankPdfTemplate,
  line: string
): ParsedTransaction | null {
  const clean = sanitizeLine(line);
  if (!clean) return null;

  const match = template.rowPattern.exec(clean);
  template.rowPattern.lastIndex = 0;
  if (!match) return null;

  return buildTransactionFromMatch(template, match);
}

// Excel/XLS Parser (basic TSV/CSV-like parsing)
export function parseXLS(xlsContent: string): ParsedTransaction[] {
  // For basic XLS files exported as text, treat similar to CSV with tabs
  try {
    // Replace tabs with commas and parse as CSV
    const csvContent = xlsContent.replace(/\t/g, ',');
    const { rows } = parseCSV(csvContent);
    return mapCSVToTransactions(rows);
  } catch (error) {
    throw new Error(`Failed to parse XLS file: ${error}`);
  }
}

// MT940 Parser (SWIFT format used by many European banks)
export function parseMT940(mt940Content: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = mt940Content.split('\n');
  
  let currentTransaction: Partial<ParsedTransaction> = {};
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // :61: - Statement Line (main transaction info)
    if (trimmedLine.startsWith(':61:')) {
      // Parse MT940 statement line
      // Format: :61:YYMMDDMMDDxxx[amount][code][reference]
      const match = trimmedLine.match(/:61:(\d{6})(\d{4})?([CD])([\d,\.]+)([A-Z]{3})?(.+)/);
      if (match) {
        const [, dateStr, , debitCredit, amountStr, , reference] = match;
        
        // Parse date (YYMMDD)
        const year = 2000 + parseInt(dateStr.substring(0, 2));
        const month = parseInt(dateStr.substring(2, 4)) - 1;
        const day = parseInt(dateStr.substring(4, 6));
        
        const amount = parseFloat(amountStr.replace(',', '.'));
        
        currentTransaction = {
          date: new Date(year, month, day),
          amount: Math.abs(amount),
          type: debitCredit === 'C' ? 'income' : 'expense',
          description: reference?.trim() || 'MT940 Transaction',
        };
      }
    }
    
    // :86: - Additional information (description/memo)
    if (trimmedLine.startsWith(':86:') && currentTransaction.date) {
      const description = trimmedLine.substring(4).trim();
      currentTransaction.description = description || currentTransaction.description;
      
      // Complete the transaction
      if (currentTransaction.date && currentTransaction.amount !== undefined) {
        transactions.push(currentTransaction as ParsedTransaction);
        currentTransaction = {};
      }
    }
  }
  
  return transactions;
}

async function extractPdfText(pdfContent: ArrayBuffer): Promise<string> {
  const data = pdfContent instanceof Uint8Array ? pdfContent : new Uint8Array(pdfContent);
  const loadingTask = getDocument({ data, useWorker: false } as any);

  try {
    const pdf = await loadingTask.promise;
    const pages: string[] = [];

    for (let index = 1; index <= pdf.numPages; index++) {
      const page = await pdf.getPage(index);
      const textContent = await page.getTextContent();

      let pageText = '';
      for (const item of textContent.items) {
        const textItem = item as TextItem;
        if (!textItem?.str) continue;
        pageText += textItem.str;
        pageText += textItem.hasEOL ? '\n' : ' ';
      }

      pages.push(pageText);

      if (typeof page.cleanup === 'function') {
        page.cleanup();
      }
    }

    if (typeof pdf.cleanup === 'function') {
      pdf.cleanup();
    }

    return pages.join('\n');
  } finally {
    loadingTask.destroy();
  }
}

function buildTransactionFromMatch(
  template: BankPdfTemplate,
  match: RegExpMatchArray
): ParsedTransaction | null {
  const rawDate = match[template.groups.date];
  const rawDescription = match[template.groups.description] || '';

  const date = parseTemplateDate(rawDate, template.dateFormat);
  if (!date) return null;

  if (template.amountStyle === 'debitCredit') {
  const debitGroupKey = template.groups.debit;
  const creditGroupKey = template.groups.credit;

  const debitValue = debitGroupKey ? parseCurrency(match[debitGroupKey]) : null;
  const creditValue = creditGroupKey ? parseCurrency(match[creditGroupKey]) : null;

    if (creditValue && creditValue > 0) {
      return {
        date,
        description: rawDescription.trim(),
        amount: Math.abs(creditValue),
        type: 'income',
      };
    }

    if (debitValue && debitValue > 0) {
      return {
        date,
        description: rawDescription.trim(),
        amount: Math.abs(debitValue),
        type: 'expense',
      };
    }

    return null;
  }

  const amountGroupKey = template.groups.amount;
  const amountValue = amountGroupKey ? parseCurrency(match[amountGroupKey]) : null;

  if (amountValue === null || amountValue === 0) {
    return null;
  }

  return {
    date,
    description: rawDescription.trim(),
    amount: Math.abs(amountValue),
    type: amountValue >= 0 ? 'income' : 'expense',
  };
}

function parseTemplateDate(
  value: string | undefined,
  format: BankPdfTemplate['dateFormat']
): Date | null {
  if (!value) return null;
  const trimmed = value.trim();

  let day: number;
  let month: number;
  let year: number;

  if (format === 'dd/MM/yyyy') {
    const parts = trimmed.split(/[\/]/);
    if (parts.length !== 3) return null;
    [day, month, year] = parts.map(part => parseInt(part, 10));
  } else if (format === 'MM/dd/yyyy') {
    const parts = trimmed.split(/[\/]/);
    if (parts.length !== 3) return null;
    [month, day, year] = parts.map(part => parseInt(part, 10));
  } else {
    const parts = trimmed.split(/[-]/);
    if (parts.length !== 3) return null;
    [year, month, day] = parts.map(part => parseInt(part, 10));
  }

  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return null;
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
    return null;
  }

  return parsed;
}

function parseCurrency(rawValue: string | undefined): number | null {
  if (!rawValue) return null;

  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  const negativeViaParens = trimmed.includes('(') && trimmed.includes(')');
  const cleaned = trimmed
    .replace(/[^0-9.,()+\-]/g, '')
    .replace(/\s+/g, '')
    .replace(/[()]/g, '')
    .replace(/,/g, '');

  if (!cleaned) return null;

  const numeric = parseFloat(cleaned);
  if (Number.isNaN(numeric)) return null;

  if (negativeViaParens) {
    return -Math.abs(numeric);
  }

  if (trimmed.startsWith('-')) {
    return -Math.abs(numeric);
  }

  return numeric;
}

function sanitizeLine(line: string): string {
  return line.replace(/\s+/g, ' ').trim();
}
