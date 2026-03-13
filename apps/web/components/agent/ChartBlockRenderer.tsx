'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type ChartBlock = {
  type: 'chart';
  chart: {
    kind: 'line' | 'bar' | 'area';
    title: string;
    subtitle?: string;
    xKey: string;
    yKey: string;
    data: Record<string, number>[];
    format?: 'currency' | 'percentage' | 'number';
    currency?: string;
  };
};

function formatValue(
  value: number,
  format?: ChartBlock['chart']['format'],
  currency?: string
) {
  if (format === 'currency') {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: currency ?? 'CLP',
      maximumFractionDigits: 0,
    }).format(value);
  }

  if (format === 'percentage') {
    return `${value.toFixed(2)} %`;
  }

  return value.toLocaleString('es-CL');
}

export function ChartBlockRenderer({ block }: { block: ChartBlock }) {
  const { chart } = block;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-neutral-100">
          {chart.title}
        </h3>
        {chart.subtitle && (
          <p className="text-xs text-neutral-400">
            {chart.subtitle}
          </p>
        )}
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="70%" height="70%">
          <LineChart data={chart.data}>
            <XAxis
              dataKey={chart.xKey}
              tick={{ fontSize: 5, fill: '#9ca3af' }}
            />
            <YAxis
              tick={{ fontSize: 5, fill: '#9ca3af' }}
              tickFormatter={(v) =>
                formatValue(v, chart.format, chart.currency)
              }

            />
            <Tooltip
            formatter={(value: any) =>
                formatValue(
                Number(value),
                chart.format,
                chart.currency
                )
            }
            />

            <Line
              type="monotone"
              dataKey={chart.yKey}
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
