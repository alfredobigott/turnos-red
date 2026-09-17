import { Router } from "express";
import * as medicosController from "../controllers/medicos.controller.js";
import { validateBody } from "../middleware/validateBody.js";
import { medicoBodyActualizacionSchema, medicoBodySchema } from "../schemas/medico.schema.js";

const router = Router();

router.get("/", medicosController.listarMedicos);
router.get("/:id", medicosController.obtenerMedico);
router.post("/", validateBody(medicoBodySchema), medicosController.crearMedico);
router.put("/:id", validateBody(medicoBodyActualizacionSchema), medicosController.actualizarMedico);
router.delete("/:id", medicosController.eliminarMedico);

export default router;
