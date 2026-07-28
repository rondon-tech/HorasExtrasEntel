import { generatePayrollPDF } from '../utils/payrollPdfGenerator';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function usePayrollPDF(payrollData: any, monthDate: Date) {
  const formattedMonth = format(monthDate, 'MMMM yyyy', { locale: es });
  const fileName = `Liquidacion_Entel_${format(monthDate, 'MMM_yyyy')}.pdf`;

  const download = () => {
    const doc = generatePayrollPDF(payrollData, monthDate);
    doc.save(fileName);
  };

  const share = async () => {
    const doc = generatePayrollPDF(payrollData, monthDate);
    const pdfBlob = doc.output('blob');
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: `Liquidación Entel - ${formattedMonth}`,
          text: 'Adjunto detalle de la simulación de liquidación.',
          files: [file],
        });
      } catch (err) {
        console.log(err);
      }
    } else {
      download();
    }
  };

  return { download, share };
}
