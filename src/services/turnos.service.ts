import { readFile } from "node:fs/promises";
import { EventEmitter } from "node:events";
import type { Turno } from "../models/turno.model.js";
import { normalizarTurnos } from "../models/turno.model.js";

// Bus de eventos internos (consigna 8.a). Cualquier parte de la app puede
// escuchar estos eventos sin que este servicio sepa quién los escucha.
export const eventosTurnos = new EventEmitter();

let turnos: Turno[] = [];

export async function leerTurnosCrudos(rutaArchivo: string): Promise<unknown[]> {
  try {
    const contenido = await readFile(rutaArchivo, "utf-8");
    return JSON.parse(contenido) as unknown[];
  } catch (error) {
    console.error(`Error al leer ${rutaArchivo}:`, error);
    throw error;
  }
}

export async function inicializarTurnos(rutaArchivo: string): Promise<void> {
  const crudos = await leerTurnosCrudos(rutaArchivo);
  turnos = normalizarTurnos(crudos);
}

export function obtenerTodos(): Turno[] {
  return turnos;
}

export function obtenerPorId(id: number): Turno | undefined {
  return turnos.find((t) => t.id === id);
}

export function crear(datos: Omit<Turno, "id">): Turno {
  const nuevoId = turnos.length > 0 ? Math.max(...turnos.map((t) => t.id)) + 1 : 1;
  const nuevoTurno: Turno = { id: nuevoId, ...datos };
  turnos.push(nuevoTurno);
  eventosTurnos.emit("turno:creado", nuevoTurno);
  return nuevoTurno;
}

export function actualizar(id: number, datos: Partial<Omit<Turno, "id">>): Turno | null {
  const indice = turnos.findIndex((t) => t.id === id);
  if (indice === -1) return null;
  turnos[indice] = { ...turnos[indice], ...datos };
  eventosTurnos.emit("turno:actualizado", turnos[indice]);
  return turnos[indice];
}

export function eliminar(id: number): boolean {
  const indice = turnos.findIndex((t) => t.id === id);
  if (indice === -1) return false;
  const [eliminado] = turnos.splice(indice, 1);
  eventosTurnos.emit("turno:eliminado", eliminado);
  return true;
}
