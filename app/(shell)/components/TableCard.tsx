import React from "react";

type TableCardProps = {
  headers: string[];
  rows: Array<Record<string, React.ReactNode>>;
};

export default function TableCard({ headers, rows }: TableCardProps) {
  return (
    <>
      <table className="table-desktop">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-t border-slate-100">
              {headers.map((h) => (
                <td key={h} className="text-sm text-slate-700">
                  {row[h]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="table-stacked">
        {rows.map((row, idx) => (
          <div key={idx} className="row">
            {headers.map((h) => (
              <div key={h} className="cell">
                <span className="text-slate-500 text-xs">{h}</span>
                <span className="text-slate-800 text-sm font-medium">{row[h]}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
