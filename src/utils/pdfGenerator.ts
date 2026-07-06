import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export const generateRecordsPDF = (
  items: any[],
  monthName: string,
  year: number,
  totalItems: number,
  totalExtraHours: number,
  totalExpenses: number
) => {
  // 1. Create a new document in landscape orientation (since we have many columns)
  const doc = new jsPDF('landscape');

  // 2. Setup Document Header
  doc.setFontSize(20);
  doc.setTextColor(0, 102, 255); // Entel Blueish
  doc.text('Entel - Reporte de Horas Extras y Viáticos', 14, 22);

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`Auditoria del periodo: ${monthName} ${year}`, 14, 30);
  doc.text(`Fecha de exportacion: ${format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}`, 14, 36);

  // 3. Setup Table Columns
  const tableColumn = ["Fecha", "Tipo", "Sitio / Nemonico", "N Tarea", "Descripcion / Tarea", "Horas Extras"];
  
  // 4. Setup Table Rows
  const tableRows = items.map(item => {
    const isRecord = item.type === 'record';
    const formattedDate = format(parseISO(item.date), 'dd/MM/yyyy');
    
    const typeLabel = isRecord ? (item.dayType || 'H. Extra') : 'Viatico';
    const placeLabel = isRecord ? item.sitio : item.nemonico;
    const taskNumber = isRecord && item.numeroTarea ? item.numeroTarea : '-';
    const desc = isRecord ? item.tarea : item.description;
    
    let hoursLabel = '-';
    if (isRecord) {
      hoursLabel = `${item.startTime} a ${item.endTime} (${item.extraHours.toFixed(1)} hrs)`;
    }

    return [
      formattedDate,
      typeLabel,
      placeLabel,
      taskNumber,
      desc,
      hoursLabel
    ];
  });

  // 5. Generate Table
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 45,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [20, 28, 47], textColor: 255 }, // Dark blue header
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { top: 45 }
  });

  // 6. Setup Summary Block at the bottom
  const finalY = (doc as any).lastAutoTable.finalY || 45;
  
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumen del Reporte:', 14, finalY + 15);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Total de registros: ${totalItems}`, 14, finalY + 23);
  doc.text(`Total Horas Extras: ${totalExtraHours.toFixed(1)} hrs`, 14, finalY + 29);
  doc.text(`Total Viaticos: ${totalExpenses}`, 14, finalY + 35);

  return doc;
};
