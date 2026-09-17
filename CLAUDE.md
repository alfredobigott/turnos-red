# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Backend en Node.js + TypeScript + Express que centraliza turnos de varios centros de atención
ambulatoria (clínica médica, pediatría, odontología, nutrición). Lee un JSON con formatos
inconsistentes por sede, normaliza los datos, expone una API REST CRUD sobre `/turnos` y
`/medicos` validada con Zod, y retransmite los cambios de turnos en tiempo real por Socket.IO.

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

| Variable                  | Descripción                          | Default                 |
| -------------------------- | -------------------------------------- | -------------------------- |
| `PORT`                    | Puerto HTTP                            | `3000`                     |
| `DATA_FILE_PATH`          | Ruta al JSON crudo con los turnos      | `./data/turnos.json`       |
| `MEDICOS_DATA_FILE_PATH`  | Ruta al JSON con los médicos           | `./data/medicos.json`      |

## Architecture

Standard layered flow, one direction only — **routes → schema-validation middleware →
controllers → services → models**. The `turnos` and `medicos` resources are parallel
implementations of this same pattern; read one to understand the other.

- `src/routes/{turnos,medicos}.routes.ts` — map HTTP verb+path to controller functions. POST/PUT
  routes run `validateBody(schema)` before the controller.
- `src/schemas/{turno,medico}.schema.ts` — Zod schemas for the POST/PUT request body (not for the
  raw bulk-load JSON — see normalization below). `turno.schema.ts` exports `especialidadSchema`
  (built from `ESPECIALIDADES` in `turno.model.ts`), which `medico.schema.ts` re-imports so both
  resources share one closed enum: `"Clínica médica"`, `"Pediatría"`, `"Odontología"`,
  `"Nutrición"`. Each schema also exports a `.partial()` variant for PUT.
- `src/middleware/validateBody.ts` — generic `validateBody(schema)` factory; on failure calls
  `next(new AppError(400, ..., "VALIDATION_ERROR", error.issues))`, i.e. `details` is the raw Zod
  `issues` array (has `.path` per failing field). On success it overwrites `req.body` with the
  parsed/defaulted data.
- `src/middleware/errorHandler.ts` — exports `AppError` (`status`, `message`, `code`, `details`)
  and the centralized `errorHandler` middleware (mounted last in `index.ts`, after both routers).
  Every error response — validation, not-found, bad id, or an uncaught exception — has the same
  shape: `{ status, message, code, details }`. Controllers never call `res.status(...).json(...)`
  for errors directly; they `throw new AppError(...)` (or let it come from `validateBody`) inside
  a try/catch and call `next(error)`.
- `src/utils/parseIdParam.ts` — shared `parseIdParam(req.params.id)` helper used by both
  controllers; throws `AppError(400, ..., "INVALID_ID")` if not an integer.
- `src/controllers/{turnos,medicos}.controller.ts` — parse req/res, translate query params into a
  `Filtros*` object for the service, set status codes. Talks only to the service layer.
- `src/services/turnos.service.ts` — owns state: an in-memory `Turno[]` array loaded once at
  startup from `DATA_FILE_PATH`, CRUD logic, `obtenerTodos(filtros?: FiltrosTurnos)` (filters by
  `especialidad`/`fecha`/`medicoId`, all optional/combinable), and the internal event bus
  (`EventEmitter`, exported as `eventosTurnos`). Every successful write emits an internal event:
  `turno:creado`, `turno:actualizado`, `turno:eliminado`.
- `src/services/medicos.service.ts` — same in-memory-array-plus-CRUD pattern loaded from
  `MEDICOS_DATA_FILE_PATH`, with `obtenerTodos(filtros?: FiltrosMedicos)` (filters by
  `especialidad`/`disponible`). No event emitter — médicos don't broadcast over Socket.IO.
- `src/models/turno.model.ts` — defines `ESPECIALIDADES` (the closed enum, source of truth that
  the schemas import), `TurnoCrudo` (loose/optional shape as it arrives from the source JSON,
  since each site's data is formatted differently) vs `Turno` (the normalized, guaranteed-valid
  shape used everywhere else, with an optional `medicoId`). `normalizarTurno`/`normalizarTurnos`
  convert one into the other, silently dropping records that don't meet minimum validity and
  logging an accepted/rejected count.
- `src/models/medico.model.ts` — just the `Medico` interface; `data/medicos.json` is
  hand-authored in the canonical shape already, so unlike turnos there's no raw/normalization
  step — the service reads and trusts it directly.
- `src/index.ts` — composition root: builds the Express app, mounts `/turnos` then `/medicos`,
  then the `errorHandler` (must stay last), creates the raw `http.Server` + `socket.io` `Server`
  on top of it, and bridges the internal `eventosTurnos` EventEmitter to Socket.IO broadcasts.
  Note the internal event names differ from the emitted ones: `turno:creado` (internal) →
  `turno:nuevo` (broadcast to clients), while `turno:actualizado`/`turno:eliminado` keep the same
  name on both sides. Only after both `inicializarTurnos()` and `inicializarMedicos()` resolve
  (`Promise.all`) does the HTTP server start listening.

State is in-memory only (no database) — restarting the process reloads from the JSON files and
discards any writes made through the API.

`src/services/ejemplo-callbacks.ts` is a reference-only alternate implementation of the file read
using Node's old callback style instead of promises; it is not wired into the real server and
exists purely for comparison.

### Data normalization rules (src/models/turno.model.ts)

Incoming raw turno records may vary in type/format per site. Normalization requires, or a record
is rejected outright (returns `null`, does not throw):

- `id`: coerced to a positive integer.
- `paciente`, `documento`, `especialidad`: coerced to non-empty trimmed strings. `especialidad` is
  additionally canonicalized case/accent-insensitively against `ESPECIALIDADES` when it matches
  one of the 4 known values (e.g. raw `"PEDIATRÍA"` becomes `"Pediatría"`); if it doesn't match
  any of them, the trimmed raw value is kept as-is rather than rejecting the record.
- `fecha`: must match `DD/MM/YYYY`, converted to `YYYY-MM-DD`.
- `hora`: must match `H(:|.)MM` or `HH(:|.)MM`, converted to zero-padded `HH:mm`.
- `confirmado`: permissively coerced from bool/number/string (`"si"`, `"sí"`, `"true"`, `"1"`,
  `"yes"` → `true`), defaults to `false` if unrecognized — this field never rejects a record.
- `medicoId`: optional; coerced to a positive integer if present and valid, otherwise omitted
  (never rejects the record).

Note the POST/PUT API body schemas (`src/schemas/*.schema.ts`) are a separate, stricter contract
for clients of the already-clean API — e.g. they require `fecha`/`hora` already in canonical
`YYYY-MM-DD`/`HH:mm` form and `especialidad` to be exactly one of the 4 enum values, with no
per-site leniency.

### API

Every endpoint under `/turnos` and `/medicos` responds with exactly one of `200`, `201`, `204`,
`400`, `404`, `500`. `DELETE` returns `204` with no body. All errors — including 404s and bad
`:id`/query params — go through `AppError` → `errorHandler` and share the
`{ status, message, code, details }` shape (see Architecture above).

| Método   | Ruta           | Descripción                    | Códigos             |
| -------- | -------------- | -------------------------------- | -------------------- |
| `GET`    | `/turnos`      | Lista turnos (admite filtros)    | `200`                 |
| `GET`    | `/turnos/:id`  | Obtiene un turno por ID          | `200`, `400`, `404`   |
| `POST`   | `/turnos`      | Crea un nuevo turno              | `201`, `400`          |
| `PUT`    | `/turnos/:id`  | Actualiza un turno existente     | `200`, `400`, `404`   |
| `DELETE` | `/turnos/:id`  | Elimina un turno (sin body)      | `204`, `400`, `404`   |
| `GET`    | `/medicos`     | Lista médicos (admite filtros)   | `200`                 |
| `GET`    | `/medicos/:id` | Obtiene un médico por ID         | `200`, `400`, `404`   |
| `POST`   | `/medicos`     | Crea un nuevo médico             | `201`, `400`          |
| `PUT`    | `/medicos/:id` | Actualiza un médico existente    | `200`, `400`, `404`   |
| `DELETE` | `/medicos/:id` | Elimina un médico (sin body)     | `204`, `400`, `404`   |

`GET /turnos` query filters (combinable): `?especialidad=`, `?fecha=` (YYYY-MM-DD),
`?medicoId=`. `GET /medicos` query filters: `?especialidad=`, `?disponible=true|false`.

## Module system

`"type": "module"` (ESM). TypeScript compiles with `module`/`moduleResolution: NodeNext`, so
relative imports between local files must use the `.js` extension (matching the compiled output),
even though the source files are `.ts` — e.g. `import ... from "../services/turnos.service.js"`.
