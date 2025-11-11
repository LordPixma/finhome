import { describe, it, expect } from 'vitest';
import { BANK_PDF_TEMPLATES, detectPdfTemplate } from '@finhome360/shared';
import { parsePdfLine } from '../utils/fileParser';

describe('PDF templates', () => {
  it('detects UK generic template from keywords', () => {
    const sample = `Sort Code: 00-00-00\nAccount Number: 12345678\nBalance Brought Forward: £100.00`;
    const detected = detectPdfTemplate(sample);
    expect(detected).toBeDefined();
    expect(detected?.id).toBe('uk-generic');
  });

  it('parses a UK statement line with debit/credit columns', () => {
    const tpl = BANK_PDF_TEMPLATES.find(t => t.id === 'uk-generic')!;
    // date, description, debit, credit, balance
    const line = '12/10/2025 GROCERY STORE - LONDON             £23.45          £0.00          £976.55';

    const parsed = parsePdfLine(tpl, line);
    expect(parsed).not.toBeNull();
    expect(parsed!.description.toLowerCase()).toContain('grocery');
    expect(parsed!.date.getFullYear()).toBe(2025);
    // With debit/credit style, money out should be expense with absolute amount
    expect(parsed!.type).toBe('expense');
    expect(parsed!.amount).toBeGreaterThan(0);
  });

  it('parses a US statement line with signed amount', () => {
    const tpl = BANK_PDF_TEMPLATES.find(t => t.id === 'us-generic')!;
    const line = '10/15/2025 PAYROLL DIRECT DEPOSIT +$2,345.67';

    const parsed = parsePdfLine(tpl, line);
    expect(parsed).not.toBeNull();
    expect(parsed!.type).toBe('income');
    expect(parsed!.amount).toBe(2345.67);
  });
});
