// Ejemplo comparativo pedido por la consigna 5.b: la misma lectura de
// archivo, pero con el estilo antiguo de callbacks (node:fs) en vez de
// promesas. Este archivo es solo de referencia para el informe técnico;
// el servidor real usa turnos.service.ts.
import { readFile } from "node:fs";

export function leerTurnosConCallback(
  rutaArchivo: string,
  callback: (error: Error | null, datos?: unknown[]) => void,
): void {
  readFile(rutaArchivo, "utf-8", (error, contenido) => {
    if (error) {
      callback(error);
      return;
    }
    try {
      callback(null, JSON.parse(contenido) as unknown[]);
    } catch (errorParseo) {
      callback(errorParseo as Error);
    }
  });
}
