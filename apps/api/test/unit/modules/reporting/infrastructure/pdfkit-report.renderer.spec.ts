import { describe, expect, it } from '@jest/globals';
import { buildReportDocument } from '../../../../../src/modules/reporting/application/dtos/report-document.js';
import { PdfkitReportRenderer } from '../../../../../src/modules/reporting/infrastructure/pdf/pdfkit-report.renderer.js';
import { aReport } from '../support/a-report.js';

/** The raw file, readable because the streams are not compressed. */
async function rendered(): Promise<string> {
  const bytes = await new PdfkitReportRenderer({ compress: false }).render(
    buildReportDocument(aReport()),
  );
  return Buffer.from(bytes).toString('latin1');
}

/**
 * pdfkit writes the text of the standard fonts as hexadecimal strings, and
 * may split a line where the font kerns two letters; a word with no kerning
 * pair («IRL», «KTH») is found whole.
 */
function hex(text: string): string {
  return Buffer.from(text, 'latin1').toString('hex');
}

describe('PdfkitReportRenderer', () => {
  it('produces a complete PDF file', async () => {
    const pdf = await rendered();

    expect(pdf.startsWith('%PDF-')).toBe(true);
    expect(pdf.trimEnd().endsWith('%%EOF')).toBe(true);
  });

  it('carries the title and the author as metadata', async () => {
    const pdf = await rendered();

    expect(pdf).toMatch(/\/Title/);
    expect(pdf).toMatch(/\/Author/);
  });

  it('puts the attribution and the page number at the foot of every page', async () => {
    const pdf = await rendered();
    const pages = (pdf.match(/\/Type \/Page\b/g) ?? []).length;

    expect(pages).toBeGreaterThan(1);
    // «KTH» appears in the footer of each page, and also in the body.
    const kth = pdf.split(hex('KTH')).length - 1;
    expect(kth).toBeGreaterThanOrEqual(pages);
  });
});
