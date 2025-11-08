import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { TextContent, TextItem } from 'pdfjs-dist/types/src/display/api';

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
export async function parsePDF(pdfContent: ArrayBuffer): Promise<ParsedTransaction[]> {
  try {
    const pdfBytes = new Uint8Array(pdfContent);
    const loadingTask = getDocument({
      data: pdfBytes,
      disableFontFace: true,
      useSystemFonts: true,
    });
    const pdf = await loadingTask.promise;

    const allLines: string[] = [];

    for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex++) {
      const page = await pdf.getPage(pageIndex);
      const textContent = (await page.getTextContent()) as TextContent;
      allLines.push(...extractPdfLines(textContent));
    }

    return parsePdfLines(allLines);
  } catch (error) {
    console.error('Failed to parse PDF file:', error);
    return [];
  }
}

function extractPdfLines(textContent: TextContent): string[] {
  const lineMap = new Map<number, string[]>();

  for (const item of textContent.items) {
    const textItem = item as TextItem;
    const value = (textItem.str || '').replace(/\u00a0/g, ' ').trim();
    if (!value) continue;

    const transform = textItem.transform || [0, 0, 0, 0, 0, 0];
    const yPosition = Math.round(transform[5] || 0);
    const currentLine = lineMap.get(yPosition) || [];
    currentLine.push(value);
    lineMap.set(yPosition, currentLine);
  }

  return Array.from(lineMap.entries())
    .sort((a, b) => b[0] - a[0]) // PDF coordinates start at bottom-left
    .map(([, fragments]) => fragments.join(' ').replace(/\s+/g, ' ').trim())
    .filter(line => line.length > 0);
}

function parsePdfLines(lines: string[]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  let lastTransaction: ParsedTransaction | null = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\u00a0/g, ' ').trim();
    if (!line) continue;

    const lower = line.toLowerCase();
    if (lower.includes('date') && lower.includes('description')) {
      continue; // Skip header rows
    }

    // Expecting date in MM/DD/YYYY or MM-DD-YYYY format (strict, 01-12 for month, 01-31 for day, 4-digit year)
    const dateMatch = line.match(/^((0[1-9]|1[0-2])[\/\-](0[1-9]|[12][0-9]|3[01])[\/\-](\d{4}))\s+(.*)$/);
    if (!dateMatch) {
      if (lastTransaction) {
        const notes = `${lastTransaction.notes ? `${lastTransaction.notes} ` : ''}${line}`.trim();
        lastTransaction.notes = notes;
      }
      continue;
    }

    const [, dateStr, remainderRaw] = dateMatch;
    const remainder = remainderRaw.replace(/\s{2,}/g, ' ').trim();
    const date = parseDate(dateStr);
    if (!date) {
      continue;
    }

    const matchIterator = remainder.matchAll(/-?[0-9]+[0-9,]*\.\d{2}/g);
    const matchResults = Array.from(matchIterator).map(match => ({
      value: match[0],
      index: match.index ?? remainder.indexOf(match[0]),
      amount: parseAmount(match[0]) ?? 0,
    }));

    if (matchResults.length === 0) {
      if (lastTransaction) {
        const notes = `${lastTransaction.notes ? `${lastTransaction.notes} ` : ''}${remainder}`.trim();
        lastTransaction.notes = notes;
      }
      continue;
    }

    const primaryMatch = matchResults.find(match => match.amount !== 0) || matchResults[0];
    const amount = primaryMatch.amount;
    const descriptionPart = remainder.slice(0, primaryMatch.index).trim();
    const trailingPart = remainder.slice(primaryMatch.index + primaryMatch.value.length).trim();

    const cleanedDescription = descriptionPart.replace(/\b(CR|DR)\b/gi, '').trim() || 'Transaction';
    const typeOverride = detectTypeFromText(trailingPart);
    const normalizedAmount = Math.abs(amount);
    const type: 'income' | 'expense' = typeOverride ?? (amount >= 0 ? 'income' : 'expense');

    const trailingTokens = trailingPart
      .replace(/\b(CR|DR)\b/gi, '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .filter(token => !/^[-+]?\d[\d,]*\.?\d*$/.test(token));

    const notes = trailingTokens.join(' ');

    const transaction: ParsedTransaction = {
      date,
      description: cleanedDescription,
      amount: normalizedAmount,
      type,
      notes: notes || undefined,
    };

    transactions.push(transaction);
    lastTransaction = transaction;
  }

  return transactions;
}

function detectTypeFromText(text: string): 'income' | 'expense' | null {
  if (!text) return null;
  if (/\bCR\b/i.test(text) || /credit/i.test(text)) {
    return 'income';
  }
  if (/\bDR\b/i.test(text) || /debit/i.test(text)) {
    return 'expense';
  }
  return null;
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
