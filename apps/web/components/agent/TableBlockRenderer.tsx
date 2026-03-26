'use client';

interface TableBlockProps {
  block: {
    type: 'table';
    table: {
      title: string;
      headers: string[];
      rows: string[][];
      note?: string;
    };
  };
}

export function TableBlockRenderer({ block }: TableBlockProps) {
  const { title, headers, rows, note } = block.table;

  return (
    <div className="agent-table-card">
      <div className="agent-table-head">
        <span className="agent-table-title">{title}</span>
      </div>
      <div className="agent-table-scroll">
        <table className="agent-table">
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="agent-table-th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="agent-table-tr">
                {row.map((cell, ci) => (
                  <td key={ci} className={`agent-table-td${ci === 0 ? ' is-label' : ''}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note && <div className="agent-table-note">{note}</div>}
    </div>
  );
}
