import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

export interface ExportColumn<T> {
  header: string;
  value: (row: T) => string;
}

export function exportTableToPdf<T>(params: {
  title: string;
  filename: string;
  columns: ExportColumn<T>[];
  rows: T[];
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFontSize(16);
  doc.text(params.title, 40, 36);

  autoTable(doc, {
    startY: 52,
    head: [params.columns.map((column) => column.header)],
    body: params.rows.map((row) => params.columns.map((column) => column.value(row))),
    styles: {
      fontSize: 9,
      cellPadding: 5,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [26, 35, 126],
      textColor: 255,
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 40, right: 40 },
  });

  doc.save(params.filename);
}

export function exportTableToExcel<T>(params: {
  sheetName: string;
  filename: string;
  columns: ExportColumn<T>[];
  rows: T[];
}) {
  const worksheet = XLSX.utils.aoa_to_sheet([
    params.columns.map((column) => column.header),
    ...params.rows.map((row) => params.columns.map((column) => column.value(row))),
  ]);

  const columnWidths = params.columns.map((column, index) => {
    const values = params.rows.map((row) => column.value(row));
    const longest = Math.max(column.header.length, ...values.map((value) => String(value).length));
    return { wch: Math.min(Math.max(longest + 2, 12), index === 0 ? 28 : 22) };
  });

  worksheet['!cols'] = columnWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, params.sheetName);
  XLSX.writeFile(workbook, params.filename);
}

export async function exportTableToWord<T>(params: {
  title: string;
  filename: string;
  columns: ExportColumn<T>[];
  rows: T[];
}) {
  const tableRows = [
    new TableRow({
      children: params.columns.map(
        (column) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: column.header, bold: true })],
              }),
            ],
            width: { size: 100 / params.columns.length, type: WidthType.PERCENTAGE },
          })
      ),
    }),
    ...params.rows.map(
      (row) =>
        new TableRow({
          children: params.columns.map(
            (column) =>
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: column.value(row) })],
                  }),
                ],
                width: { size: 100 / params.columns.length, type: WidthType.PERCENTAGE },
              })
          ),
        })
    ),
  ];

  const wordDocument = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun({ text: params.title, bold: true, size: 28 })],
          }),
          new Paragraph({ text: '' }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows,
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(wordDocument);
  const url = URL.createObjectURL(blob);
  const anchor = globalThis.document.createElement('a');
  anchor.href = url;
  anchor.download = params.filename;
  anchor.click();
  URL.revokeObjectURL(url);
}