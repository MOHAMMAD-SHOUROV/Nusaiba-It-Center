import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { Member, MonthlyRecord } from '../types';

// Extend jsPDF with autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export const exportToExcel = (members: Member[], monthKey: string) => {
  const data = members.map(m => ({
    'Name': m.name,
    'Phone': m.phone,
    'Status': m.isActive ? 'Active' : 'Inactive',
    'Month': monthKey
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, `Nusaiba_IT_Report_${monthKey}.xlsx`);
};

export const exportToPDF = (members: Member[], monthKey: string) => {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text('Nusaiba IT Center - Monthly Report', 14, 22);
  
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Month: ${monthKey}`, 14, 30);
  doc.text(`Generated on: ${format(new Date(), 'PPpp')}`, 14, 36);

  const tableData = members.map((m, index) => [
    index + 1,
    m.name,
    m.phone,
    m.isActive ? 'Active' : 'Inactive'
  ]);

  doc.autoTable({
    startY: 45,
    head: [['#', 'Name', 'Phone', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229] }
  });

  doc.save(`Nusaiba_IT_Report_${monthKey}.pdf`);
};
