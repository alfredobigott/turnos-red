import { Router } from "express";
import * as turnosController from "../controllers/turnos.controller.js";

const router = Router();

router.get("/", turnosController.listarTurnos);
router.get("/:id", turnosController.obtenerTurno);
router.post("/", turnosController.crearTurno);
router.put("/:id", turnosController.actualizarTurno);
router.delete("/:id", turnosController.eliminarTurno);

export default router;
