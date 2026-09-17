import { AppError } from "../middleware/errorHandler.js";

// Compartido por todos los controladores que reciben :id en la ruta
// (turnos, medicos). Lanza un AppError 400 si no es un entero válido.
export function parseIdParam(valor: string): number {
  const id = Number(valor);
  if (!Number.isInteger(id)) {
    throw new AppError(400, "El id debe ser un número entero.", "INVALID_ID");
  }
  return id;
}
