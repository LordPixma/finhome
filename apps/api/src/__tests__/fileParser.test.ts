import { describe, it, expect } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { parsePDF } from '../utils/fileParser';

async function createSampleStatement(): Promise<ArrayBuffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([400, 400]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 12;
  let y = 360;

  const drawLine = (text: string) => {
    page.drawText(text, { x: 40, y, size: fontSize, font });
    y -= 20;
  };

  drawLine('Date Description Amount Balance');
  drawLine('01/02/2024 Coffee Shop -5.50 995.00');
  drawLine('02/02/2024 Salary 2000.00 2995.00');
  const pdfBytes = await pdfDoc.save();
  return pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength);
}

describe('parsePDF', () => {
  it('extracts transactions from a simple PDF bank statement', async () => {
    const pdfBuffer = await createSampleStatement();
    const transactions = await parsePDF(pdfBuffer);

    expect(transactions).toHaveLength(2);

    const [first, second] = transactions;
    expect(first.description).toBe('Coffee Shop');
    expect(first.amount).toBeCloseTo(5.5, 2);
    expect(first.type).toBe('expense');

    expect(second.description).toBe('Salary');
    expect(second.amount).toBeCloseTo(2000, 2);
    expect(second.type).toBe('income');
  });
});
