import type { Especialidad } from "./turno.model.js";

export interface Medico {
  id: number;
  nombre: string;
  especialidad: Especialidad;
  matricula: string;
  disponible: boolean;
}
