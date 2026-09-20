import type { Request, Response } from "express";
import * as turnosService from "../services/turnos.service.js";
import type { FiltrosTurnos } from "../services/turnos.service.js";

export async function listarTurnos(req: Request, res: Response): Promise<Response> {
  let status = 200;
  let code = "INTERNAL_ERROR";
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
        status = 400;
        code = "INVALID_QUERY_PARAM";
        throw new Error("medicoId debe ser un número entero.");
      }
      filtros.medicoId = medicoIdNumero;
    }

    return res.status(status).json(turnosService.obtenerTodos(filtros));
  } catch (error) {
    return res.status(status).json({
      status,
      message: (error as Error).message,
      code,
      details: [],
    });
  }
}

export async function obtenerTurno(req: Request, res: Response): Promise<Response> {
  let status = 200;
  let code = "INTERNAL_ERROR";
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      status = 400;
      code = "INVALID_ID";
      throw new Error("El id debe ser un número entero.");
    }

    const turno = turnosService.obtenerPorId(id);
    if (!turno) {
      status = 404;
      code = "TURNO_NOT_FOUND";
      throw new Error("Turno no encontrado.");
    }

    return res.status(status).json(turno);
  } catch (error) {
    return res.status(status).json({
      status,
      message: (error as Error).message,
      code,
      details: [],
    });
  }
}

export async function crearTurno(req: Request, res: Response): Promise<Response> {
  let status = 201;
  let code = "INTERNAL_ERROR";
  try {
    const { paciente, documento, especialidad, fecha, hora, confirmado, observaciones, medicoId } =
      req.body;

    if (!paciente || !documento || !especialidad || !fecha || !hora) {
      status = 400;
      code = "MISSING_FIELDS";
      throw new Error("Faltan campos obligatorios.");
    }

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

    return res.status(status).json(nuevo);
  } catch (error) {
    return res.status(status).json({
      status,
      message: (error as Error).message,
      code,
      details: [],
    });
  }
}

export async function actualizarTurno(req: Request, res: Response): Promise<Response> {
  let status = 200;
  let code = "INTERNAL_ERROR";
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      status = 400;
      code = "INVALID_ID";
      throw new Error("El id debe ser un número entero.");
    }

    const actualizado = turnosService.actualizar(id, req.body);
    if (!actualizado) {
      status = 404;
      code = "TURNO_NOT_FOUND";
      throw new Error("Turno no encontrado.");
    }

    return res.status(status).json(actualizado);
  } catch (error) {
    return res.status(status).json({
      status,
      message: (error as Error).message,
      code,
      details: [],
    });
  }
}

export async function eliminarTurno(req: Request, res: Response): Promise<Response> {
  let status = 204;
  let code = "INTERNAL_ERROR";
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      status = 400;
      code = "INVALID_ID";
      throw new Error("El id debe ser un número entero.");
    }

    const eliminado = turnosService.eliminar(id);
    if (!eliminado) {
      status = 404;
      code = "TURNO_NOT_FOUND";
      throw new Error("Turno no encontrado.");
    }

    return res.status(status).send();
  } catch (error) {
    return res.status(status).json({
      status,
      message: (error as Error).message,
      code,
      details: [],
    });
  }
}
