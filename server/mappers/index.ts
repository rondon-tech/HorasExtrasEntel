// ---------------------------------------------------------------------------
// Shared DTO types (used by both backend mappers and frontend API hooks)
// ---------------------------------------------------------------------------

export interface RecordDTO {
  id: string;
  date: string;
  dayType: string;
  isFeriado: boolean;
  isContingencia: boolean;
  startTime: string;
  endTime: string;
  sitio: string;
  numeroTarea: string;
  tarea: string;
  extraHours: number;
}

export interface ExpenseDTO {
  id: string;
  date: string;
  nemonico: string;
  description: string;
}

export interface ParamsDTO {
  baseSalary: number;
  gratificacion: number;
  incentivoProduccion: number;
  weeklyHours: number;
  tadRate: number;
  contingencyRate: number;
  viaticoRate: number;
  afpRate: number;
  saludRate: number;
  cesantiaRate: number;
  asignacionAlimentacion: number;
  desgasteHerramientas: number;
  cuotaSindicato: number;
  prestamo: number;
  otrosDescuentos: number;
}

export interface RecordInput {
  date: string;
  dayType: string;
  isFeriado: boolean;
  isContingencia: boolean;
  startTime: string;
  endTime: string;
  sitio: string;
  numeroTarea: string;
  tarea: string;
  extraHours: number;
}

export interface ExpenseInput {
  date: string;
  nemonico: string;
  description: string;
}

export interface ParamsInput {
  baseSalary: number;
  gratificacion: number;
  incentivoProduccion: number;
  weeklyHours: number;
  tadRate: number;
  contingencyRate: number;
  viaticoRate: number;
  afpRate: number;
  saludRate: number;
  cesantiaRate: number;
  asignacionAlimentacion: number;
  desgasteHerramientas: number;
  cuotaSindicato: number;
  prestamo: number;
  otrosDescuentos: number;
}

// Internal row types (snake_case, as received from PostgreSQL)

interface RecordRow {
  id: string;
  date: Date;
  day_type: string;
  is_feriado: boolean;
  is_contingencia: boolean;
  start_time: string;
  end_time: string;
  sitio: string;
  numero_tarea: string;
  tarea: string;
  extra_hours: string | number;
}

interface ExpenseRow {
  id: string;
  date: Date;
  nemonico: string;
  description: string;
}

interface ParamsRow {
  sueldo_base: string | number;
  gratificacion: string | number;
  incentivo_produccion: string | number;
  horas_jornada: string | number;
  bono_tad: string | number;
  bono_contingencia: string | number;
  viatico_rate: string | number;
  afp_rate: string | number;
  salud_rate: string | number;
  cesantia_rate: string | number;
  asignacion_alimentacion?: string | number;
  haberes_exentos?: string | number;
  desgaste_herramientas?: string | number;
  cuota_sindicato?: string | number;
  descuentos_varios?: string | number;
  prestamo?: string | number;
  otros_descuentos?: string | number;
}

// ---------------------------------------------------------------------------
// Mapper functions
// ---------------------------------------------------------------------------

export function toRecordDTO(row: RecordRow): RecordDTO {
  return {
    id: row.id,
    date: row.date.toISOString().split('T')[0],
    dayType: row.day_type,
    isFeriado: row.is_feriado,
    isContingencia: row.is_contingencia,
    startTime: row.start_time.substring(0, 5),
    endTime: row.end_time.substring(0, 5),
    sitio: row.sitio,
    numeroTarea: row.numero_tarea,
    tarea: row.tarea,
    extraHours: Number(row.extra_hours),
  };
}

export function recordRequestToDb(input: RecordInput): (string | boolean | number)[] {
  return [input.date, input.dayType, input.isFeriado, input.isContingencia, input.startTime, input.endTime, input.sitio, input.numeroTarea, input.tarea, input.extraHours];
}

export function toExpenseDTO(row: ExpenseRow): ExpenseDTO {
  return {
    id: row.id,
    date: row.date.toISOString().split('T')[0],
    nemonico: row.nemonico,
    description: row.description,
  };
}

export function expenseRequestToDb(input: ExpenseInput): [string, string, string] {
  return [input.date, input.nemonico, input.description];
}

export function toParamsDTO(dbRow: ParamsRow): ParamsDTO {
  return {
    baseSalary: Number(dbRow.sueldo_base),
    gratificacion: Number(dbRow.gratificacion),
    incentivoProduccion: Number(dbRow.incentivo_produccion),
    weeklyHours: Number(dbRow.horas_jornada),
    tadRate: Number(dbRow.bono_tad),
    contingencyRate: Number(dbRow.bono_contingencia),
    viaticoRate: Number(dbRow.viatico_rate),
    afpRate: Number(dbRow.afp_rate),
    saludRate: Number(dbRow.salud_rate),
    cesantiaRate: Number(dbRow.cesantia_rate),
    asignacionAlimentacion: Number(dbRow.asignacion_alimentacion || dbRow.haberes_exentos || 91401),
    desgasteHerramientas: Number(dbRow.desgaste_herramientas || 20000),
    cuotaSindicato: Number(dbRow.cuota_sindicato || dbRow.descuentos_varios || 6392),
    prestamo: Number(dbRow.prestamo || 10000),
    otrosDescuentos: Number(dbRow.otros_descuentos || 0),
  };
}

export function paramsUpdateToDb(input: ParamsInput): number[] {
  return [
    input.baseSalary, input.gratificacion, input.incentivoProduccion, input.weeklyHours,
    input.tadRate, input.contingencyRate, input.viaticoRate,
    input.afpRate, input.saludRate, input.cesantiaRate,
    input.asignacionAlimentacion, input.desgasteHerramientas, input.cuotaSindicato, input.prestamo, input.otrosDescuentos,
  ];
}
