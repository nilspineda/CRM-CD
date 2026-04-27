const escapeHtml = (value) => {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

const toFileName = (name) => {
  const date = new Date().toISOString().slice(0, 10);
  return `${name}-${date}.xls`.replace(/\s+/g, '-').toLowerCase();
};

export const exportToExcel = ({ fileName, sheetName = 'Datos', columns, rows }) => {
  const header = columns.map((column) => `<th>${escapeHtml(column.header)}</th>`).join('');
  const body = rows
    .map((row) => {
      const cells = columns
        .map((column) => {
          const value = typeof column.value === 'function' ? column.value(row) : row[column.key];
          return `<td>${escapeHtml(value)}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  const html = `
    <html>
      <head>
        <meta charset="UTF-8" />
      </head>
      <body>
        <table>
          <thead><tr>${header}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = toFileName(fileName || sheetName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
