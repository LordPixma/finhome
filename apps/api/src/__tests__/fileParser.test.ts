import { describe, it, expect } from 'vitest';
import { parsePDF } from '../utils/fileParser';

describe('parsePDF', () => {
  it('returns empty array since PDF parsing is not supported in Cloudflare Workers', async () => {
    // PDF parsing disabled due to pdfjs-dist incompatibility with Cloudflare Workers edge runtime
    const mockBuffer = new ArrayBuffer(8);
    const transactions = await parsePDF(mockBuffer);
    
    expect(transactions).toEqual([]);
  });
});
