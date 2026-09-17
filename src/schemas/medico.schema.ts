import { z } from "zod";
import { especialidadSchema } from "./turno.schema.js";

export const medicoBodySchema = z.object({
  nombre: z.string().trim().min(1, "nombre es obligatorio."),
  especialidad: especialidadSchema,
  matricula: z.string().trim().min(1, "matricula es obligatoria."),
  disponible: z.boolean(),
});

export const medicoBodyActualizacionSchema = medicoBodySchema.partial();
