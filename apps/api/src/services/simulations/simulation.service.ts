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
};

export type SimulationArtifact = {
  id: string;
  type: 'pdf';
  title: string;
  description?: string;
  fileUrl: string;
  previewImageUrl: string;
  source: 'simulation';
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

function writeSectionTitle(doc: any, title: string) {
  ensureSpace(doc, 40);
  doc.moveDown(0.6);
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11).text(title.toUpperCase());
  doc.moveDown(0.2);
}

function writeBullets(doc: any, lines: string[]) {
  for (const line of lines) {
    ensureSpace(doc, 28);
    doc
      .fillColor('#1f2937')
      .font('Helvetica')
      .fontSize(10)
      .text(`- ${line}`, { lineGap: 2 });
  }
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
    source: 'simulation',
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

  const doc = new PDFDocument({ size: 'A4', margin: 54 });
  const stream = fs.createWriteStream(pdfPath);
  doc.pipe(stream);

  const subtitle =
    input.subtitle ??
    `Informe generado ${now.toLocaleDateString('es-CL')} · Formato ${input.style ?? 'corporativo'}`;

  const sections =
    Array.isArray(input.sections) && input.sections.length > 0
      ? input.sections
      : [
          {
            heading: 'Resumen ejecutivo',
            body: 'Documento narrativo generado en base al contexto del usuario y del chat.',
          },
        ];

  doc.fillColor('#0b1220').font('Helvetica-Bold').fontSize(21).text(input.title, { align: 'left' });
  doc.moveDown(0.3);
  doc.fillColor('#374151').font('Helvetica').fontSize(11).text(subtitle);
  doc.moveDown(0.8);

  for (const sec of sections.slice(0, 10)) {
    ensureSpace(doc, 80);
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12).text(sec.heading.toUpperCase());
    doc.moveDown(0.2);
    doc.fillColor('#1f2937').font('Helvetica').fontSize(10).text(sec.body, { lineGap: 3 });
    doc.moveDown(0.7);
  }

  doc.fillColor('#4b5563').font('Helvetica').fontSize(9).text(
    'Nota: este informe es informativo y no constituye una recomendación de inversión personalizada.',
    { align: 'left' }
  );

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
    source: 'simulation',
    createdAt,
    saved: false,
    meta: {
      kind: 'narrative',
      sections: sections.length,
      style: input.style ?? 'corporativo',
    },
  };
}
