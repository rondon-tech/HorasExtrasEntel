import React from 'react';
import { useAppContext } from '../context/AppContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

const Simulator: React.FC = () => {
  const {
    currentMonth,
    liquidoAPagar,
    totalSueldoBase,
    totalExtraPayThisMonth,
    bonoCompensatorio,
    totalExpensesThisMonth,
    totalHaberesImponibles,
    totalHaberesExentos,
    totalDescuentosLegales,
    impuestoUnico,
    totalDescuentosVarios,
    montoAFP,
    montoSalud,
    montoCesantia,
    params
  } = useAppContext();

  const formattedMonth = format(currentMonth, 'MMMM yyyy', { locale: es });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
  };

  const pieData = [
    { name: 'Sueldo Base (Fijo)', value: totalSueldoBase, color: '#0066ff' },
    { name: 'Horas Extras', value: totalExtraPayThisMonth, color: '#ff5500' },
    { name: 'Bonos (TAD/Contingencia)', value: bonoCompensatorio, color: '#10b981' },
    { name: 'Viáticos', value: totalExpensesThisMonth, color: '#8b5cf6' },
  ].filter(item => item.value > 0);

  const totalHaberes = totalHaberesImponibles + totalHaberesExentos;
  const totalDescuentos = totalDescuentosLegales + impuestoUnico + totalDescuentosVarios;

  const barData = [
    {
      name: 'Resumen Mensual',
      Ingresos: totalHaberes,
      Descuentos: totalDescuentos,
      Liquido: liquidoAPagar
    }
  ];

  return (
    <div>
      <h2 className="mb-6 text-xl">Simulador de Liquidación</h2>
      <p className="text-sm text-secondary mb-4">Esta simulación estima tu pago exacto para <b>{formattedMonth}</b> basándose en tus registros y parámetros predefinidos.</p>

      <div className="glass-card mb-6 text-center">
        <p className="text-sm text-secondary uppercase font-bold tracking-wider mb-2">Líquido a Pagar Estimado</p>
        <h1 className="text-4xl font-bold text-gradient mb-2">
          {formatCurrency(liquidoAPagar)}
        </h1>
      </div>

      <div className="grid-2 mb-6">
        <div className="glass-card" style={{ padding: '1rem', minHeight: '250px' }}>
          <h3 className="text-sm uppercase text-secondary mb-3 border-b pb-2" style={{ borderColor: 'var(--border-color)' }}>Composición de Ingresos</h3>
          <div style={{ width: '100%', height: '150px' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-xs text-secondary">
            {pieData.map((d, i) => (
              <div key={i} className="flex-between mb-1">
                <span className="flex items-center gap-1">
                  <div style={{width: 8, height: 8, borderRadius: '50%', backgroundColor: d.color}}></div>
                  {d.name}
                </span>
                <span className="font-bold">{formatCurrency(d.value)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1rem', minHeight: '250px' }}>
          <h3 className="text-sm uppercase text-secondary mb-3 border-b pb-2" style={{ borderColor: 'var(--border-color)' }}>Balance General</h3>
          <div style={{ width: '100%', height: '180px' }}>
            <ResponsiveContainer>
              <BarChart data={barData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={10} />
                <YAxis stroke="var(--text-secondary)" fontSize={10} tickFormatter={(val) => `$${val/1000}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey="Ingresos" fill="#10b981" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Descuentos" fill="#ef4444" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Liquido" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <h3 className="text-md uppercase text-secondary mb-3 border-b pb-2" style={{ borderColor: 'var(--border-color)' }}>Detalle del Comprobante</h3>
        
        {/* HABERES */}
        <h4 className="text-sm font-bold mt-3 mb-2 text-blue">REMUNERACION FIJA</h4>
        <div className="flex-between text-sm mb-1">
          <span>Sueldo Base</span>
          <span>{formatCurrency(params.baseSalary)}</span>
        </div>
        <div className="flex-between text-sm mb-1">
          <span>Gratificación fija</span>
          <span>{formatCurrency(params.gratificacion)}</span>
        </div>

        <h4 className="text-sm font-bold mt-4 mb-2 text-blue">REMUNERACION VARIABLE</h4>
        <div className="flex-between text-sm mb-1">
          <span>Incentivo de Producción</span>
          <span>{formatCurrency(params.incentivoProduccion)}</span>
        </div>
        <div className="flex-between text-sm mb-1">
          <span>Bono de Gestión</span>
          <span>{formatCurrency(totalExpensesThisMonth)}</span>
        </div>
        <div className="flex-between text-sm mb-1">
          <span>Bono Compensatorio</span>
          <span>{formatCurrency(bonoCompensatorio)}</span>
        </div>
        <div className="flex-between text-sm mb-1">
          <span>Horas Extras 50%</span>
          <span>{formatCurrency(totalExtraPayThisMonth)}</span>
        </div>

        <h4 className="text-sm font-bold mt-4 mb-2 text-blue">REMUNERACIÓN EXENTA</h4>
        <div className="flex-between text-sm mb-1">
          <span>Asignación Alimentación</span>
          <span>{formatCurrency(params.asignacionAlimentacion)}</span>
        </div>
        <div className="flex-between text-sm mb-1">
          <span>Desgaste de herramientas</span>
          <span>{formatCurrency(params.desgasteHerramientas)}</span>
        </div>

        <div className="flex-between font-bold text-sm mt-3 border-t pt-2" style={{ borderColor: 'var(--border-color)' }}>
          <span>TOTAL HABERES</span>
          <span>{formatCurrency(totalHaberes)}</span>
        </div>
        <div className="flex-between text-xs text-secondary mt-1">
          <span>Total Imponible: {formatCurrency(totalHaberesImponibles)}</span>
          <span>Total Tributable: {formatCurrency(totalHaberesImponibles - totalDescuentosLegales)}</span>
        </div>

        {/* DESCUENTOS */}
        <h4 className="text-sm font-bold mt-5 mb-2 text-orange">DESCUENTOS LEGALES</h4>
        <div className="flex-between text-sm mb-1">
          <span>AFP ({params.afpRate}%)</span>
          <span className="text-danger">-{formatCurrency(montoAFP)}</span>
        </div>
        <div className="flex-between text-sm mb-1">
          <span>Salud ({params.saludRate}%)</span>
          <span className="text-danger">-{formatCurrency(montoSalud)}</span>
        </div>
        <div className="flex-between text-sm mb-1">
          <span>Seguro Cesantía ({params.cesantiaRate}%)</span>
          <span className="text-danger">-{formatCurrency(montoCesantia)}</span>
        </div>
        <div className="flex-between text-sm mb-1">
          <span>Impuesto Único (Renta)</span>
          <span className="text-danger">-{formatCurrency(impuestoUnico)}</span>
        </div>
        
        <h4 className="text-sm font-bold mt-4 mb-2 text-orange">DESCUENTOS VARIOS</h4>
        <div className="flex-between text-sm mb-1">
          <span>Préstamo Especial</span>
          <span className="text-danger">-{formatCurrency(params.prestamo)}</span>
        </div>
        <div className="flex-between text-sm mb-1">
          <span>Cuota Manual Sindicato</span>
          <span className="text-danger">-{formatCurrency(params.cuotaSindicato)}</span>
        </div>
        <div className="flex-between text-sm mb-1">
          <span>Otros Descuentos</span>
          <span className="text-danger">-{formatCurrency(params.otrosDescuentos)}</span>
        </div>
        
        <div className="flex-between font-bold text-sm mt-3 border-t pt-2" style={{ borderColor: 'var(--border-color)' }}>
          <span>TOTAL DESCUENTOS</span>
          <span className="text-danger">-{formatCurrency(totalDescuentos)}</span>
        </div>
        
        <div className="flex-between font-bold text-xl mt-5 border-t pt-4 text-green" style={{ borderColor: 'var(--border-color)' }}>
          <span>LÍQUIDO A PAGAR</span>
          <span>{formatCurrency(liquidoAPagar)}</span>
        </div>
      </div>
    </div>
  );
};

export default Simulator;
