import React from 'react';

interface MonthGridProps {
  year: number;
  /** Mes 0-indexado (0 = enero), igual que Date. */
  month: number;
  /** Render de cada día del mes (semana de lunes a domingo). */
  renderDay: (day: number, isoDate: string) => React.ReactNode;
  weekdayLabels?: string[];
}

/**
 * Primitiva de grilla mensual: encabezado Lun–Dom + celdas vacías + días.
 * El estilo de cada celda lo define el consumidor vía `renderDay`.
 */
const MonthGrid: React.FC<MonthGridProps> = ({
  year,
  month,
  renderDay,
  weekdayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
}) => {
  const firstDowMondayFirst = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < firstDowMondayFirst; i++) {
    cells.push(<span key={`blank-${i}`} />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push(<React.Fragment key={day}>{renderDay(day, iso)}</React.Fragment>);
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center' }}>
      {weekdayLabels.map((w) => (
        <span key={w} style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', padding: '2px 0' }}>
          {w}
        </span>
      ))}
      {cells}
    </div>
  );
};

export default MonthGrid;
