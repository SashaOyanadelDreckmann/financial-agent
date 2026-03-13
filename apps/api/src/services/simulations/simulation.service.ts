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

  doc.moveDown(1);
  doc.fillColor('#444444');
  doc.font('Helvetica').fontSize(9).text(
    'Nota: proyección determinística con capitalización mensual. No considera inflación, impuestos, comisiones ni variaciones de tasa.',
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
    title: `${title}: ${months} meses`,
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
    },
  };
}
