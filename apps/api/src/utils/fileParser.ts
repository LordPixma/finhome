// CSV Parser utility
export interface CSVParseResult {
  headers: string[];
  rows: Record<string, string>[];
}

export function parseCSV(csvContent: string): CSVParseResult {
  const lines = csvContent.trim().split('\n');
  if (lines.length === 0) {
    throw new Error('Empty CSV file');
  }

  // Handle both comma and semicolon delimiters
  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue; // Skip empty lines
    
    const values = lines[i].split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
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
  const transactions: ParsedTransaction[] = [];

  // Default field mappings (try common column names)
  const dateField = mapping?.date || 'Date' || 'Transaction Date' || 'date';
  const descField = mapping?.description || 'Description' || 'Memo' || 'description';
  const amountField = mapping?.amount || 'Amount' || 'amount';

  for (const row of rows) {
    try {
      // Find date field
      const dateValue = row[dateField] || row['Date'] || row['Transaction Date'] || row['date'];
      if (!dateValue) continue;

      // Find description
      const description = row[descField] || row['Description'] || row['Memo'] || row['description'] || 'Unknown';

      // Find amount
      const amountStr = row[amountField] || row['Amount'] || row['amount'];
      if (!amountStr) continue;

      // Parse amount (handle negative values, parentheses, currency symbols)
      let amount = parseFloat(amountStr.replace(/[$,()]/g, '').trim());
      if (amountStr.includes('(') || amountStr.includes('-')) {
        amount = Math.abs(amount);
      }

      // Determine type (negative = expense, positive = income)
      const type: 'income' | 'expense' = amount < 0 ? 'expense' : 'income';
      amount = Math.abs(amount);

      // Parse date (support multiple formats)
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) continue;

      transactions.push({
        date,
        description,
        amount,
        type,
        notes: row['Notes'] || row['Memo'] || undefined,
      });
    } catch (error) {
      console.error('Error parsing row:', row, error);
      continue;
    }
  }

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
