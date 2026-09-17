// Enum cerrado de especialidades soportadas por la red de centros.
export const ESPECIALIDADES = ["Clínica médica", "Pediatría", "Odontología", "Nutrición"] as const;

export type Especialidad = (typeof ESPECIALIDADES)[number];

// Forma heterogénea en la que puede llegar un registro desde el JSON de
// origen. Todo es opcional y de tipos permisivos porque cada sede envía
// sus datos con formatos distintos: no hay ninguna garantía todavía.
export interface TurnoCrudo {
  id?: string | number;
  paciente?: string;
  documento?: string | number;
  especialidad?: string;
  fecha?: string;
  hora?: string;
  confirmado?: string | boolean | number;
  medicoId?: string | number;
}

// Forma limpia y confiable que usa el resto de la aplicación.
export interface Turno {
  id: number;
  paciente: string;
  documento: string;
  especialidad: string;
  fecha: string; // normalizado a YYYY-MM-DD
  hora: string; // normalizado a HH:mm
  confirmado: boolean;
  observaciones?: string;
  medicoId?: number;
}

function normalizarId(valor: unknown): number | null {
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero <= 0) return null;
  return numero;
}

function normalizarFecha(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const coincidencia = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!coincidencia) return null;
  const [, dia, mes, anio] = coincidencia;
  return `${anio}-${mes}-${dia}`;
}

function normalizarHora(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const coincidencia = valor.match(/^(\d{1,2})[.:](\d{2})$/);
  if (!coincidencia) return null;
  const [, horas, minutos] = coincidencia;
  return `${horas.padStart(2, "0")}:${minutos}`;
}

// Cada sede puede mandar la especialidad con mayúsculas/acentos distintos
// (p. ej. "PEDIATRÍA"). Si coincide (ignorando mayúsculas y acentos) con
// alguno de los valores del enum cerrado, se canoniza a esa forma; si no
// coincide con ninguno, se conserva el valor recortado tal cual llegó.
function normalizarEspecialidad(valor: string): string {
  const coincidencia = ESPECIALIDADES.find(
    (especialidad) => especialidad.localeCompare(valor, undefined, { sensitivity: "base" }) === 0,
  );
  return coincidencia ?? valor;
}

function normalizarConfirmado(valor: unknown): boolean {
  if (typeof valor === "boolean") return valor;
  if (typeof valor === "number") return valor === 1;
  if (typeof valor === "string") {
    return ["si", "sí", "true", "1", "yes"].includes(valor.trim().toLowerCase());
  }
  return false;
}

// Intenta convertir un registro crudo en un Turno válido. Devuelve null
// si no cumple con la estructura mínima del dominio.
export function normalizarTurno(crudo: TurnoCrudo): Turno | null {
  const id = normalizarId(crudo.id);
  if (id === null) return null;

  const paciente = typeof crudo.paciente === "string" ? crudo.paciente.trim() : "";
  if (paciente === "") return null;

  const documento = crudo.documento !== undefined ? String(crudo.documento).trim() : "";
  if (documento === "") return null;

  const especialidadCruda = typeof crudo.especialidad === "string" ? crudo.especialidad.trim() : "";
  if (especialidadCruda === "") return null;
  const especialidad = normalizarEspecialidad(especialidadCruda);

  const fecha = normalizarFecha(crudo.fecha);
  if (fecha === null) return null;

  const hora = normalizarHora(crudo.hora);
  if (hora === null) return null;

  const confirmado = normalizarConfirmado(crudo.confirmado);

  const turno: Turno = { id, paciente, documento, especialidad, fecha, hora, confirmado };
  const medicoId = normalizarId(crudo.medicoId);
  if (medicoId !== null) turno.medicoId = medicoId;

  return turno;
}

// Procesa un array completo, separando válidos de inválidos e informando
// el resultado por consola (consigna 6.d).
export function normalizarTurnos(crudos: unknown[]): Turno[] {
  const aceptados: Turno[] = [];
  let rechazados = 0;

  for (const item of crudos) {
    const turno = normalizarTurno((item ?? {}) as TurnoCrudo);
    if (turno) {
      aceptados.push(turno);
    } else {
      rechazados++;
    }
  }

  console.log(`Turnos aceptados: ${aceptados.length}. Turnos rechazados: ${rechazados}.`);
  return aceptados;
}
