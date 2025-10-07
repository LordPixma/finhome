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
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Try standard Date parsing first
  let date = new Date(dateStr);
  if (!isNaN(date.getTime())) return date;
  
  // Try DD/MM/YYYY format (UK banks like Monzo)
  const ukMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ukMatch) {
    const [, day, month, year] = ukMatch;
    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date;
  }
  
  // Try MM/DD/YYYY format (US banks)
  const usMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date;
  }
  
  // Try YYYY-MM-DD format (ISO)
  const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date;
  }
  
  return null;
}

/**
 * Parse amount from string, handling various formats
 */
function parseAmount(amountStr: string): number | null {
  if (!amountStr || amountStr.trim() === '') return null;
  
  // Remove currency symbols, commas, and whitespace
  const cleaned = amountStr.replace(/[$£€,\s]/g, '').trim();
  
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
