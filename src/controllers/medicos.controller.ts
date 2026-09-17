import type { NextFunction, Request, Response } from "express";
import * as medicosService from "../services/medicos.service.js";
import type { FiltrosMedicos } from "../services/medicos.service.js";
import { AppError } from "../middleware/errorHandler.js";
import { parseIdParam } from "../utils/parseIdParam.js";

export function listarMedicos(req: Request, res: Response, next: NextFunction): void {
  try {
    const { especialidad, disponible } = req.query;
    const filtros: FiltrosMedicos = {};

    if (typeof especialidad === "string" && especialidad.trim() !== "") {
      filtros.especialidad = especialidad;
    }

    if (typeof disponible === "string" && disponible.trim() !== "") {
      if (disponible !== "true" && disponible !== "false") {
        throw new AppError(400, "disponible debe ser 'true' o 'false'.", "INVALID_QUERY_PARAM");
      }
      filtros.disponible = disponible === "true";
    }

    res.status(200).json(medicosService.obtenerTodos(filtros));
  } catch (error) {
    next(error);
  }
}

export function obtenerMedico(req: Request, res: Response, next: NextFunction): void {
  try {
    const id = parseIdParam(req.params.id);
    const medico = medicosService.obtenerPorId(id);
    if (!medico) {
      throw new AppError(404, "Médico no encontrado.", "MEDICO_NOT_FOUND");
    }
    res.status(200).json(medico);
  } catch (error) {
    next(error);
  }
}

export function crearMedico(req: Request, res: Response, next: NextFunction): void {
  try {
    const { nombre, especialidad, matricula, disponible } = req.body;
    const nuevo = medicosService.crear({ nombre, especialidad, matricula, disponible });
    res.status(201).json(nuevo);
  } catch (error) {
    next(error);
  }
}

export function actualizarMedico(req: Request, res: Response, next: NextFunction): void {
  try {
    const id = parseIdParam(req.params.id);
    const actualizado = medicosService.actualizar(id, req.body);
    if (!actualizado) {
      throw new AppError(404, "Médico no encontrado.", "MEDICO_NOT_FOUND");
    }
    res.status(200).json(actualizado);
  } catch (error) {
    next(error);
  }
}

export function eliminarMedico(req: Request, res: Response, next: NextFunction): void {
  try {
    const id = parseIdParam(req.params.id);
    const eliminado = medicosService.eliminar(id);
    if (!eliminado) {
      throw new AppError(404, "Médico no encontrado.", "MEDICO_NOT_FOUND");
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
