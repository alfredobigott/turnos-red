import { z } from "zod";
import { ESPECIALIDADES } from "../models/turno.model.js";

export const especialidadSchema = z.enum(ESPECIALIDADES);

// Forma que debe tener el body de POST/PUT /turnos. A diferencia de la
// carga masiva inicial (turno.model.ts), acá el cliente de la API ya debe
// mandar los datos en formato canónico (fecha YYYY-MM-DD, hora HH:mm).
export const turnoBodySchema = z.object({
  paciente: z.string().trim().min(1, "paciente es obligatorio."),
  documento: z.string().trim().min(1, "documento es obligatorio."),
  especialidad: especialidadSchema,
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "fecha debe tener formato YYYY-MM-DD."),
  hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "hora debe tener formato HH:mm."),
  confirmado: z.boolean().optional().default(false),
  observaciones: z.string().trim().optional(),
  medicoId: z.number().int().positive().optional(),
});

export const turnoBodyActualizacionSchema = turnoBodySchema.partial();
