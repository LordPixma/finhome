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

  const headers = lines[0].split(',').map(h => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    rows.push(row);
  }

  return { headers, rows };
}

// OFX Parser utility (simplified)
export function parseOFX(ofxContent: string): any {
  // This is a simplified parser
  // In production, use a proper OFX parsing library
  const transactions: any[] = [];

  // Extract STMTTRN blocks
  const stmtTrnRegex = /<STMTTRN>(.*?)<\/STMTTRN>/gs;
  const matches = ofxContent.matchAll(stmtTrnRegex);

  for (const match of matches) {
    const block = match[1];

    const getTagValue = (tag: string) => {
      const tagRegex = new RegExp(`<${tag}>([^<]+)`, 'i');
      const tagMatch = block.match(tagRegex);
      return tagMatch ? tagMatch[1] : '';
    };

    transactions.push({
      type: getTagValue('TRNTYPE'),
      date: getTagValue('DTPOSTED'),
      amount: parseFloat(getTagValue('TRNAMT')),
      fitid: getTagValue('FITID'),
      name: getTagValue('NAME'),
      memo: getTagValue('MEMO'),
    });
  }

  return { transactions };
}
