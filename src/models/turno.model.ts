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

  const especialidad = typeof crudo.especialidad === "string" ? crudo.especialidad.trim() : "";
  if (especialidad === "") return null;

  const fecha = normalizarFecha(crudo.fecha);
  if (fecha === null) return null;

  const hora = normalizarHora(crudo.hora);
  if (hora === null) return null;

  const confirmado = normalizarConfirmado(crudo.confirmado);

  return { id, paciente, documento, especialidad, fecha, hora, confirmado };
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
