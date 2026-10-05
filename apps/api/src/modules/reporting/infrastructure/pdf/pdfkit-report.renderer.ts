import PDFDocument from 'pdfkit';
import type { DimensionCode } from '@innlab/contracts';
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
const TRACK = '#E8E8EC';

/**
 * The fill tone of each dimension, the same as the web's
 * (`apps/web/src/shared/lib/palette.ts`). As a
 * categorical palette it does not separate TRL from CRL and the yellow of
 * FRL barely shows on white, so no chart relies on it alone: every mark
 * carries the dimension's name, in text ink, next to it.
 */
const DIMENSION_FILL: Readonly<Record<DimensionCode, string>> = {
  TRL: '#5454E9',
  CRL: '#865CF0',
  BRL: '#4CB979',
  IPRL: '#3D3D8C',
  TmRL: '#D98E04',
  FRL: '#E4EB60',
};

/** The darker `-ink` tone, to outline a fill that is too light on white. */
const DIMENSION_EDGE: Readonly<Record<DimensionCode, string>> = {
  TRL: '#3737BD',
  CRL: '#7C4FEA',
  BRL: '#1F8550',
  IPRL: '#3D3D8C',
  TmRL: '#8A5A00',
  FRL: '#8C7818',
};

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
      case 'radar':
        this.drawRadar(doc, block);
        return;
      case 'route':
        this.drawRoute(doc, block);
        return;
      case 'answers':
        this.drawAnswers(doc, block);
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

  /** Starts a new page when `height` does not fit in what is left of this one. */
  private ensureRoom(doc: PDFKit.PDFDocument, height: number): void {
    if (doc.y + height > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
    }
  }

  /**
   * The six levels on the 1–9 scale: rings at 3, 6 and 9, the profile in
   * Azul Icesi over a 15% wash, each point in its dimension's tone and named
   * outside the ring with its level.
   */
  private drawRadar(
    doc: PDFKit.PDFDocument,
    block: Extract<ReportBlock, { kind: 'radar' }>,
  ): void {
    const radius = 95;
    this.ensureRoom(doc, radius * 2 + 60);
    const cx = doc.page.margins.left + this.width(doc) / 2;
    const cy = doc.y + radius + 24;
    const n = block.points.length;
    const at = (i: number, level: number): [number, number] => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      const r = (radius * level) / 9;
      return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
    };

    for (const ring of [3, 6, 9]) {
      doc
        .polygon(...block.points.map((_, i) => at(i, ring)))
        .lineWidth(0.6)
        .strokeColor(HAIRLINE)
        .stroke();
    }
    block.points.forEach((_, i) => {
      const [x, y] = at(i, 9);
      doc
        .moveTo(cx, cy)
        .lineTo(x, y)
        .lineWidth(0.6)
        .strokeColor(HAIRLINE)
        .stroke();
    });
    const shape = block.points.map((p, i) => at(i, p.level));
    doc.save();
    doc
      .polygon(...shape)
      .fillOpacity(0.15)
      .fill(AZUL_ICESI);
    doc.restore();
    doc
      .polygon(...shape)
      .lineWidth(2)
      .strokeColor(AZUL_ICESI)
      .stroke();
    block.points.forEach((p, i) => {
      const [x, y] = shape[i] ?? [cx, cy];
      doc
        .circle(x, y, 4.5)
        .lineWidth(1.5)
        .fillAndStroke(
          DIMENSION_FILL[p.dimensionCode],
          DIMENSION_EDGE[p.dimensionCode],
        );
    });

    // Each point named outside the outer ring, in text ink.
    doc.font('Helvetica').fontSize(9).fillColor(TEXT);
    block.points.forEach((p, i) => {
      const [x, y] = at(i, 10.4);
      const label = `${p.label}: ${String(p.level)}`;
      const w = doc.widthOfString(label) + 2;
      const lx = x < cx - 4 ? x - w : x > cx + 4 ? x : x - w / 2;
      doc.text(label, lx, y - 5, { width: w, lineBreak: false });
    });
    doc
      .fontSize(8)
      .fillColor(MUTED)
      .text(
        'Nivel IRL de 1 a 9; anillos en los niveles 3, 6 y 9.',
        doc.page.margins.left,
        cy + radius + 24,
        {
          width: this.width(doc),
          align: 'center',
        },
      );
    doc.x = doc.page.margins.left;
    doc.moveDown(0.8);
  }

  /**
   * A dumbbell per dimension on the 1–9 scale: a ring where it is today, a
   * filled dot where the route leaves it, joined by a line; the numbers are
   * written next to the name, so nothing depends on reading the dots.
   */
  private drawRoute(
    doc: PDFKit.PDFDocument,
    block: Extract<ReportBlock, { kind: 'route' }>,
  ): void {
    const rowHeight = 20;
    const labelWidth = 160;
    this.ensureRoom(doc, rowHeight * block.rows.length + 44);
    const left = doc.page.margins.left;
    const scaleLeft = left + labelWidth;
    const scaleWidth = this.width(doc) - labelWidth - 8;
    const xOf = (level: number): number =>
      scaleLeft + ((level - 1) / 8) * scaleWidth;
    let y = doc.y + 4;

    doc.font('Helvetica').fontSize(8).fillColor(MUTED);
    for (let level = 1; level <= 9; level += 1) {
      doc.text(String(level), xOf(level) - 4, y, {
        width: 8,
        align: 'center',
        lineBreak: false,
      });
    }
    y += 12;

    for (const row of block.rows) {
      const mid = y + rowHeight / 2;
      const moves = row.end !== row.today;
      doc
        .font('Helvetica')
        .fontSize(9.5)
        .fillColor(TEXT)
        .text(
          moves
            ? `${row.label}: ${String(row.today)} a ${String(row.end)}`
            : `${row.label}: ${String(row.today)}`,
          left,
          mid - 5,
          { width: labelWidth - 8, lineBreak: false },
        );
      doc
        .moveTo(scaleLeft, mid)
        .lineTo(scaleLeft + scaleWidth, mid)
        .lineWidth(0.5)
        .strokeColor(HAIRLINE)
        .stroke();
      const edge = DIMENSION_EDGE[row.dimensionCode];
      if (moves) {
        doc
          .moveTo(xOf(row.today), mid)
          .lineTo(xOf(row.end), mid)
          .lineWidth(2)
          .strokeColor(edge)
          .stroke();
      }
      doc
        .circle(xOf(row.today), mid, 4)
        .lineWidth(1.5)
        .fillAndStroke('#FFFFFF', edge);
      if (moves) {
        doc
          .circle(xOf(row.end), mid, 4.5)
          .lineWidth(1)
          .fillAndStroke(DIMENSION_FILL[row.dimensionCode], edge);
      }
      y += rowHeight;
    }

    // Legend: the two marks, drawn, with what they mean.
    y += 6;
    doc
      .circle(scaleLeft + 4, y + 4, 3.5)
      .lineWidth(1.2)
      .fillAndStroke('#FFFFFF', MUTED);
    doc
      .fontSize(8.5)
      .fillColor(MUTED)
      .text('Hoy', scaleLeft + 12, y, { lineBreak: false });
    doc
      .circle(scaleLeft + 46, y + 4, 4)
      .lineWidth(1)
      .fillAndStroke(MUTED, MUTED);
    doc.text('Al terminar la ruta', scaleLeft + 54, y, { lineBreak: false });
    doc.x = left;
    doc.y = y + 20;
  }

  /**
   * The statements of a dimension: each with its text, the justification
   * when there is one, and the answer as five segments filled up to the
   * value, with the number and its words beside them.
   */
  private drawAnswers(
    doc: PDFKit.PDFDocument,
    block: Extract<ReportBlock, { kind: 'answers' }>,
  ): void {
    const left = doc.page.margins.left;
    const width = this.width(doc);
    const scaleWidth = 130;
    const textWidth = width - scaleWidth - 16;
    const fill = DIMENSION_FILL[block.dimensionCode];
    const edge = DIMENSION_EDGE[block.dimensionCode];

    this.ensureRoom(doc, 80);
    doc.moveDown(0.6);
    const titleTop = doc.y;
    doc.rect(left, titleTop + 1, 4, 12).fill(fill);
    doc
      .font('Helvetica-Bold')
      .fontSize(11.5)
      .fillColor(TEXT)
      .text(block.title, left + 10, titleTop, { width: width - 10 });
    doc.moveDown(0.4);

    for (const row of block.rows) {
      const statement = `${String(row.sequence)}. ${row.text}`;
      const note = row.justification
        ? `Justificación: ${row.justification}`
        : null;
      doc.font('Helvetica').fontSize(9.5);
      const textHeight = doc.heightOfString(statement, {
        width: textWidth,
        lineGap: 1.5,
      });
      doc.fontSize(8.5);
      const noteHeight = note
        ? doc.heightOfString(note, { width: textWidth, lineGap: 1 }) + 3
        : 0;
      const rowHeight = Math.max(textHeight + noteHeight, 28) + 10;
      this.ensureRoom(doc, rowHeight);

      const top = doc.y;
      doc
        .moveTo(left, top)
        .lineTo(left + width, top)
        .lineWidth(0.5)
        .strokeColor(HAIRLINE)
        .stroke();
      doc
        .font('Helvetica')
        .fontSize(9.5)
        .fillColor(TEXT)
        .text(statement, left, top + 6, { width: textWidth, lineGap: 1.5 });
      if (note) {
        doc
          .fontSize(8.5)
          .fillColor(MUTED)
          .text(note, left, doc.y + 3, { width: textWidth, lineGap: 1 });
      }

      const scaleLeft = left + width - scaleWidth;
      const gap = 3;
      const segment = (scaleWidth - 4 * gap) / 5;
      for (let i = 0; i < 5; i += 1) {
        doc
          .rect(scaleLeft + i * (segment + gap), top + 8, segment, 6)
          .fill(i < row.value ? fill : TRACK);
      }
      if (block.dimensionCode === 'FRL') {
        // The yellow is too light on white: its reached segments get an edge.
        for (let i = 0; i < row.value; i += 1) {
          doc
            .rect(scaleLeft + i * (segment + gap), top + 8, segment, 6)
            .lineWidth(0.6)
            .strokeColor(edge)
            .stroke();
        }
      }
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor(TEXT)
        .text(`${String(row.value)} de 5`, scaleLeft, top + 18, {
          width: scaleWidth,
          lineBreak: false,
        });
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(MUTED)
        .text(row.valueLabel, scaleLeft, top + 29, { width: scaleWidth });

      doc.x = left;
      doc.y = top + rowHeight;
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
