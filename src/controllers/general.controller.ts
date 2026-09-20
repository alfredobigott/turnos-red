import type { Request, Response } from "express";

export async function helloWorld(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ mensaje: "API de TurnosRed funcionando" });
}

export async function notFound(req: Request, res: Response): Promise<void> {
  res.status(404).json({
    status: 404,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
    code: "ROUTE_NOT_FOUND",
    details: [],
  });
}
