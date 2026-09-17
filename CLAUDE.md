# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Backend en Node.js + TypeScript + Express que centraliza turnos de varios centros de atención
ambulatoria (clínica médica, pediatría, odontología, nutrición). Lee un JSON con formatos
inconsistentes por sede, normaliza los datos, expone una API REST CRUD sobre `/turnos`, y
retransmite los cambios en tiempo real por Socket.IO.

Comments and identifiers in this codebase are in Spanish — match that when adding code.

## Commands

```bash
nvm use             # usa la versión de Node fijada en .nvmrc
npm install
cp .env.example .env
npm run build        # tsc: compila src/**/*.ts -> dist/
npm start             # node dist/index.js (requiere build previo)
npm run lint          # eslint . --ext .ts
npm run format        # prettier --write .
```

There is no test suite/runner configured in this repo.

The server listens on `http://localhost:3000` by default. A Socket.IO test client is served at
`http://localhost:3000/socket-test.html`.

### Environment variables

| Variable         | Descripción                             | Default               |
| ---------------- | ---------------------------------------- | ---------------------- |
| `PORT`           | Puerto HTTP                              | `3000`                 |
| `DATA_FILE_PATH` | Ruta al JSON crudo con los turnos        | `./data/turnos.json`   |

## Architecture

Standard layered flow, one direction only — **routes → controllers → services → models**:

- `src/routes/turnos.routes.ts` — maps HTTP verb+path to controller functions.
- `src/controllers/turnos.controller.ts` — parses req/res, validates params/body shape, sets
  status codes. Talks only to the service layer, never touches the data file or in-memory store
  directly.
- `src/services/turnos.service.ts` — owns the actual state: an in-memory `Turno[]` array loaded
  once at startup from the JSON file, plus all CRUD logic and the internal event bus
  (`EventEmitter`, exported as `eventosTurnos`). Every successful write emits an internal event:
  `turno:creado`, `turno:actualizado`, `turno:eliminado`.
- `src/models/turno.model.ts` — defines `TurnoCrudo` (loose/optional shape as it arrives from the
  source JSON, since each site's data is formatted differently) vs `Turno` (the normalized,
  guaranteed-valid shape used everywhere else). `normalizarTurno`/`normalizarTurnos` convert one
  into the other, silently dropping records that don't meet minimum validity (missing required
  field, unparseable date/time) and logging an accepted/rejected count.
- `src/index.ts` — composition root: builds the Express app, wires the error-handling middleware
  (last in the chain, 4-arg signature), creates the raw `http.Server` + `socket.io` `Server` on
  top of it, and bridges the internal `eventosTurnos` EventEmitter to Socket.IO broadcasts. Note
  the internal event names differ from the emitted ones: `turno:creado` (internal) → `turno:nuevo`
  (broadcast to clients), while `turno:actualizado`/`turno:eliminado` keep the same name on both
  sides. Only after `inicializarTurnos()` resolves does the HTTP server start listening.

State is in-memory only (no database) — restarting the process reloads from `DATA_FILE_PATH` and
discards any writes made through the API.

`src/services/ejemplo-callbacks.ts` is a reference-only alternate implementation of the file read
using Node's old callback style instead of promises; it is not wired into the real server and
exists purely for comparison.

### Data normalization rules (src/models/turno.model.ts)

Incoming raw records may vary in type/format per site. Normalization requires, or a record is
rejected outright (returns `null`, does not throw):

- `id`: coerced to a positive integer.
- `paciente`, `documento`, `especialidad`: coerced to non-empty trimmed strings.
- `fecha`: must match `DD/MM/YYYY`, converted to `YYYY-MM-DD`.
- `hora`: must match `H(:|.)MM` or `HH(:|.)MM`, converted to zero-padded `HH:mm`.
- `confirmado`: permissively coerced from bool/number/string (`"si"`, `"sí"`, `"true"`, `"1"`,
  `"yes"` → `true`), defaults to `false` if unrecognized — this field never rejects a record.

### API

All under `/turnos`. Any uncaught error falls through to the global error middleware in
`index.ts` and returns `500`.

| Método   | Ruta          | Descripción                 | Códigos             |
| -------- | ------------- | ---------------------------- | -------------------- |
| `GET`    | `/turnos`     | Lista todos los turnos       | `200`                 |
| `GET`    | `/turnos/:id` | Obtiene un turno por ID      | `200`, `400`, `404`   |
| `POST`   | `/turnos`     | Crea un nuevo turno          | `201`, `400`          |
| `PUT`    | `/turnos/:id` | Actualiza un turno existente | `200`, `400`, `404`   |
| `DELETE` | `/turnos/:id` | Elimina un turno             | `200`, `400`, `404`   |

## Module system

`"type": "module"` (ESM). TypeScript compiles with `module`/`moduleResolution: NodeNext`, so
relative imports between local files must use the `.js` extension (matching the compiled output),
even though the source files are `.ts` — e.g. `import ... from "../services/turnos.service.js"`.
