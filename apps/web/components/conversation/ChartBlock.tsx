'use client';

type ChartBlockProps = {
  chart: {
    kind: string;
    data: any[];
    xKey?: string;
    yKey?: string;
  };
};

export function ChartBlock({ chart }: ChartBlockProps) {
  return (
    <div style={{ fontSize: 11, opacity: 0.85 }}>
      <strong>Gráfico ({chart.kind})</strong>

      {chart.xKey && chart.yKey && (
        <div style={{ fontSize: 10, opacity: 0.6 }}>
          Ejes: {chart.xKey} · {chart.yKey}
        </div>
      )}

      <pre style={{ whiteSpace: 'pre-wrap' }}>
        {JSON.stringify(chart.data, null, 2)}
      </pre>
    </div>
  );
}

