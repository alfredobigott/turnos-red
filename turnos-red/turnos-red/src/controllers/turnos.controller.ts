import type { NextFunction, Request, Response } from "express";
import * as turnosService from "../services/turnos.service.js";

export function listarTurnos(_req: Request, res: Response): void {
  res.status(200).json(turnosService.obtenerTodos());
}

export function obtenerTurno(req: Request, res: Response): void {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "El id debe ser un número entero." });
    return;
  }

  const turno = turnosService.obtenerPorId(id);
  if (!turno) {
    res.status(404).json({ error: "Turno no encontrado." });
    return;
  }

  res.status(200).json(turno);
}

export function crearTurno(req: Request, res: Response, next: NextFunction): void {
  try {
    const { paciente, documento, especialidad, fecha, hora, confirmado, observaciones } = req.body;

    if (!paciente || !documento || !especialidad || !fecha || !hora) {
      res.status(400).json({ error: "Faltan campos obligatorios." });
      return;
    }

    const nuevo = turnosService.crear({
      paciente,
      documento,
      especialidad,
      fecha,
      hora,
      confirmado: Boolean(confirmado),
      observaciones,
    });

    res.status(201).json(nuevo);
  } catch (error) {
    next(error);
  }
}

export function actualizarTurno(req: Request, res: Response): void {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "El id debe ser un número entero." });
    return;
  }

  const actualizado = turnosService.actualizar(id, req.body);
  if (!actualizado) {
    res.status(404).json({ error: "Turno no encontrado." });
    return;
  }

  res.status(200).json(actualizado);
}

export function eliminarTurno(req: Request, res: Response): void {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "El id debe ser un número entero." });
    return;
  }

  const eliminado = turnosService.eliminar(id);
  if (!eliminado) {
    res.status(404).json({ error: "Turno no encontrado." });
    return;
  }

  res.status(200).json({ mensaje: "Turno eliminado." });
}
