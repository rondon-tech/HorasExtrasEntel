export const TAREAS_OPTIONS = [
  "Seleccione Descripcion ...",
  "Calidad / Mediciones / Survey",
  "Capacitación / Acreditación",
  "Fiscalización",
  "Incidencia en Sitio",
  "Instalación Menor / Apoyo en Antenas",
  "Logística: Cambio de Camioneta / Trámites Administrativos",
  "Logística: Gestión de BIN / VIN / Bidones",
  "Logística: Gestión de Llaves",
  "Logística: Retiro / Devolución de Repuestos y Equipos",
  "Mantenimiento Correctivo Clima",
  "Mantenimiento Correctivo DX",
  "Mantenimiento Correctivo Energía",
  "Mantenimiento Correctivo RAN",
  "Mantenimiento Correctivo TX",
  "Mantenimiento Preventivo GGEE",
  "Mantenimiento Proactivo / Preventivo",
  "Recarga de Combustible",
  "Respaldo con GGEE",
  "Traslado a Domicilio"
] as const;

export const TAREA_PLACEHOLDER = TAREAS_OPTIONS[0];

export type Tarea = typeof TAREAS_OPTIONS[number];

export const DAY_TYPES = ['Normal', 'TAD', 'TAD Apoyo'] as const;
export type DayTypeLabel = typeof DAY_TYPES[number];

export const NEMONICOS = ['SA575', 'FN699', 'SA881', 'Otro'] as const;
export type Nemonico = typeof NEMONICOS[number];