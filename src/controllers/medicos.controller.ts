import type { Request, Response } from "express";
import * as medicosService from "../services/medicos.service.js";
import type { FiltrosMedicos } from "../services/medicos.service.js";

export async function listarMedicos(req: Request, res: Response): Promise<Response> {
  let status = 200;
  let code = "INTERNAL_ERROR";
  try {
    const { especialidad, disponible } = req.query;
    const filtros: FiltrosMedicos = {};

    if (typeof especialidad === "string" && especialidad.trim() !== "") {
      filtros.especialidad = especialidad;
    }

    if (typeof disponible === "string" && disponible.trim() !== "") {
      if (disponible !== "true" && disponible !== "false") {
        status = 400;
        code = "INVALID_QUERY_PARAM";
        throw new Error("disponible debe ser 'true' o 'false'.");
      }
      filtros.disponible = disponible === "true";
    }

    return res.status(status).json(medicosService.obtenerTodos(filtros));
  } catch (error) {
    return res.status(status).json({
      status,
      message: (error as Error).message,
      code,
      details: [],
    });
  }
}

export async function obtenerMedico(req: Request, res: Response): Promise<Response> {
  let status = 200;
  let code = "INTERNAL_ERROR";
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      status = 400;
      code = "INVALID_ID";
      throw new Error("El id debe ser un número entero.");
    }

    const medico = medicosService.obtenerPorId(id);
    if (!medico) {
      status = 404;
      code = "MEDICO_NOT_FOUND";
      throw new Error("Médico no encontrado.");
    }

    return res.status(status).json(medico);
  } catch (error) {
    return res.status(status).json({
      status,
      message: (error as Error).message,
      code,
      details: [],
    });
  }
}

export async function crearMedico(req: Request, res: Response): Promise<Response> {
  let status = 201;
  let code = "INTERNAL_ERROR";
  try {
    const { nombre, especialidad, matricula, disponible } = req.body;

    if (!nombre || !especialidad || !matricula) {
      status = 400;
      code = "MISSING_FIELDS";
      throw new Error("Faltan campos obligatorios.");
    }

    const nuevo = medicosService.crear({ nombre, especialidad, matricula, disponible });

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

export async function actualizarMedico(req: Request, res: Response): Promise<Response> {
  let status = 200;
  let code = "INTERNAL_ERROR";
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      status = 400;
      code = "INVALID_ID";
      throw new Error("El id debe ser un número entero.");
    }

    const actualizado = medicosService.actualizar(id, req.body);
    if (!actualizado) {
      status = 404;
      code = "MEDICO_NOT_FOUND";
      throw new Error("Médico no encontrado.");
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

export async function eliminarMedico(req: Request, res: Response): Promise<Response> {
  let status = 204;
  let code = "INTERNAL_ERROR";
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      status = 400;
      code = "INVALID_ID";
      throw new Error("El id debe ser un número entero.");
    }

    const eliminado = medicosService.eliminar(id);
    if (!eliminado) {
      status = 404;
      code = "MEDICO_NOT_FOUND";
      throw new Error("Médico no encontrado.");
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
