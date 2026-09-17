import type { NextFunction, Request, Response } from "express";
import * as turnosService from "../services/turnos.service.js";
import type { FiltrosTurnos } from "../services/turnos.service.js";
import { AppError } from "../middleware/errorHandler.js";
import { parseIdParam } from "../utils/parseIdParam.js";

export function listarTurnos(req: Request, res: Response, next: NextFunction): void {
  try {
    const { especialidad, fecha, medicoId } = req.query;
    const filtros: FiltrosTurnos = {};

    if (typeof especialidad === "string" && especialidad.trim() !== "") {
      filtros.especialidad = especialidad;
    }

    if (typeof fecha === "string" && fecha.trim() !== "") {
      filtros.fecha = fecha;
    }

    if (typeof medicoId === "string" && medicoId.trim() !== "") {
      const medicoIdNumero = Number(medicoId);
      if (!Number.isInteger(medicoIdNumero)) {
        throw new AppError(400, "medicoId debe ser un número entero.", "INVALID_QUERY_PARAM");
      }
      filtros.medicoId = medicoIdNumero;
    }

    res.status(200).json(turnosService.obtenerTodos(filtros));
  } catch (error) {
    next(error);
  }
}

export function obtenerTurno(req: Request, res: Response, next: NextFunction): void {
  try {
    const id = parseIdParam(req.params.id);
    const turno = turnosService.obtenerPorId(id);
    if (!turno) {
      throw new AppError(404, "Turno no encontrado.", "TURNO_NOT_FOUND");
    }
    res.status(200).json(turno);
  } catch (error) {
    next(error);
  }
}

export function crearTurno(req: Request, res: Response, next: NextFunction): void {
  try {
    const { paciente, documento, especialidad, fecha, hora, confirmado, observaciones, medicoId } =
      req.body;

    const nuevo = turnosService.crear({
      paciente,
      documento,
      especialidad,
      fecha,
      hora,
      confirmado: Boolean(confirmado),
      observaciones,
      medicoId,
    });

    res.status(201).json(nuevo);
  } catch (error) {
    next(error);
  }
}

export function actualizarTurno(req: Request, res: Response, next: NextFunction): void {
  try {
    const id = parseIdParam(req.params.id);
    const actualizado = turnosService.actualizar(id, req.body);
    if (!actualizado) {
      throw new AppError(404, "Turno no encontrado.", "TURNO_NOT_FOUND");
    }
    res.status(200).json(actualizado);
  } catch (error) {
    next(error);
  }
}

export function eliminarTurno(req: Request, res: Response, next: NextFunction): void {
  try {
    const id = parseIdParam(req.params.id);
    const eliminado = turnosService.eliminar(id);
    if (!eliminado) {
      throw new AppError(404, "Turno no encontrado.", "TURNO_NOT_FOUND");
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
