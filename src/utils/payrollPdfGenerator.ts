import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const generatePayrollPDF = (payrollData: any, monthDate: Date) => {
  const doc = new jsPDF('portrait');

  // Formatters
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val || 0);

  const monthName = format(monthDate, 'MMMM yyyy', { locale: es });
  
  // Header
  doc.setFontSize(22);
  doc.setTextColor(0, 102, 255);
  doc.text('Entel', 14, 25);
  
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Liquidación de Sueldo (Simulada)', 14, 34);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Periodo: ${monthName.toUpperCase()}`, 14, 42);
  doc.text(`Fecha de emisión: ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es })}`, 14, 48);

  // Line separator
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 52, 196, 52);

  // TABLE 1: Haberes Imponibles
  autoTable(doc, {
    startY: 58,
    head: [['Haberes Imponibles', 'Monto']],
    body: [
      ['Sueldo Base', formatCurrency(payrollData.totalSueldoBase)],
      ['Gratificación Legal', formatCurrency(payrollData.params?.gratificacion)],
      ['Incentivo Producción', formatCurrency(payrollData.params?.incentivoProduccion)],
      [`Horas Extras (${payrollData.totalExtraHoursThisMonth?.toFixed(1)} hrs)`, formatCurrency(payrollData.totalExtraPayThisMonth)],
    ],
    foot: [['Total Imponible', formatCurrency(payrollData.totalHaberesImponibles)]],
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' }
  });

  let nextY = (doc as any).lastAutoTable.finalY + 10;

  // TABLE 2: Descuentos Legales
  autoTable(doc, {
    startY: nextY,
    head: [['Descuentos Legales y Tributarios', 'Monto']],
    body: [
      [`AFP (${payrollData.params?.afpRate}%)`, formatCurrency(payrollData.montoAFP)],
      [`Salud (${payrollData.params?.saludRate}%)`, formatCurrency(payrollData.montoSalud)],
      [`Seguro Cesantía (${payrollData.params?.cesantiaRate}%)`, formatCurrency(payrollData.montoCesantia)],
      ['Impuesto Único 2da Categoría', formatCurrency(payrollData.impuestoUnico)],
    ],
    foot: [['Total Descuentos Legales', formatCurrency(payrollData.totalDescuentosLegales + payrollData.impuestoUnico)]],
    theme: 'grid',
    headStyles: { fillColor: [192, 57, 43], textColor: 255 },
    footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' }
  });

  nextY = (doc as any).lastAutoTable.finalY + 10;

  // TABLE 3: Haberes No Imponibles (Exentos)
  autoTable(doc, {
    startY: nextY,
    head: [['Haberes No Imponibles (Exentos)', 'Monto']],
    body: [
      ['Asignación Colación / Movilización', formatCurrency(payrollData.params?.asignacionAlimentacion)],
      ['Asignación Herramientas', formatCurrency(payrollData.params?.desgasteHerramientas)],
      ['Bono Compensatorio TAD/Contingencia', formatCurrency(payrollData.bonoCompensatorio)],
      ['Reembolso Viáticos (Gestión)', formatCurrency(payrollData.totalExpensesThisMonth)],
    ],
    foot: [['Total No Imponible', formatCurrency(payrollData.totalHaberesExentos)]],
    theme: 'grid',
    headStyles: { fillColor: [39, 174, 96], textColor: 255 },
    footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' }
  });

  nextY = (doc as any).lastAutoTable.finalY + 10;

  // TABLE 4: Otros Descuentos
  const totalOtrosDescuentos = (payrollData.params?.cuotaSindicato || 0) + (payrollData.params?.prestamo || 0) + (payrollData.params?.otrosDescuentos || 0);
  
  if (totalOtrosDescuentos > 0) {
    autoTable(doc, {
      startY: nextY,
      head: [['Otros Descuentos (Varios)', 'Monto']],
      body: [
        ['Cuota Sindicato', formatCurrency(payrollData.params?.cuotaSindicato)],
        ['Préstamo Empresa / Caja', formatCurrency(payrollData.params?.prestamo)],
        ['Otros', formatCurrency(payrollData.params?.otrosDescuentos)],
      ],
      foot: [['Total Otros Descuentos', formatCurrency(totalOtrosDescuentos)]],
      theme: 'grid',
      headStyles: { fillColor: [142, 68, 173], textColor: 255 },
      footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' }
    });
    nextY = (doc as any).lastAutoTable.finalY + 10;
  }

  // TOTAL FINAL (LÍQUIDO A PAGAR)
  doc.setDrawColor(0, 102, 255);
  doc.setFillColor(245, 247, 250);
  doc.rect(14, nextY, 182, 25, 'FD');
  
  doc.setFontSize(14);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'bold');
  doc.text('LÍQUIDO A PAGAR', 20, nextY + 16);
  
  doc.setFontSize(22);
  doc.setTextColor(0, 102, 255);
  doc.text(formatCurrency(payrollData.liquidoAPagar), 190, nextY + 17, { align: 'right' });

  // Disclamer
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text('Este documento es una simulación generada por la Plataforma Horas Extras Entel.', 14, nextY + 35);
  doc.text('Los valores finales pueden variar ligeramente según la tributación real de la compañía.', 14, nextY + 40);

  return doc;
};
