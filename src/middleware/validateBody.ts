import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { AppError } from "./errorHandler.js";

// Valida req.body contra un schema de Zod. Si falla, responde 400 con el
// formato estándar de error y "details" = error.issues (el campo exacto
// que falló queda en issue.path de cada elemento).
export function validateBody(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const resultado = schema.safeParse(req.body);
    if (!resultado.success) {
      next(new AppError(400, "Datos inválidos.", "VALIDATION_ERROR", resultado.error.issues));
      return;
    }
    req.body = resultado.data;
    next();
  };
}
