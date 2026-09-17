import "dotenv/config";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import turnosRoutes from "./routes/turnos.routes.js";
import medicosRoutes from "./routes/medicos.routes.js";
import { eventosTurnos, inicializarTurnos } from "./services/turnos.service.js";
import { inicializarMedicos } from "./services/medicos.service.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
app.use(express.json());
app.use(express.static("public"));
app.use("/turnos", turnosRoutes);
app.use("/medicos", medicosRoutes);

// Middleware de manejo de errores: siempre al final, siempre 4 parámetros.
app.use(errorHandler);

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

// Conecta el EventEmitter interno con Socket.IO (consigna 9.b).
// Nota: el nombre interno es "turno:creado", pero lo que se retransmite
// al cliente se llama "turno:nuevo" -- así lo pide la consigna.
eventosTurnos.on("turno:creado", (turno) => io.emit("turno:nuevo", turno));
eventosTurnos.on("turno:actualizado", (turno) => io.emit("turno:actualizado", turno));
eventosTurnos.on("turno:eliminado", (turno) => io.emit("turno:eliminado", turno));

io.on("connection", (socket) => {
  console.log(`Cliente conectado por socket: ${socket.id}`);
});

const PUERTO = Number(process.env.PORT) || 3000;
const RUTA_DATOS_TURNOS = process.env.DATA_FILE_PATH ?? "./data/turnos.json";
const RUTA_DATOS_MEDICOS = process.env.MEDICOS_DATA_FILE_PATH ?? "./data/medicos.json";

Promise.all([inicializarTurnos(RUTA_DATOS_TURNOS), inicializarMedicos(RUTA_DATOS_MEDICOS)])
  .then(() => {
    httpServer.listen(PUERTO, () => {
      console.log(`Servidor escuchando en http://localhost:${PUERTO}`);
      console.log(`Cliente de prueba de sockets en http://localhost:${PUERTO}/socket-test.html`);
    });
  })
  .catch((error) => {
    console.error("No se pudo inicializar el servidor:", error);
    process.exit(1);
  });
