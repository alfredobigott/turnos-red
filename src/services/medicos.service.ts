import { readFile } from "node:fs/promises";
import type { Medico } from "../models/medico.model.js";

let medicos: Medico[] = [];

export async function inicializarMedicos(rutaArchivo: string): Promise<void> {
  const contenido = await readFile(rutaArchivo, "utf-8");
  medicos = JSON.parse(contenido) as Medico[];
}

export interface FiltrosMedicos {
  especialidad?: string;
  disponible?: boolean;
}

export function obtenerTodos(filtros: FiltrosMedicos = {}): Medico[] {
  return medicos.filter((medico) => {
    if (filtros.especialidad && medico.especialidad !== filtros.especialidad) return false;
    if (filtros.disponible !== undefined && medico.disponible !== filtros.disponible) return false;
    return true;
  });
}

export function obtenerPorId(id: number): Medico | undefined {
  return medicos.find((m) => m.id === id);
}

export function crear(datos: Omit<Medico, "id">): Medico {
  const nuevoId = medicos.length > 0 ? Math.max(...medicos.map((m) => m.id)) + 1 : 1;
  const nuevoMedico: Medico = { id: nuevoId, ...datos };
  medicos.push(nuevoMedico);
  return nuevoMedico;
}

export function actualizar(id: number, datos: Partial<Omit<Medico, "id">>): Medico | null {
  const indice = medicos.findIndex((m) => m.id === id);
  if (indice === -1) return null;
  medicos[indice] = { ...medicos[indice], ...datos };
  return medicos[indice];
}

export function eliminar(id: number): boolean {
  const indice = medicos.findIndex((m) => m.id === id);
  if (indice === -1) return false;
  medicos.splice(indice, 1);
  return true;
}
