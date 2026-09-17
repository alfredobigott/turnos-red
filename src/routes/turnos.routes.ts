import { Router } from "express";
import * as turnosController from "../controllers/turnos.controller.js";
import { validateBody } from "../middleware/validateBody.js";
import { turnoBodyActualizacionSchema, turnoBodySchema } from "../schemas/turno.schema.js";

const router = Router();

router.get("/", turnosController.listarTurnos);
router.get("/:id", turnosController.obtenerTurno);
router.post("/", validateBody(turnoBodySchema), turnosController.crearTurno);
router.put("/:id", validateBody(turnoBodyActualizacionSchema), turnosController.actualizarTurno);
router.delete("/:id", turnosController.eliminarTurno);

export default router;
