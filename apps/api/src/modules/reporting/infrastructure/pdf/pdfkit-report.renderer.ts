import PDFDocument from 'pdfkit';
import type {
  ReportBlock,
  ReportDocumentModel,
} from '../../application/dtos/report-document.js';
import type { ReportRendererPort } from '../../application/ports/report-renderer.port.js';

/**
 * Brand values of `DESIGN.md` the file needs. The PDF uses Helvetica, one of
 * the fourteen fonts every PDF reader has: Plus Jakarta Sans is not shipped
 * with the backend, and the manual names Arial (Helvetica's metric twin)
 * as the face of documents generated outside the product.
 */
const AZUL_ICESI = '#5454E9';
const TEXT = '#333333';
const MUTED = '#5C5C66';
const HAIRLINE = '#D9D9D9';
const CRITICAL = '#C0392B';

const MARGIN = 56;
const FOOTER_HEIGHT = 40;

export interface PdfkitReportRendererOptions {
  /** Compress the page streams; off only to read the file in tests. */
  readonly compress?: boolean;
}

/**
 * `ReportRendererPort` with pdfkit: an A4 document whose first page opens
 * with the institutional lock-up in words, the title and the date; each
 * block of the model drawn in order; and, on every page, the KTH
 * attribution and the page number at the foot.
 *
 * Registered with a factory (`reporting.module.ts`): its options are not a
 * provider.
 */
export class PdfkitReportRenderer implements ReportRendererPort {
  private readonly compress: boolean;

  constructor(options: PdfkitReportRendererOptions = {}) {
    this.compress = options.compress ?? true;
  }

  render(model: ReportDocumentModel): Promise<Uint8Array> {
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: MARGIN,
        bottom: MARGIN + FOOTER_HEIGHT,
        left: MARGIN,
        right: MARGIN,
      },
      bufferPages: true,
      compress: this.compress,
      lang: 'es-CO',
      info: {
        Title: model.title,
        Author: 'INNLAB · Centro de Innovación · Universidad Icesi',
        Subject: model.subtitle,
        Creator: 'Sistema de Diagnóstico IRL',
      },
    });

    const chunks: Buffer[] = [];
    const done = new Promise<Uint8Array>((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => {
        resolve(new Uint8Array(Buffer.concat(chunks)));
      });
      doc.on('error', reject);
    });

    this.drawHeader(doc, model);
    for (const block of model.blocks) this.drawBlock(doc, block);
    this.drawFooters(doc, model.footer);
    doc.end();

    return done;
  }

  private width(doc: PDFKit.PDFDocument): number {
    return doc.page.width - doc.page.margins.left - doc.page.margins.right;
  }

  private drawHeader(
    doc: PDFKit.PDFDocument,
    model: ReportDocumentModel,
  ): void {
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(AZUL_ICESI)
      .text('INNLAB', { continued: true })
      .font('Helvetica')
      .fillColor(MUTED)
      .text('  |  Centro de Innovación · Universidad Icesi');
    doc.moveDown(1.5);
    doc
      .font('Helvetica-Bold')
      .fontSize(20)
      .fillColor(TEXT)
      .text(model.title, { width: this.width(doc) });
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(11).fillColor(MUTED).text(model.subtitle);
    doc.moveDown(0.5);
    const y = doc.y;
    doc
      .moveTo(doc.page.margins.left, y)
      .lineTo(doc.page.width - doc.page.margins.right, y)
      .lineWidth(2)
      .strokeColor(AZUL_ICESI)
      .stroke();
    doc.moveDown(1);
  }

  private drawBlock(doc: PDFKit.PDFDocument, block: ReportBlock): void {
    const width = this.width(doc);
    switch (block.kind) {
      case 'heading': {
        doc.moveDown(1);
        // A heading never sits alone at the foot of a page.
        if (doc.y > doc.page.height - doc.page.margins.bottom - 80) {
          doc.addPage();
        }
        doc
          .font('Helvetica-Bold')
          .fontSize(15)
          .fillColor(AZUL_ICESI)
          .text(block.text, { width });
        const y = doc.y + 2;
        doc
          .moveTo(doc.page.margins.left, y)
          .lineTo(doc.page.margins.left + width, y)
          .lineWidth(0.75)
          .strokeColor(HAIRLINE)
          .stroke();
        doc.moveDown(0.6);
        return;
      }
      case 'subheading':
        doc.moveDown(0.4);
        doc
          .font('Helvetica-Bold')
          .fontSize(11.5)
          .fillColor(TEXT)
          .text(block.text, { width });
        doc.moveDown(0.2);
        return;
      case 'paragraph':
        doc
          .font('Helvetica')
          .fontSize(10.5)
          .fillColor(TEXT)
          .text(block.text, { width, lineGap: 2 });
        doc.moveDown(0.4);
        return;
      case 'field':
        doc
          .font('Helvetica-Bold')
          .fontSize(10.5)
          .fillColor(TEXT)
          .text(`${block.label}: `, { width, continued: true, lineGap: 2 })
          .font('Helvetica')
          .text(block.value, { lineGap: 2 });
        doc.moveDown(0.3);
        return;
      case 'bullet':
        doc
          .font('Helvetica')
          .fontSize(10.5)
          .fillColor(TEXT)
          .list([block.text], {
            width,
            bulletRadius: 1.8,
            textIndent: 12,
            lineGap: 2,
          });
        doc.moveDown(0.2);
        return;
      case 'alert':
        doc
          .font('Helvetica-Bold')
          .fontSize(10.5)
          .fillColor(CRITICAL)
          .text('Alerta: ', { width, continued: true, lineGap: 2 })
          .fillColor(TEXT)
          .font('Helvetica')
          .text(block.text, { lineGap: 2 });
        doc.moveDown(0.4);
        return;
    }
  }

  /** The attribution and «Página n de m» at the foot of every page. */
  private drawFooters(doc: PDFKit.PDFDocument, footer: string): void {
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i);
      const bottom = doc.page.margins.bottom;
      // Writing inside the bottom margin would add a page: lift it while drawing.
      doc.page.margins.bottom = 0;
      const y = doc.page.height - MARGIN - 12;
      const width = doc.page.width - MARGIN * 2;
      doc
        .moveTo(MARGIN, y - 8)
        .lineTo(MARGIN + width, y - 8)
        .lineWidth(0.5)
        .strokeColor(HAIRLINE)
        .stroke();
      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(MUTED)
        .text(footer, MARGIN, y, { width, lineBreak: false })
        .text(`Página ${String(i + 1)} de ${String(range.count)}`, MARGIN, y, {
          width,
          align: 'right',
          lineBreak: false,
        });
      doc.page.margins.bottom = bottom;
    }
  }
}
