import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import crypto from 'crypto';



type SimulationInput = {
  principal: number;
  annualRate: number;      // e.g. 0.05
  months: number;          // e.g. 12
  monthlyContribution: number; // e.g. 0
  title?: string;
  subtitle?: string;
  executiveSummary?: string;
  keyFindings?: string[];
  assumptions?: string[];
  contextHighlights?: string[];
};

type NarrativePdfInput = {
  title: string;
  subtitle?: string;
  sections?: Array<{ heading: string; body: string }>;
  style?: 'corporativo' | 'minimalista' | 'tecnico';
  source?: 'simulation' | 'analysis' | 'diagnostic';
  tables?: Array<{
    title: string;
    columns: string[];
    rows: Array<Array<string | number>>;
    align?: Array<'left' | 'center' | 'right'>;
  }>;
  charts?: Array<{
    title: string;
    subtitle?: string;
    kind?: 'line' | 'bar' | 'area';
    labels: string[];
    values: number[];
  }>;
};

type NarrativeStyle = 'corporativo' | 'minimalista' | 'tecnico';

type ReportTheme = {
  heading: string;
  text: string;
  muted: string;
  accent: string;
  divider: string;
  tableHeaderBg: string;
  tableBorder: string;
  chartLine: string;
  chartArea: string;
};

export type SimulationArtifact = {
  id: string;
  type: 'pdf';
  title: string;
  description?: string;
  fileUrl: string;
  previewImageUrl: string;
  source: 'simulation' | 'analysis' | 'diagnostic';
  createdAt: string;
  saved?: boolean;
  meta?: Record<string, any>;
};

function findRepoRoot(start: string) {
  let cur = start;
  for (let i = 0; i < 10; i++) {
    const candidate = path.join(cur, 'pnpm-workspace.yaml');
    if (fs.existsSync(candidate)) return cur;
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return start;
}

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function monthlySeries(input: SimulationInput) {
  const r = input.annualRate / 12;
  const values: number[] = [];
  let balance = input.principal;

  for (let m = 1; m <= input.months; m++) {
    // aporte al inicio del mes
    balance += input.monthlyContribution;
    // interés mensual
    balance *= (1 + r);
    values.push(balance);
  }
  return values;
}

async function renderChartPng(labels: string[], data: number[]) {
  const width = 1200;
  const height = 700;
  const chart = new ChartJSNodeCanvas({ width, height, backgroundColour: 'white' });

  const cfg = {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Saldo proyectado',
          data,
          borderWidth: 3,
          pointRadius: 0,
          tension: 0.25,
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: false },
        title: { display: false },
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          ticks: {
            callback: (v: any) => {
              const n = Number(v);
              if (Number.isFinite(n)) return n.toLocaleString('es-CL');
              return v;
            },
          },
        },
      },
    },
  } as any;

  return chart.renderToBuffer(cfg);
}

function formatCLP(n: number) {
  // no es CLP necesariamente, pero el formato ejecutivo ayuda
  return Math.round(n).toLocaleString('es-CL');
}

function normalizeLines(lines?: string[], fallback: string[] = []) {
  const safe = Array.isArray(lines)
    ? lines
        .filter((x) => typeof x === 'string' && x.trim().length > 0)
        .map((x) => x.trim())
    : [];
  return safe.length > 0 ? safe : fallback;
}

function ensureSpace(doc: any, needed = 80) {
  const maxY = doc.page.height - doc.page.margins.bottom;
  if (doc.y + needed > maxY) {
    doc.addPage();
  }
}

function getReportTheme(style: NarrativeStyle): ReportTheme {
  if (style === 'minimalista') {
    return {
      heading: '#111111',
      text: '#202020',
      muted: '#666666',
      accent: '#444444',
      divider: '#d4d4d4',
      tableHeaderBg: '#f5f5f5',
      tableBorder: '#c9c9c9',
      chartLine: 'rgba(75,85,99,0.95)',
      chartArea: 'rgba(107,114,128,0.24)',
    };
  }
  if (style === 'tecnico') {
    return {
      heading: '#0b1f4d',
      text: '#102a43',
      muted: '#486581',
      accent: '#1f6feb',
      divider: '#8bb4ff',
      tableHeaderBg: '#eaf2ff',
      tableBorder: '#9ab8e5',
      chartLine: 'rgba(31,111,235,0.95)',
      chartArea: 'rgba(31,111,235,0.22)',
    };
  }
  return {
    heading: '#0f172a',
    text: '#1f2937',
    muted: '#475569',
    accent: '#2563eb',
    divider: '#8aa0bf',
    tableHeaderBg: '#eef2ff',
    tableBorder: '#8ea0ba',
    chartLine: 'rgba(37,99,235,0.9)',
    chartArea: 'rgba(59,130,246,0.22)',
  };
}

function writeSectionTitle(doc: any, title: string, theme?: ReportTheme) {
  ensureSpace(doc, 40);
  doc.moveDown(0.6);
  doc
    .fillColor(theme?.heading ?? '#0f172a')
    .font('Helvetica-Bold')
    .fontSize(11)
    .text(title.toUpperCase());
  doc.moveDown(0.2);
}

function writeBullets(doc: any, lines: string[], theme?: ReportTheme) {
  for (const line of lines) {
    ensureSpace(doc, 28);
    doc
      .fillColor(theme?.text ?? '#1f2937')
      .font('Helvetica')
      .fontSize(10)
      .text(`- ${line}`, { lineGap: 2 });
  }
}

function formatMetricValue(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return Math.round(value).toLocaleString('es-CL');
}

function summarizeSeries(values: number[]) {
  const safe = values.filter((v) => Number.isFinite(v));
  if (safe.length === 0) {
    return {
      start: 0,
      end: 0,
      min: 0,
      max: 0,
      delta: 0,
      trend: 'estable',
    };
  }
  const start = safe[0];
  const end = safe[safe.length - 1];
  const min = Math.min(...safe);
  const max = Math.max(...safe);
  const delta = end - start;
  const trend = delta > 0 ? 'al alza' : delta < 0 ? 'a la baja' : 'estable';
  return { start, end, min, max, delta, trend };
}

function buildChartNarrative(args: {
  title: string;
  subtitle?: string;
  labels: string[];
  values: number[];
}) {
  const series = summarizeSeries(args.values);
  const fromLabel = args.labels[0] ?? 'inicio';
  const toLabel = args.labels[args.labels.length - 1] ?? 'cierre';
  const absDelta = Math.abs(series.delta);
  const pct =
    series.start !== 0
      ? ((series.delta / series.start) * 100).toFixed(1)
      : '0.0';

  const lead =
    args.subtitle?.trim() ||
    `El grafico "${args.title}" resume la evolucion entre ${fromLabel} y ${toLabel}.`;
  const detail = `Se observa una trayectoria ${series.trend}, con inicio en ${formatMetricValue(
    series.start
  )}, cierre en ${formatMetricValue(series.end)} y variacion de ${formatMetricValue(
    absDelta
  )} (${pct}%).`;
  const range = `Rango observado: minimo ${formatMetricValue(
    series.min
  )} y maximo ${formatMetricValue(series.max)}.`;

  return `${lead} ${detail} ${range}`;
}

function writeNarrativeCoverPage(args: {
  doc: any;
  title: string;
  subtitle: string;
  style: NarrativeStyle;
  source: 'simulation' | 'analysis' | 'diagnostic';
  createdAt: Date;
  theme: ReportTheme;
}) {
  const { doc, title, subtitle, style, source, createdAt, theme } = args;

  doc
    .fillColor(theme.heading)
    .font('Helvetica-Bold')
    .fontSize(28)
    .text(title, { align: 'left', lineGap: 2 });
  doc.moveDown(0.6);

  doc
    .fillColor(theme.muted)
    .font('Helvetica')
    .fontSize(12)
    .text(subtitle, { align: 'left', lineGap: 2 });

  doc.moveDown(1.4);
  doc
    .lineWidth(1)
    .strokeColor(theme.divider)
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke();
  doc.moveDown(1);

  doc
    .fillColor(theme.heading)
    .font('Helvetica-Bold')
    .fontSize(11)
    .text('Ficha del documento');
  doc.moveDown(0.3);

  const sourceLabel =
    source === 'diagnostic'
      ? 'Diagnostico'
      : source === 'simulation'
      ? 'Simulacion'
      : 'Analisis';

  const metadataRows = [
    ['Tipo de informe', sourceLabel],
    ['Estilo', style],
    ['Fecha de emision', createdAt.toLocaleDateString('es-CL')],
    ['Hora de emision', createdAt.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })],
  ];

  for (const [label, value] of metadataRows) {
    doc
      .fillColor(theme.muted)
      .font('Helvetica')
      .fontSize(9.2)
      .text(label.toUpperCase());
    doc
      .fillColor(theme.text)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(value);
    doc.moveDown(0.45);
  }

  doc.moveDown(0.6);
  doc
    .fillColor(theme.muted)
    .font('Helvetica')
    .fontSize(9)
    .text(
      'Documento generado automaticamente a partir de la conversacion, contexto estructurado y evidencia disponible.',
      { lineGap: 2 }
    );
}

function writeGeneralIndexPage(args: {
  doc: any;
  theme: ReportTheme;
  sections: Array<{ heading: string; body: string }>;
  charts: Array<{ title: string }>;
  tables: Array<{ title: string }>;
}) {
  const { doc, theme, sections, charts, tables } = args;

  doc
    .fillColor(theme.heading)
    .font('Helvetica-Bold')
    .fontSize(18)
    .text('Indice general');
  doc.moveDown(0.35);
  doc
    .fillColor(theme.muted)
    .font('Helvetica')
    .fontSize(10)
    .text(
      'Vista resumida del contenido del informe para lectura ejecutiva y navegacion rapida.',
      { lineGap: 2 }
    );
  doc.moveDown(0.7);

  writeSectionTitle(doc, 'Secciones narrativas', theme);
  if (sections.length === 0) {
    writeBullets(doc, ['No se incluyeron secciones narrativas.'], theme);
  } else {
    const lines = sections.slice(0, 12).map((s, idx) => `${idx + 1}. ${s.heading}`);
    writeBullets(doc, lines, theme);
  }

  writeSectionTitle(doc, 'Graficos incluidos', theme);
  if (charts.length === 0) {
    writeBullets(doc, ['No se incluyeron graficos en este documento.'], theme);
  } else {
    const lines = charts.slice(0, 12).map((c, idx) => `${idx + 1}. ${c.title}`);
    writeBullets(doc, lines, theme);
  }

  writeSectionTitle(doc, 'Tablas incluidas', theme);
  if (tables.length === 0) {
    writeBullets(doc, ['No se incluyeron tablas en este documento.'], theme);
  } else {
    const lines = tables.slice(0, 12).map((t, idx) => `${idx + 1}. ${t.title}`);
    writeBullets(doc, lines, theme);
  }
}

function writeChartIndexPage(args: {
  doc: any;
  theme: ReportTheme;
  charts: Array<{
    title: string;
    subtitle?: string;
    kind?: 'line' | 'bar' | 'area';
    labels: string[];
    values: number[];
  }>;
}) {
  const { doc, charts, theme } = args;
  if (charts.length === 0) return;

  doc
    .fillColor(theme.heading)
    .font('Helvetica-Bold')
    .fontSize(18)
    .text('Indice de graficos');
  doc.moveDown(0.35);
  doc
    .fillColor(theme.muted)
    .font('Helvetica')
    .fontSize(10)
    .text(
      'Resumen ejecutivo de visualizaciones incluidas en el informe para lectura rapida y trazabilidad del analisis.'
    );
  doc.moveDown(0.8);

  charts.forEach((chart, idx) => {
    ensureSpace(doc, 90);
    doc
      .fillColor(theme.text)
      .font('Helvetica-Bold')
      .fontSize(11.5)
      .text(`${idx + 1}. ${chart.title}`);

    const pairs = Math.min(chart.labels.length, chart.values.length);
    const typeLabel =
      chart.kind === 'area' ? 'Area' : chart.kind === 'bar' ? 'Barras' : 'Linea';
    const summary = summarizeSeries(chart.values.slice(0, pairs));
    doc
      .fillColor(theme.muted)
      .font('Helvetica')
      .fontSize(9.5)
      .text(
        `${chart.subtitle?.trim() || 'Sin subtitulo explicito.'} Tipo: ${typeLabel}. Puntos: ${pairs}. Tendencia: ${
          summary.trend
        }.`,
        { lineGap: 1.5 }
      );
    doc.moveDown(0.55);
  });
}

function asCellText(value: string | number | undefined): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toLocaleString('es-CL');
  }
  if (typeof value === 'string') return value;
  return '';
}

function isNumericCell(value: string | number | undefined): boolean {
  if (typeof value === 'number' && Number.isFinite(value)) return true;
  if (typeof value !== 'string') return false;
  return /^[$]?\s*[\d.,-]+$/.test(value.trim());
}

function drawNarrativeTable(
  doc: any,
  table: {
    title: string;
    columns: string[];
    rows: Array<Array<string | number>>;
    align?: Array<'left' | 'center' | 'right'>;
  },
  theme?: ReportTheme
) {
  if (!Array.isArray(table.columns) || table.columns.length === 0) return;

  writeSectionTitle(doc, table.title, theme);

  const columns = table.columns.slice(0, 6);
  const rows = Array.isArray(table.rows) ? table.rows.slice(0, 18) : [];
  const colCount = columns.length;
  const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colWidth = usableWidth / colCount;
  const rowHeight = 22;

  const drawRow = (
    y: number,
    cells: Array<string | number>,
    opts: { isHeader?: boolean } = {}
  ) => {
    const isHeader = Boolean(opts.isHeader);
    for (let i = 0; i < colCount; i += 1) {
      const x = doc.page.margins.left + i * colWidth;
      const raw = i < cells.length ? cells[i] : '';
      const text = asCellText(raw);
      const alignFromInput = table.align?.[i];
      const align =
        alignFromInput ??
        (isNumericCell(raw) ? 'right' : 'left');

      doc
        .save()
        .lineWidth(0.6)
        .strokeColor(theme?.tableBorder ?? 'rgba(120, 134, 162, 0.45)')
        .fillColor(isHeader ? theme?.tableHeaderBg ?? '#eef2ff' : '#ffffff')
        .rect(x, y, colWidth, rowHeight)
        .fillAndStroke();

      doc
        .fillColor(isHeader ? theme?.heading ?? '#0f172a' : theme?.text ?? '#1f2937')
        .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(isHeader ? 9 : 8.8)
        .text(text, x + 6, y + 6, {
          width: colWidth - 12,
          align: align as 'left' | 'center' | 'right',
          lineBreak: false,
          ellipsis: true,
        });
      doc.restore();
    }
  };

  ensureSpace(doc, rowHeight * 2);
  drawRow(doc.y, columns, { isHeader: true });
  doc.y += rowHeight;

  for (const row of rows) {
    ensureSpace(doc, rowHeight + 4);
    drawRow(doc.y, row);
    doc.y += rowHeight;
  }

  doc.moveDown(0.8);
}

async function renderNarrativeChartPng(args: {
  title: string;
  labels: string[];
  values: number[];
  kind?: 'line' | 'bar' | 'area';
  theme?: ReportTheme;
}) {
  const width = 1200;
  const height = 620;
  const chart = new ChartJSNodeCanvas({ width, height, backgroundColour: 'white' });
  const kind = args.kind ?? 'line';

  const cfg = {
    type: kind === 'area' ? 'line' : kind,
    data: {
      labels: args.labels,
      datasets: [
        {
          label: args.title,
          data: args.values,
          borderWidth: 2.5,
          pointRadius: 0,
          tension: 0.22,
          fill: kind === 'area',
          backgroundColor:
            kind === 'area'
              ? args.theme?.chartArea ?? 'rgba(59,130,246,0.22)'
              : args.theme?.chartLine ?? 'rgba(37,99,235,0.82)',
          borderColor: args.theme?.chartLine ?? 'rgba(37,99,235,0.9)',
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          ticks: {
            callback: (v: any) => {
              const n = Number(v);
              if (Number.isFinite(n)) return n.toLocaleString('es-CL');
              return v;
            },
          },
        },
      },
    },
  } as any;

  return chart.renderToBuffer(cfg);
}

async function drawNarrativeChartSection(args: {
  doc: any;
  index: number;
  total: number;
  theme: ReportTheme;
  chart: {
    title: string;
    subtitle?: string;
    kind?: 'line' | 'bar' | 'area';
    labels: string[];
    values: number[];
  };
}) {
  const { doc, chart, index, total, theme } = args;
  const pairs = Math.min(chart.labels.length, chart.values.length);
  if (pairs === 0) return;

  const labels = chart.labels.slice(0, Math.min(48, pairs));
  const values = chart.values.slice(0, labels.length);
  if (values.length === 0) return;

  // Keep each chart block visually grouped.
  ensureSpace(doc, 360);
  writeSectionTitle(doc, `Grafico ${index + 1} de ${total}: ${chart.title}`, theme);

  const explanation = buildChartNarrative({
    title: chart.title,
    subtitle: chart.subtitle,
    labels,
    values,
  });
  doc.fillColor(theme.muted).font('Helvetica').fontSize(9.6).text(explanation, {
    lineGap: 2,
  });
  doc.moveDown(0.3);

  const png = await renderNarrativeChartPng({
    title: chart.title,
    labels,
    values,
    kind: chart.kind,
    theme,
  });
  ensureSpace(doc, 250);
  doc.image(png, { fit: [495, 235], align: 'center' });
  doc.moveDown(0.55);

  const summary = summarizeSeries(values);
  const bullets = [
    `Inicio: ${formatMetricValue(summary.start)} · Cierre: ${formatMetricValue(summary.end)}`,
    `Variacion total: ${formatMetricValue(summary.delta)} · Tendencia: ${summary.trend}`,
    `Minimo: ${formatMetricValue(summary.min)} · Maximo: ${formatMetricValue(summary.max)}`,
  ];
  writeBullets(doc, bullets, theme);
}

export async function generateSimulationPdf(input: SimulationInput): Promise<SimulationArtifact> {
  const now = new Date();
  const createdAt = now.toISOString();
  const id = `sim-${now.toISOString().slice(0,10)}-${crypto.randomUUID().slice(0,8)}`;


  const repoRoot = findRepoRoot(process.cwd());
  const outDir = path.join(repoRoot, 'apps/web/public/pdfs/simulaciones');
  ensureDir(outDir);

  const months = input.months ?? 12;
  const labels = Array.from({ length: months }, (_, i) => `Mes ${i + 1}`);
  const series = monthlySeries({ ...input, months });

  const png = await renderChartPng(labels, series);
  const pngName = `${id}.png`;
  const pdfName = `${id}.pdf`;

  fs.writeFileSync(path.join(outDir, pngName), png);

  const title = input.title ?? 'Simulación ejecutiva';
  const subtitle =
    input.subtitle ??
    `Horizonte ${months} meses · Tasa anual ${(input.annualRate * 100).toFixed(2)}% · Aporte mensual ${formatCLP(input.monthlyContribution)}`;
  const executiveSummary =
    input.executiveSummary ??
    `Proyeccion a ${months} meses con capital inicial ${formatCLP(input.principal)}, aporte mensual ${formatCLP(
      input.monthlyContribution
    )} y tasa anual ${(input.annualRate * 100).toFixed(2)}%.`;
  const keyFindings = normalizeLines(input.keyFindings, [
    `Capital proyectado al cierre: ${formatCLP(series[series.length - 1] ?? input.principal)}.`,
    `Variacion estimada sobre capital inicial: ${formatCLP((series[series.length - 1] ?? input.principal) - input.principal)}.`,
  ]);
  const assumptions = normalizeLines(input.assumptions, [
    'Capitalizacion mensual con tasa constante.',
    'No incluye inflacion, impuestos ni comisiones.',
  ]);
  const contextHighlights = normalizeLines(input.contextHighlights, []);

  // PDF editorial simple pero pro (A4, márgenes, jerarquía)
  const doc = new PDFDocument({ size: 'A4', margin: 54 });
  const pdfPath = path.join(outDir, pdfName);
  const stream = fs.createWriteStream(pdfPath);
  doc.pipe(stream);

  // Header
  doc.font('Helvetica-Bold').fontSize(20).text(title, { align: 'left' });
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(11).fillColor('#333333').text(subtitle);
  doc.moveDown(1);

  // KPI row
  const start = input.principal;
  const end = series[series.length - 1];
  const gain = end - start;

  doc.fillColor('#000000');
  doc.font('Helvetica-Bold').fontSize(11).text(`Capital inicial: ${formatCLP(start)}`);
  doc.font('Helvetica-Bold').fontSize(11).text(`Capital proyectado: ${formatCLP(end)}`);
  doc.font('Helvetica').fontSize(11).fillColor('#333333').text(`Ganancia estimada: ${formatCLP(gain)}`);
  doc.moveDown(1);

  // Chart image (fit within page)
  const imgPath = path.join(outDir, pngName);
  doc.image(imgPath, { fit: [495, 280], align: 'center' });

  writeSectionTitle(doc, 'Resumen ejecutivo');
  doc.fillColor('#111827').font('Helvetica').fontSize(10).text(executiveSummary, { lineGap: 3 });

  writeSectionTitle(doc, 'Hallazgos clave');
  writeBullets(doc, keyFindings.slice(0, 6));

  writeSectionTitle(doc, 'Supuestos del informe');
  writeBullets(doc, assumptions.slice(0, 6));

  if (contextHighlights.length > 0) {
    writeSectionTitle(doc, 'Continuidad con conversacion previa');
    writeBullets(doc, contextHighlights.slice(0, 6));
  }

  writeSectionTitle(doc, 'Nota metodologica');
  doc
    .fillColor('#4b5563')
    .font('Helvetica')
    .fontSize(9)
    .text(
      'Proyeccion deterministica con capitalizacion mensual. Los resultados son referenciales y deben complementarse con criterios de riesgo, liquidez y objetivos personales.',
      { align: 'left', lineGap: 2 }
    );

  doc.end();

  await new Promise<void>((resolve, reject) => {
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });

  return {
    id,
    type: 'pdf',
    title: /(\bmes|\bmonth)/i.test(title) ? title : `${title}: ${months} meses`,
    description: subtitle,
    fileUrl: `/pdfs/simulaciones/${pdfName}`,
    previewImageUrl: `/pdfs/simulaciones/${pngName}`,
    source: 'analysis',
    createdAt,
    saved: false,
    meta: {
      principal: input.principal,
      annualRate: input.annualRate,
      monthlyContribution: input.monthlyContribution,
      months,
      projectedEnd: end,
      executiveSummary,
      keyFindings,
      assumptions,
      contextHighlights,
    },
  };
}

export async function generateNarrativePdf(
  input: NarrativePdfInput
): Promise<SimulationArtifact> {
  const now = new Date();
  const createdAt = now.toISOString();
  const id = `rep-${now.toISOString().slice(0, 10)}-${crypto.randomUUID().slice(0, 8)}`;

  const repoRoot = findRepoRoot(process.cwd());
  const outDir = path.join(repoRoot, 'apps/web/public/pdfs/simulaciones');
  ensureDir(outDir);

  const pdfName = `${id}.pdf`;
  const pdfPath = path.join(outDir, pdfName);

  const doc = new PDFDocument({ size: 'A4', margin: 54, bufferPages: true });
  const stream = fs.createWriteStream(pdfPath);
  doc.pipe(stream);

  const subtitle =
    input.subtitle ??
    `Informe generado ${now.toLocaleDateString('es-CL')} · Formato ${input.style ?? 'corporativo'}`;
  const style: NarrativeStyle = input.style ?? 'corporativo';
  const theme = getReportTheme(style);

  const sections =
    Array.isArray(input.sections) && input.sections.length > 0
      ? input.sections
      : [
          {
            heading: 'Resumen ejecutivo',
            body: 'Documento narrativo generado en base al contexto del usuario y del chat.',
          },
        ];
  const tables = Array.isArray(input.tables) ? input.tables.slice(0, 4) : [];
  const charts = Array.isArray(input.charts) ? input.charts.slice(0, 3) : [];

  writeNarrativeCoverPage({
    doc,
    title: input.title,
    subtitle,
    style,
    source: input.source ?? 'analysis',
    createdAt: now,
    theme,
  });

  doc.addPage();
  writeGeneralIndexPage({
    doc,
    theme,
    sections,
    charts: charts.map((c) => ({ title: c.title })),
    tables: tables.map((t) => ({ title: t.title })),
  });

  if (charts.length > 0) {
    doc.addPage();
    writeChartIndexPage({ doc, charts, theme });
  }

  doc.addPage();
  doc.fillColor(theme.heading).font('Helvetica-Bold').fontSize(18).text('Desarrollo del informe', {
    align: 'left',
  });
  doc.moveDown(0.35);
  doc.fillColor(theme.muted).font('Helvetica').fontSize(10).text(
    'A continuacion se presentan secciones narrativas, graficos y tablas consolidadas para la toma de decisiones.',
    { lineGap: 2 }
  );
  doc.moveDown(0.8);

  for (const sec of sections.slice(0, 10)) {
    ensureSpace(doc, 80);
    doc.fillColor(theme.heading).font('Helvetica-Bold').fontSize(12).text(sec.heading.toUpperCase());
    doc.moveDown(0.2);
    doc.fillColor(theme.text).font('Helvetica').fontSize(10).text(sec.body, { lineGap: 3 });
    doc.moveDown(0.7);
  }

  for (const [index, chart] of charts.entries()) {
    await drawNarrativeChartSection({
      doc,
      index,
      total: charts.length,
      theme,
      chart,
    });
  }

  for (const table of tables) {
    drawNarrativeTable(doc, table, theme);
  }

  doc.fillColor(theme.muted).font('Helvetica').fontSize(9).text(
    'Nota: este informe es informativo y no constituye una recomendación de inversión personalizada.',
    { align: 'left' }
  );

  const pageRange = doc.bufferedPageRange();
  for (let i = pageRange.start; i < pageRange.start + pageRange.count; i += 1) {
    doc.switchToPage(i);
    const pageNo = i + 1;
    doc
      .fillColor(theme.muted)
      .font('Helvetica')
      .fontSize(8.5)
      .text(
        pageNo === 1
          ? 'Portada'
          : `Pagina ${pageNo} de ${pageRange.count}`,
        doc.page.margins.left,
        doc.page.height - 26,
        {
          width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
          align: 'right',
        }
      );
  }

  doc.end();

  await new Promise<void>((resolve, reject) => {
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });

  return {
    id,
    type: 'pdf',
    title: input.title,
    description: subtitle,
    fileUrl: `/pdfs/simulaciones/${pdfName}`,
    previewImageUrl: '',
    source: input.source ?? 'analysis',
    createdAt,
    saved: false,
    meta: {
      kind: 'narrative',
      sections: sections.length,
      tables: tables.length,
      charts: charts.length,
      style,
    },
  };
}
