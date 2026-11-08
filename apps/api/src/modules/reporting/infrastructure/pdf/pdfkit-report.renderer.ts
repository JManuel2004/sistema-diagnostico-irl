import { createRequire } from 'node:module';
import PDFDocument from 'pdfkit';
import type { DimensionCode } from '@innlab/contracts';
import type {
  MaturityBandKey,
  ReportBlock,
  ReportDocumentModel,
} from '../../application/dtos/report-document.js';
import type { ReportRendererPort } from '../../application/ports/report-renderer.port.js';

/**
 * The PDF is set in the application's face, Plus Jakarta Sans (SIL Open Font
 * License), embedded from `@fontsource/plus-jakarta-sans`, so the report
 * reads as part of the same product (usability test P02). If the files
 * cannot be loaded it falls back to Helvetica, one of the fourteen fonts
 * every PDF reader has; the manual names Arial, its metric twin, as the face
 * of documents generated outside the product.
 */
const BODY = 'Body';
const BOLD = 'Body-Bold';

/** The two weights the report uses, as files of the installed package. */
function brandFontFiles(): { readonly regular: string; readonly bold: string } {
  const require = createRequire(import.meta.url);
  const file = (weight: number): string =>
    require.resolve(
      `@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-${String(weight)}-normal.woff`,
    );
  return { regular: file(400), bold: file(700) };
}

/** Brand values of `DESIGN.md` the file needs. */
const AZUL_ICESI = '#5454E9';
const AZUL_INK = '#3737BD';
const WASH = '#F3F3FD';
const TEXT = '#333333';
const MUTED = '#5C5C66';
const HAIRLINE = '#D9D9D9';
const TRACK = '#E8E8EC';
const ON_BAND = '#E4E4FF';
/**
 * INNLAB asked to keep red out of the results: what needs attention first
 * reads in dark orange, always with words and a mark, never by color alone.
 * The approximate service of a phase reads in dark amber.
 */
const ATTENTION = '#B45309';
const APPROXIMATE = '#8C7818';
/** What goes up with the route, as on screen. */
const ACCEPTABLE = '#1B7A48';

/**
 * The text tone of each maturity band, the same as the web's `maturity-*-ink`
 * (`apps/web/src/shared/lib/palette.ts`): the global level reads in the color
 * of its band, as on the results screen. The red of the low band is its ink,
 * not the design system's critical red.
 */
const MATURITY_INK: Readonly<Record<MaturityBandKey, string>> = {
  low: '#B03224',
  developing: '#A8500B',
  advanced: '#7A5C00',
  mature: '#1B7A48',
};

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
  /**
   * Embed the application's face (the default). Off, the standard
   * Helvetica: its text stays readable in the raw file, for the tests that
   * look for it.
   */
  readonly brandFont?: boolean;
}

/**
 * `ReportRendererPort` with pdfkit: an A4 document whose first page opens
 * with a band (the institutional lock-up, the title, the initiative and
 * the date) and a summary of the results; then each block of the model in
 * order; and, on every page, the KTH attribution and the page number at
 * the foot.
 *
 * Registered with a factory (`reporting.module.ts`): its options are not a
 * provider.
 */
export class PdfkitReportRenderer implements ReportRendererPort {
  private readonly compress: boolean;
  private readonly brandFont: boolean;

  constructor(options: PdfkitReportRendererOptions = {}) {
    this.compress = options.compress ?? true;
    this.brandFont = options.brandFont ?? true;
  }

  /** `BODY` and `BOLD`: the brand face, or Helvetica when it is off or missing. */
  private registerFonts(doc: PDFKit.PDFDocument): void {
    if (this.brandFont) {
      try {
        const files = brandFontFiles();
        doc.registerFont(BODY, files.regular);
        doc.registerFont(BOLD, files.bold);
        doc.font(BODY);
        return;
      } catch {
        // The package is missing or unreadable: the standard face is enough.
      }
    }
    doc.registerFont(BODY, 'Helvetica');
    doc.registerFont(BOLD, 'Helvetica-Bold');
    doc.font(BODY);
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

    this.registerFonts(doc);
    this.drawBanner(doc, model);
    for (const block of model.blocks) this.drawBlock(doc, block);
    this.drawFooters(doc, model.footer);
    doc.end();

    return done;
  }

  private width(doc: PDFKit.PDFDocument): number {
    return doc.page.width - doc.page.margins.left - doc.page.margins.right;
  }

  /** The band across the top of the first page. */
  private drawBanner(
    doc: PDFKit.PDFDocument,
    model: ReportDocumentModel,
  ): void {
    const left = doc.page.margins.left;
    const width = this.width(doc);
    doc.font(BODY).fontSize(10.5);
    const initiativeHeight = doc.heightOfString(model.banner.initiative, {
      width,
    });
    const bandHeight = 120 + initiativeHeight;
    doc.rect(0, 0, doc.page.width, bandHeight).fill(AZUL_ICESI);
    doc
      .font(BOLD)
      .fontSize(9)
      .fillColor('#FFFFFF')
      .text('INNLAB', left, 26, { continued: true })
      .font(BODY)
      .text('   Centro de Innovación  |  Universidad Icesi');
    doc.font(BOLD).fontSize(19).text(model.banner.heading, left, 46, { width });
    doc
      .font(BODY)
      .fontSize(10.5)
      .text(model.banner.initiative, left, 72, { width });
    doc
      .font(BOLD)
      .fontSize(10.5)
      .fillColor('#FFFFFF')
      .text(model.banner.service, left, 78 + initiativeHeight, { width });
    doc
      .font(BODY)
      .fontSize(8.5)
      .fillColor(ON_BAND)
      .text(model.banner.meta, left, 96 + initiativeHeight, { width });
    doc.x = left;
    doc.y = bandHeight + 18;
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
          .font(BOLD)
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
          .font(BOLD)
          .fontSize(11.5)
          .fillColor(TEXT)
          .text(block.text, { width });
        doc.moveDown(0.2);
        return;
      case 'paragraph':
        doc
          .font(BODY)
          .fontSize(10.5)
          .fillColor(TEXT)
          .text(block.text, { width, lineGap: 2 });
        doc.moveDown(0.4);
        return;
      case 'field':
        doc
          .font(BOLD)
          .fontSize(10.5)
          .fillColor(TEXT)
          .text(`${block.label}: `, { width, continued: true, lineGap: 2 })
          .font(BODY)
          .text(block.value, { lineGap: 2 });
        doc.moveDown(0.3);
        return;
      case 'bullet':
        doc.font(BODY).fontSize(10.5).fillColor(TEXT).list([block.text], {
          width,
          bulletRadius: 1.8,
          textIndent: 12,
          lineGap: 2,
        });
        doc.moveDown(0.2);
        return;
      case 'route':
        this.drawRoute(doc, block);
        return;
      case 'answers':
        this.drawAnswers(doc, block);
        return;
      case 'summary':
        this.drawSummary(doc, block.summary);
        return;
      case 'timeline':
        this.drawTimeline(doc, block.phases);
        return;
      case 'pageBreak':
        doc.addPage();
        return;
      case 'pair':
        this.drawPair(doc, block);
        return;
      case 'alert':
        doc
          .font(BOLD)
          .fontSize(10.5)
          .fillColor(ATTENTION)
          .text('Dimensión crítica: ', {
            width,
            continued: true,
            lineGap: 2,
          })
          .fillColor(TEXT)
          .font(BODY)
          .text(block.text, { lineGap: 2 });
        doc.moveDown(0.4);
        return;
    }
  }

  /** The largest size up to `max` at which `text` fits `width` in one line. */
  private fitSize(
    doc: PDFKit.PDFDocument,
    text: string,
    width: number,
    max: number,
    min = 9,
    font = BOLD,
  ): number {
    let size = max;
    doc.font(font);
    while (size > min && doc.fontSize(size).widthOfString(text) > width) {
      size -= 0.5;
    }
    return size;
  }

  /** A small filled circle with «!»: attention never relies on color alone. */
  private attentionMark(doc: PDFKit.PDFDocument, x: number, y: number): void {
    doc.circle(x, y, 6).fill(ATTENTION);
    doc
      .font(BOLD)
      .fontSize(8)
      .fillColor('#FFFFFF')
      .text('!', x - 1.6, y - 4, { lineBreak: false });
  }

  /**
   * The first page after the band: four indicators (the service, the
   * bottleneck and the critical dimensions first), the profile as a radar
   * beside level bars, the recommended service and the map of the report's
   * sections.
   */
  private drawSummary(
    doc: PDFKit.PDFDocument,
    summary: Extract<ReportBlock, { kind: 'summary' }>['summary'],
  ): void {
    const left = doc.page.margins.left;
    const width = this.width(doc);
    let y = doc.y;

    // Indicators.
    const gap = 10;
    const cardW =
      (width - gap * (summary.indicators.length - 1)) /
      summary.indicators.length;
    const cardH = 92;
    summary.indicators.forEach((c, i) => {
      const x = left + i * (cardW + gap);
      const tone = c.attention
        ? ATTENTION
        : c.band
          ? MATURITY_INK[c.band]
          : TEXT;
      doc
        .roundedRect(x, y, cardW, cardH, 6)
        .lineWidth(1)
        .fillAndStroke(
          i === 0 ? WASH : '#FFFFFF',
          c.attention ? ATTENTION : HAIRLINE,
        );
      const labelX = c.attention ? x + 24 : x + 10;
      if (c.attention) this.attentionMark(doc, x + 15, y + 13.5);
      const labelW = cardW - (labelX - x) - 8;
      const label = c.label.toUpperCase();
      // One line always: the spacing goes before the size does.
      doc.font(BOLD).fontSize(7);
      const spacing =
        doc.widthOfString(label) + 0.4 * label.length <= labelW ? 0.4 : 0;
      doc
        .fontSize(this.fitSize(doc, label, labelW, 7, 5.5))
        .fillColor(c.attention ? ATTENTION : MUTED)
        .text(label, labelX, y + 10, {
          width: labelW,
          lineBreak: false,
          characterSpacing: spacing,
        });
      // A long service name shrinks to fit one line instead of covering its caption.
      const size = this.fitSize(doc, c.value, cardW - 20, 20, 7);
      doc
        .fontSize(size)
        .fillColor(tone)
        .text(c.value, x + 10, y + 24 + (20 - size) / 2, {
          width: cardW - 20,
          lineBreak: false,
        });
      doc
        .fontSize(this.fitSize(doc, c.caption, cardW - 20, 8.5, 6.5, BODY))
        .fillColor(MUTED)
        .text(c.caption, x + 10, y + 50, {
          width: cardW - 20,
          lineBreak: false,
        });
      // One line, so no text is cut at the card's edge.
      doc
        .fontSize(this.fitSize(doc, c.detail, cardW - 20, 7.5, 6, BODY))
        .text(c.detail, x + 10, y + 68, {
          width: cardW - 20,
          lineBreak: false,
        });
    });
    y += cardH + 22;

    // Profile: radar and level bars.
    doc
      .font(BOLD)
      .fontSize(12)
      .fillColor(TEXT)
      .text('Perfil de seis dimensiones', left, y);
    doc
      .font(BODY)
      .fontSize(8.5)
      .fillColor(MUTED)
      .text(
        'Nivel de madurez en cada dimensión, en una escala de 1 a 9.',
        left,
        y + 16,
      );
    y += 34;
    const radius = 74;
    const cx = left + radius + 36;
    const cy = y + radius + 14;
    this.radarAt(
      doc,
      summary.levels.map((l) => ({
        dimensionCode: l.dimensionCode,
        label: l.label,
        level: l.level,
      })),
      cx,
      cy,
      radius,
      7.5,
    );
    const barsLeft = left + 2 * radius + 92;
    const barsWidth = left + width - barsLeft;
    const labelW = 104;
    const scaleW = barsWidth - labelW - 34;
    summary.levels.forEach((l, i) => {
      const rowY = y + 6 + i * 29;
      doc
        .font(BOLD)
        .fontSize(8.5)
        .fillColor(TEXT)
        .text(l.label, barsLeft, rowY, {
          width: labelW - 4,
          lineBreak: false,
        });
      if (l.tag) {
        doc
          .font(BODY)
          .fontSize(7)
          .fillColor(l.attention ? ATTENTION : MUTED)
          .text(l.tag, barsLeft, rowY + 11, {
            width: labelW - 4,
            lineBreak: false,
          });
      }
      const sx = barsLeft + labelW;
      const cell = scaleW / 9;
      for (let level = 1; level <= 9; level += 1) {
        doc
          .rect(sx + (level - 1) * cell, rowY + 2, cell - 2, 10)
          .fill(level <= l.level ? DIMENSION_FILL[l.dimensionCode] : TRACK);
      }
      if (l.dimensionCode === 'FRL') {
        // The yellow is too light on white: its reached cells get an edge.
        for (let level = 1; level <= l.level; level += 1) {
          doc
            .rect(sx + (level - 1) * cell, rowY + 2, cell - 2, 10)
            .lineWidth(0.5)
            .strokeColor(DIMENSION_EDGE.FRL)
            .stroke();
        }
      }
      doc
        .font(BOLD)
        .fontSize(9)
        .fillColor(TEXT)
        .text(`${String(l.level)}/9`, sx + scaleW + 6, rowY + 2, {
          width: 30,
          lineBreak: false,
        });
    });
    y = Math.max(cy + radius + 26, y + 6 + summary.levels.length * 29 + 8);

    // The recommendation, highlighted.
    const boxH = 108;
    doc.roundedRect(left, y, width, boxH, 8).fill(WASH);
    doc.rect(left, y, 5, boxH).fill(AZUL_ICESI);
    doc
      .font(BOLD)
      .fontSize(7.5)
      .fillColor(AZUL_ICESI)
      .text('SERVICIO RECOMENDADO DEL PORTAFOLIO INNLAB', left + 18, y + 12, {
        characterSpacing: 0.4,
        lineBreak: false,
      });
    const rec = summary.recommendation;
    if (rec) {
      const pillW = 112;
      const nameSize = this.fitSize(doc, rec.name, width - pillW - 44, 16, 10);
      doc
        .fontSize(nameSize)
        .fillColor(TEXT)
        .text(rec.name, left + 18, y + 26, {
          width: width - pillW - 44,
          lineBreak: false,
        });
      doc
        .font(BODY)
        .fontSize(8.5)
        .fillColor(MUTED)
        .text(rec.subtitle, left + 18, y + 46, {
          width: width - pillW - 44,
          lineBreak: false,
        });
      doc
        .roundedRect(left + width - pillW - 16, y + 14, pillW, 22, 11)
        .fill(AZUL_ICESI);
      doc
        .font(BOLD)
        .fontSize(8.5)
        .fillColor('#FFFFFF')
        .text(`Nivel ${rec.tier}`, left + width - pillW - 16, y + 21, {
          width: pillW,
          align: 'center',
          lineBreak: false,
        });
      doc
        .font(BODY)
        .fontSize(8.5)
        .fillColor(TEXT)
        .text(`Alcance y entregables: ${rec.scope}`, left + 18, y + 62, {
          width: width - 36,
          height: 22,
        });
      if (rec.alternatives.length > 0) {
        doc
          .fontSize(8)
          .fillColor(MUTED)
          .text(
            `Otras opciones: ${rec.alternatives.join(', ')}.`,
            left + 18,
            y + 88,
            {
              width: width - 36,
              lineBreak: false,
            },
          );
      }
    } else {
      doc
        .font(BODY)
        .fontSize(10)
        .fillColor(TEXT)
        .text(summary.noRecommendation ?? '', left + 18, y + 30, {
          width: width - 36,
        });
    }
    y += boxH + 18;

    // How the report is organized: its sections, in order.
    doc
      .font(BOLD)
      .fontSize(9)
      .fillColor(TEXT)
      .text('Cómo leer este reporte', left, y);
    y += 14;
    const colGap = 16;
    const colW = (width - colGap) / 2;
    const rows = Math.ceil(summary.sections.length / 2);
    summary.sections.forEach((section, i) => {
      // Down the first column, then the second: the reading order.
      const x = left + Math.floor(i / rows) * (colW + colGap);
      const rowY = y + (i % rows) * 21;
      doc
        .font(BOLD)
        .fontSize(7.6)
        .fillColor(AZUL_INK)
        .text(`${String(i + 1)}. ${section.title}: `, x, rowY, {
          width: colW,
          continued: true,
        })
        .font(BODY)
        .fillColor(TEXT)
        .text(section.text);
    });
    doc.x = left;
    doc.y = y + rows * 21 + 6;
  }

  /**
   * The route as a line of phases: a numbered node per phase, joined by a
   * line, each with its service (outlined in amber when it is only the
   * closest available) and the rise of each dimension it works.
   */
  private drawTimeline(
    doc: PDFKit.PDFDocument,
    phases: Extract<ReportBlock, { kind: 'timeline' }>['phases'],
  ): void {
    const left = doc.page.margins.left;
    const width = this.width(doc);
    const perRow = Math.min(4, phases.length);
    const step = width / perRow;
    for (let start = 0; start < phases.length; start += perRow) {
      const row = phases.slice(start, start + perRow);
      const tallest = Math.max(...row.map((p) => p.steps.length));
      this.ensureRoom(doc, 120 + tallest * 14);
      const nodeY = doc.y + 16;
      if (row.length > 1) {
        doc
          .moveTo(left + step / 2, nodeY)
          .lineTo(left + (row.length - 1) * step + step / 2, nodeY)
          .lineWidth(2)
          .strokeColor(HAIRLINE)
          .stroke();
      }
      row.forEach((phase, i) => {
        const x = left + i * step + step / 2;
        const colX = left + i * step + 6;
        const colW = step - 12;
        doc.circle(x, nodeY, 13).fill(AZUL_ICESI);
        doc
          .font(BOLD)
          .fontSize(11)
          .fillColor('#FFFFFF')
          .text(String(phase.order), x - 13, nodeY - 6, {
            width: 26,
            align: 'center',
            lineBreak: false,
          });
        let y = nodeY + 22;
        doc
          .font(BOLD)
          .fontSize(9)
          .fillColor(TEXT)
          .text(`Fase ${String(phase.order)}`, colX, y, {
            width: colW,
            align: 'center',
            lineBreak: false,
          });
        y += 14;
        doc
          .roundedRect(colX, y, colW, 52, 6)
          .lineWidth(1)
          .fillAndStroke(
            phase.approximate ? '#FFFFFF' : WASH,
            phase.approximate ? APPROXIMATE : AZUL_ICESI,
          );
        doc
          .font(BOLD)
          .fontSize(8.5)
          .fillColor(TEXT)
          .text(
            phase.service ?? 'Sin servicio del portafolio',
            colX + 6,
            y + 8,
            {
              width: colW - 12,
              align: 'center',
              height: 24,
            },
          );
        doc
          .font(BODY)
          .fontSize(7.5)
          .fillColor(phase.approximate ? APPROXIMATE : MUTED)
          .text(
            phase.tier
              ? `${phase.tier}${phase.approximate ? '  |  el más cercano disponible' : ''}`
              : '',
            colX + 6,
            y + 34,
            { width: colW - 12, align: 'center', lineBreak: false },
          );
        y += 62;
        for (const s of phase.steps) {
          doc
            .circle(colX + 6, y + 4.5, 3)
            .fill(DIMENSION_FILL[s.dimensionCode]);
          doc
            .font(BOLD)
            .fontSize(8)
            .fillColor(TEXT)
            .text(
              `${s.label}: ${String(s.from)} a ${String(s.to)}`,
              colX + 14,
              y,
              {
                width: colW - 14,
                lineBreak: false,
              },
            );
          y += 14;
        }
      });
      doc.x = left;
      doc.y = nodeY + 106 + tallest * 14;
    }
  }

  /** Starts a new page when `height` does not fit in what is left of this one. */
  private ensureRoom(doc: PDFKit.PDFDocument, height: number): void {
    if (doc.y + height > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
    }
  }

  /**
   * The six levels on the 1–9 scale around (`cx`, `cy`): rings at 3, 6 and
   * 9, the profile in Azul Icesi over a 15% wash, each point in its
   * dimension's tone and named outside the ring with its level.
   */
  private radarAt(
    doc: PDFKit.PDFDocument,
    points: readonly {
      readonly dimensionCode: DimensionCode;
      readonly label: string;
      readonly level: number;
    }[],
    cx: number,
    cy: number,
    radius: number,
    labelSize: number,
  ): void {
    const n = points.length;
    const at = (i: number, level: number): [number, number] => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      const r = (radius * level) / 9;
      return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
    };

    for (const ring of [3, 6, 9]) {
      doc
        .polygon(...points.map((_, i) => at(i, ring)))
        .lineWidth(0.6)
        .strokeColor(HAIRLINE)
        .stroke();
    }
    points.forEach((_, i) => {
      const [x, y] = at(i, 9);
      doc
        .moveTo(cx, cy)
        .lineTo(x, y)
        .lineWidth(0.6)
        .strokeColor(HAIRLINE)
        .stroke();
    });
    const shape = points.map((p, i) => at(i, p.level));
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
    points.forEach((p, i) => {
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
    doc.font(BODY).fontSize(labelSize).fillColor(TEXT);
    points.forEach((p, i) => {
      const [x, y] = at(i, 10.4);
      const label = `${p.label}: ${String(p.level)}`;
      const w = doc.widthOfString(label) + 2;
      const lx = x < cx - 4 ? x - w : x > cx + 4 ? x : x - w / 2;
      doc.text(label, lx, y - 5, { width: w, lineBreak: false });
    });
  }

  /**
   * An imbalanced pair as a card, as on screen: its name and severity, its two
   * dimensions with their level as a 1–9 bar, how far apart they are, what to
   * do and what the initiative risks. A critical pair carries the attention
   * tone and mark: never the color alone.
   */
  private drawPair(
    doc: PDFKit.PDFDocument,
    block: Extract<ReportBlock, { kind: 'pair' }>,
  ): void {
    const left = doc.page.margins.left;
    const width = this.width(doc);
    const pad = 12;
    const inner = width - 2 * pad;
    doc.font(BODY).fontSize(9.5);
    const textH =
      doc.heightOfString(block.headline, { width: inner }) +
      doc.heightOfString(block.advice, { width: inner }) +
      (block.risk
        ? doc.heightOfString(`Riesgo: ${block.risk}`, { width: inner }) + 8
        : 0);
    const height = 34 + 32 + textH + 14;
    this.ensureRoom(doc, height + 10);
    const top = doc.y;
    const tone = block.critical ? ATTENTION : TEXT;

    doc
      .roundedRect(left, top, width, height, 6)
      .lineWidth(1)
      .strokeColor(block.critical ? ATTENTION : HAIRLINE)
      .stroke();
    let x = left + pad;
    if (block.critical) {
      this.attentionMark(doc, x + 6, top + 15);
      x += 18;
    }
    doc
      .font(BOLD)
      .fontSize(7.5)
      .fillColor(tone)
      .text(block.severity.toUpperCase(), x, top + 10, {
        characterSpacing: 0.4,
        lineBreak: false,
      });
    doc
      .fontSize(10.5)
      .fillColor(TEXT)
      .text(block.title, left + pad, top + 21, {
        width: inner,
        lineBreak: false,
      });

    // The two dimensions side by side, each with its 1–9 bar.
    const colW = (inner - 16) / 2;
    const barsY = top + 40;
    block.dimensions.forEach((d, i) => {
      const cx = left + pad + i * (colW + 16);
      doc
        .font(BOLD)
        .fontSize(8.5)
        .fillColor(DIMENSION_EDGE[d.dimensionCode])
        .text(d.label, cx, barsY, { width: colW - 24, lineBreak: false });
      doc.fillColor(TEXT).text(String(d.level), cx + colW - 20, barsY, {
        width: 20,
        align: 'right',
        lineBreak: false,
      });
      const cell = colW / 9;
      for (let level = 1; level <= 9; level += 1) {
        const rx = cx + (level - 1) * cell;
        doc
          .rect(rx, barsY + 12, cell - 2, 6)
          .fill(level <= d.level ? DIMENSION_FILL[d.dimensionCode] : TRACK);
        if (d.dimensionCode === 'FRL' && level <= d.level) {
          doc
            .rect(rx, barsY + 12, cell - 2, 6)
            .lineWidth(0.5)
            .strokeColor(DIMENSION_EDGE.FRL)
            .stroke();
        }
      }
    });

    let y = top + 34 + 32;
    doc
      .font(BOLD)
      .fontSize(9.5)
      .fillColor(TEXT)
      .text(block.headline, left + pad, y, { width: inner });
    y = doc.y;
    doc
      .font(BODY)
      .fillColor(MUTED)
      .text(block.advice, left + pad, y, { width: inner });
    if (block.risk) {
      y = doc.y + 4;
      doc
        .moveTo(left + pad, y)
        .lineTo(left + width - pad, y)
        .lineWidth(0.5)
        .strokeColor(HAIRLINE)
        .stroke();
      doc
        .font(BOLD)
        .fillColor(tone)
        .text('Riesgo: ', left + pad, y + 4, { width: inner, continued: true })
        .font(BODY)
        .fillColor(TEXT)
        .text(block.risk);
    }
    doc.x = left;
    doc.y = top + height + 10;
  }

  /**
   * Where the route leaves each dimension, drawn as the summary page and the
   * application draw it (usability test P02): a bar of nine segments, solid
   * up to today's level and a soft tone up to where the route leaves it, with
   * how much it goes up.
   */
  private drawRoute(
    doc: PDFKit.PDFDocument,
    block: Extract<ReportBlock, { kind: 'route' }>,
  ): void {
    const rowHeight = 22;
    const labelWidth = 130;
    const riseWidth = 44;
    this.ensureRoom(doc, rowHeight * block.rows.length + 52);
    const left = doc.page.margins.left;
    const scaleLeft = left + labelWidth;
    const scaleWidth = this.width(doc) - labelWidth - riseWidth;
    const cell = scaleWidth / 9;
    let y = doc.y + 4;

    doc.font(BOLD).fontSize(8).fillColor(MUTED);
    doc.text('Dimensión', left, y, { width: labelWidth - 8, lineBreak: false });
    doc.text('Nivel, de 1 a 9', scaleLeft, y, {
      width: scaleWidth,
      lineBreak: false,
    });
    doc.text('Sube', scaleLeft + scaleWidth, y, {
      width: riseWidth,
      align: 'right',
      lineBreak: false,
    });
    y += 14;

    for (const row of block.rows) {
      const rise = row.end - row.today;
      doc
        .font(BOLD)
        .fontSize(9)
        .fillColor(DIMENSION_EDGE[row.dimensionCode])
        .text(row.label, left, y + 3, {
          width: labelWidth - 8,
          lineBreak: false,
        });
      for (let level = 1; level <= 9; level += 1) {
        const x = scaleLeft + (level - 1) * cell;
        if (level <= row.today) {
          doc
            .rect(x, y + 2, cell - 2, 11)
            .fill(DIMENSION_FILL[row.dimensionCode]);
        } else if (level <= row.end) {
          doc
            .rect(x, y + 2, cell - 2, 11)
            .fillOpacity(0.35)
            .fill(DIMENSION_FILL[row.dimensionCode])
            .fillOpacity(1);
        } else {
          doc.rect(x, y + 2, cell - 2, 11).fill(TRACK);
        }
      }
      if (row.dimensionCode === 'FRL') {
        // The yellow is too light on white: its filled cells get an edge.
        for (let level = 1; level <= Math.max(row.today, row.end); level += 1) {
          doc
            .rect(scaleLeft + (level - 1) * cell, y + 2, cell - 2, 11)
            .lineWidth(0.5)
            .strokeColor(DIMENSION_EDGE.FRL)
            .stroke();
        }
      }
      doc
        .font(BOLD)
        .fontSize(9)
        .fillColor(rise > 0 ? ACCEPTABLE : MUTED)
        .text(
          rise > 0 ? `+${String(rise)}` : 'igual',
          scaleLeft + scaleWidth,
          y + 3,
          {
            width: riseWidth,
            align: 'right',
            lineBreak: false,
          },
        );
      y += rowHeight;
    }

    // Legend: the two tones, drawn, with what they mean.
    y += 4;
    doc.rect(scaleLeft, y + 1, 16, 7).fill(TEXT);
    doc
      .font(BODY)
      .fontSize(8.5)
      .fillColor(MUTED)
      .text('Hoy', scaleLeft + 22, y, { lineBreak: false });
    doc
      .rect(scaleLeft + 52, y + 1, 16, 7)
      .fillOpacity(0.25)
      .fill(TEXT)
      .fillOpacity(1);
    doc
      .fillColor(MUTED)
      .text('Lo que sube con la ruta', scaleLeft + 74, y, { lineBreak: false });
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
      .font(BOLD)
      .fontSize(11.5)
      .fillColor(TEXT)
      .text(block.title, left + 10, titleTop, { width: width - 10 });
    doc.moveDown(0.4);

    for (const row of block.rows) {
      const statement = `${String(row.sequence)}. ${row.text}`;
      const note = row.justification
        ? `Justificación: ${row.justification}`
        : null;
      doc.font(BODY).fontSize(9.5);
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
        .font(BODY)
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
        .font(BOLD)
        .fontSize(8.5)
        .fillColor(TEXT)
        .text(`${String(row.value)} de 5`, scaleLeft, top + 18, {
          width: scaleWidth,
          lineBreak: false,
        });
      doc
        .font(BODY)
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
        .font(BODY)
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
