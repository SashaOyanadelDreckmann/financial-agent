'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
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
  const hasData = Array.isArray(chart.data) && chart.data.length > 0;

  const renderSeries = () => {
    if (chart.kind === 'bar') {
      return (
        <Bar
          dataKey={chart.yKey}
          fill="rgba(222, 229, 244, 0.9)"
          radius={[6, 6, 0, 0]}
        />
      );
    }
    if (chart.kind === 'area') {
      return (
        <Area
          type="monotone"
          dataKey={chart.yKey}
          stroke="rgba(238, 244, 255, 0.96)"
          strokeWidth={2}
          fill="url(#agentChartAreaFill)"
          fillOpacity={1}
          dot={false}
          activeDot={{ r: 3, fill: '#ffffff' }}
        />
      );
    }
    return (
      <Line
        type="monotone"
        dataKey={chart.yKey}
        stroke="rgba(238, 244, 255, 0.98)"
        strokeWidth={2.2}
        dot={false}
        activeDot={{ r: 3, fill: '#ffffff' }}
      />
    );
  };

  const renderChart = () => {
    const commonProps = {
      data: chart.data,
      margin: { top: 10, right: 12, bottom: 4, left: 0 },
    };
    const axis = {
      tick: { fontSize: 11, fill: 'rgba(224, 233, 248, 0.84)' },
      axisLine: { stroke: 'rgba(138, 160, 204, 0.26)' },
      tickLine: { stroke: 'rgba(138, 160, 204, 0.2)' },
    };
    const tooltip = (
      <Tooltip
        formatter={(value: number | string | undefined) =>
          formatValue(Number(value ?? 0), chart.format, chart.currency)
        }
        contentStyle={{
          border: '1px solid rgba(150, 176, 224, 0.26)',
          background: 'rgba(8, 12, 22, 0.96)',
          color: '#f4f8ff',
          borderRadius: '10px',
          boxShadow: '0 8px 18px rgba(0,0,0,0.26)',
        }}
        labelStyle={{ color: 'rgba(220, 232, 248, 0.8)' }}
      />
    );

    if (chart.kind === 'bar') {
      return (
        <BarChart {...commonProps}>
          <CartesianGrid strokeDasharray="4 4" stroke="rgba(144, 166, 208, 0.14)" />
          <XAxis dataKey={chart.xKey} {...axis} />
          <YAxis
            {...axis}
            tickFormatter={(v) =>
              formatValue(Number(v ?? 0), chart.format, chart.currency)
            }
          />
          {tooltip}
          {renderSeries()}
        </BarChart>
      );
    }

    if (chart.kind === 'area') {
      return (
        <AreaChart {...commonProps}>
          <defs>
            <linearGradient id="agentChartAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(156, 182, 230, 0.34)" />
              <stop offset="100%" stopColor="rgba(156, 182, 230, 0.04)" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke="rgba(144, 166, 208, 0.14)" />
          <XAxis dataKey={chart.xKey} {...axis} />
          <YAxis
            {...axis}
            tickFormatter={(v) =>
              formatValue(Number(v ?? 0), chart.format, chart.currency)
            }
          />
          {tooltip}
          {renderSeries()}
        </AreaChart>
      );
    }

    return (
      <LineChart {...commonProps}>
        <CartesianGrid strokeDasharray="4 4" stroke="rgba(144, 166, 208, 0.14)" />
        <XAxis dataKey={chart.xKey} {...axis} />
        <YAxis
          {...axis}
          tickFormatter={(v) =>
            formatValue(Number(v ?? 0), chart.format, chart.currency)
          }
        />
        {tooltip}
        {renderSeries()}
      </LineChart>
    );
  };

  return (
    <div className="agent-chart-card">
      <div className="agent-chart-head">
        <h3 className="agent-chart-title">{chart.title}</h3>
        <span className="agent-chart-kind">{chart.kind.toUpperCase()}</span>
      </div>
      <div className="agent-chart-subhead">
        {chart.subtitle && (
          <p className="agent-chart-subtitle">{chart.subtitle}</p>
        )}
      </div>
      <div className="agent-chart-canvas">
        {!hasData ? (
          <div className="agent-chart-empty">Sin datos para renderizar grafico</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
