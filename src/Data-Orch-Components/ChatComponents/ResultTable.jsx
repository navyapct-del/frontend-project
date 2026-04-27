/**
 * ResultTable.jsx — shared table rendering component.
 */
import React from "react";

export function ResultTable({ columns, rows }) {
  return (
    <div style={{ overflowX: "auto", fontSize: "13px", marginTop: "8px" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "300px" }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c} style={{
                padding: "7px 12px", background: "#f3f4f6",
                borderBottom: "2px solid #e5e7eb", textAlign: "left", whiteSpace: "nowrap",
              }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{
              borderBottom: "1px solid #f0f0f0",
              background: i % 2 === 0 ? "#fff" : "#fafafa",
            }}>
              {columns.map((c) => (
                <td key={c} style={{ padding: "6px 12px" }}>{row[c] ?? ""}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ResultTable;
