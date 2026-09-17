import type { NextFunction, Request, Response } from "express";

// Error de aplicación con forma conocida: el errorHandler lo distingue de
// cualquier otro error inesperado y lo traduce directo a la respuesta HTTP.
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown[];

  constructor(status: number, message: string, code: string, details: unknown[] = []) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Middleware de manejo de errores centralizado: siempre al final de la
// cadena de middlewares, siempre con 4 parámetros. Toda la API responde
// errores con el mismo formato: { status, message, code, details }.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.status).json({
      status: err.status,
      message: err.message,
      code: err.code,
      details: err.details,
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    status: 500,
    message: "Error interno del servidor.",
    code: "INTERNAL_ERROR",
    details: [],
  });
}
