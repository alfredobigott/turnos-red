# TurnosRed

Backend en Node.js + TypeScript + Express para centralizar la gestión de turnos de varios
centros de atención ambulatoria (clínica médica, pediatría, odontología y nutrición).
Lee un archivo JSON con formatos inconsistentes entre sedes, normaliza los datos, expone
una API REST con operaciones CRUD sobre turnos y médicos, valida los datos de entrada con
Zod, y retransmite los cambios de turnos en tiempo real por Socket.IO.

## Requisitos previos

- [Node.js LTS](https://nodejs.org/en/download) (probado con Node 22)
- [NVM](https://github.com/nvm-sh/nvm) (recomendado, para fijar la versión de Node con `.nvmrc`)
- npm (viene incluido con Node)
- Git
- Postman, Insomnia o cualquier cliente HTTP equivalente para probar la API

## Instalación

```bash
# 1. Clonar el repositorio
git clone <url-del-repositorio>
cd turnos-red

# 2. Usar la versión de Node del proyecto
nvm use

# 3. Instalar dependencias
npm install

# 4. Crear el archivo de variables de entorno a partir del ejemplo
cp .env.example .env

# 5. Compilar TypeScript -> JavaScript
npm run build

# 6. Levantar el servidor
npm start
```

El servidor queda escuchando en `http://localhost:3000` (o el puerto que definas en `.env`).
Un cliente de prueba de Socket.IO queda disponible en `http://localhost:3000/socket-test.html`
para ver los eventos de turnos en tiempo real sin usar Postman.

## Variables de entorno

| Variable                  | Descripción                                    | Valor por defecto      |
| -------------------------- | ------------------------------------------------ | ------------------------ |
| `PORT`                    | Puerto en el que escucha el servidor HTTP        | `3000`                   |
| `DATA_FILE_PATH`          | Ruta al archivo JSON con los turnos crudos       | `./data/turnos.json`     |
| `MEDICOS_DATA_FILE_PATH`  | Ruta al archivo JSON con los médicos             | `./data/medicos.json`    |

Copiá `.env.example` a `.env` y ajustá los valores si hace falta. `.env` nunca se sube al
repositorio (está en `.gitignore`); `.env.example` sí, como plantilla.

## Scripts de npm

| Script           | Comando                  | Qué hace                                                              |
| ----------------- | ------------------------- | ------------------------------------------------------------------------ |
| `npm run build`  | `tsc`                    | Compila `src/**/*.ts` a JavaScript en `dist/`, usando `tsconfig.json`.  |
| `npm start`      | `node dist/index.js`     | Corre el servidor ya compilado. Requiere haber corrido `build` antes.   |
| `npm run lint`   | `eslint . --ext .ts`     | Revisa el código fuente en busca de errores y malas prácticas.          |
| `npm run format` | `prettier --write .`     | Reformatea todos los archivos según las reglas de `.prettierrc`.        |

## Estructura de carpetas

```
turnos-red/
├── data/
│   ├── turnos.json                # Datos crudos de entrada (formatos inconsistentes)
│   └── medicos.json                # Datos de ejemplo de médicos
├── public/
│   └── socket-test.html            # Cliente mínimo para ver eventos de Socket.IO en vivo
├── src/
│   ├── index.ts                     # Punto de entrada: arma Express + Socket.IO
│   ├── models/
│   │   ├── turno.model.ts          # Interfaces TurnoCrudo/Turno, enum de especialidades, normalización
│   │   └── medico.model.ts         # Interface Medico
│   ├── schemas/
│   │   ├── turno.schema.ts         # Schema de Zod para el body de POST/PUT /turnos
│   │   └── medico.schema.ts        # Schema de Zod para el body de POST/PUT /medicos
│   ├── services/
│   │   ├── turnos.service.ts       # Lectura de datos, estado en memoria, CRUD, filtros, eventos
│   │   ├── medicos.service.ts      # Lectura de datos, estado en memoria, CRUD, filtros
│   │   └── ejemplo-callbacks.ts    # Ejemplo comparativo con callbacks (solo referencia)
│   ├── controllers/
│   │   ├── general.controller.ts   # GET "/" (bienvenida) y notFound (catch-all 404)
│   │   ├── turnos.controller.ts    # Maneja req/res y códigos de estado HTTP de /turnos
│   │   └── medicos.controller.ts   # Maneja req/res y códigos de estado HTTP de /medicos
│   ├── routes/
│   │   ├── turnos.routes.ts        # Define los endpoints REST de /turnos
│   │   └── medicos.routes.ts       # Define los endpoints REST de /medicos
│   ├── middleware/
│   │   ├── errorHandler.ts         # AppError + middleware de manejo de errores centralizado
│   │   └── validateBody.ts         # Middleware genérico de validación de body con Zod
│   └── utils/
│       └── parseIdParam.ts         # Helper para parsear/validar :id (sin uso actual, ver Manejo de errores)
├── dist/                            # Salida compilada (generada, no se versiona)
├── .env.example                     # Plantilla de variables de entorno
├── .nvmrc                           # Versión de Node del proyecto
├── tsconfig.json                    # Configuración del compilador de TypeScript
└── package.json
```

La separación sigue el flujo de una petición: **routes** decide qué URL dispara qué función,
un middleware de **schemas** (Zod) valida el body en POST/PUT antes de llegar al controller,
**controllers** interpreta la petición HTTP y arma la respuesta, **services** contiene la
lógica real (datos, normalización, filtros, eventos), y **models** define las formas de los
datos.

Las 5 funciones de `turnos.controller.ts` y las 5 de `medicos.controller.ts` siguen todas el
mismo patrón interno: son `async`, declaran al principio `let status = <código de éxito>`
(`200` para GET/PUT, `201` para POST, `204` para DELETE) y envuelven toda la lógica en un único
`try/catch` propio de la función. Cada validación (`:id` no numérico, campos obligatorios
faltantes en el body, recurso inexistente, query param inválido) reasigna `status` — y un
`code` en paralelo — justo antes de hacer `throw new Error("mensaje")`, y el propio `catch`
arma la respuesta con esa misma variable `status`, `error.message` y `code`. Ningún controller
llama `next(error)` ni lanza `AppError`; ver la sección **Manejo de errores** para el detalle.

## Manejo de errores

Todos los errores de la API responden con el mismo formato, pero ya no salen todos del mismo
lugar: hay tres caminos distintos según dónde se detecta el error.

```json
{
  "status": 400,
  "message": "Datos inválidos.",
  "code": "VALIDATION_ERROR",
  "details": []
}
```

- `status`: código HTTP de la respuesta.
- `message`: descripción legible del error.
- `code`: identificador corto y estable del tipo de error (p. ej. `VALIDATION_ERROR`,
  `MISSING_FIELDS`, `TURNO_NOT_FOUND`, `MEDICO_NOT_FOUND`, `INVALID_ID`,
  `INVALID_QUERY_PARAM`, `ROUTE_NOT_FOUND`, `INTERNAL_ERROR`).
- `details`: array con información adicional. Hoy solo lo llena la validación de Zod (ver
  abajo); en cualquier otro caso queda en `[]`.

### 1. Dentro de cada controller (`turnos.controller.ts`, `medicos.controller.ts`)

Las 5 funciones de cada controller ya no delegan sus errores esperables a un middleware
central: cada una tiene su propio `try/catch`, con `status` y `code` declarados como `let` al
principio de la función y reasignados justo antes de cada `throw new Error("mensaje")`
(id inválido, campos obligatorios faltantes, recurso no encontrado, query param inválido). El
`catch` de esa misma función arma la respuesta a mano con `res.status(status).json({ status,
message: error.message, code, details: [] })` — no hay clases de error custom ni `next(error)`
en este camino. `errorHandler.ts` no interviene acá salvo que algo realmente inesperado escape
del `try/catch` (por ejemplo, una excepción no prevista lanzada por la capa de servicios), en
cuyo caso sí llegaría como error 500 sin manejar — pero eso ya no es el flujo normal.

### 2. Validación de body en POST/PUT (`src/middleware/validateBody.ts`)

Este middleware corre *antes* de que la petición llegue al controller (ver `*.routes.ts`) y
sigue el esquema anterior: si el body no matchea el schema de Zod, arma un `AppError(400, ...,
"VALIDATION_ERROR", error.issues)` y llama a `next(error)`, que termina en el middleware
centralizado `src/middleware/errorHandler.ts` (mounted al final de `index.ts`, después de
`/turnos` y `/medicos`). Ahí es donde `details` se completa con los `issues` de Zod (incluyen
el campo exacto que falló en `path`).

### 3. Rutas no definidas (`src/controllers/general.controller.ts`)

`GET /` responde `{ "mensaje": "API de TurnosRed funcionando" }` con `200`. Cualquier
método/ruta que no matchee ni `/turnos`, ni `/medicos`, ni `/` cae en `notFound`, registrado
como el último `app.use()` de `index.ts` (después de ambos routers, antes de `errorHandler`),
que responde directamente `404` con `code: "ROUTE_NOT_FOUND"` y `message: "Ruta no encontrada:
<método> <url>"` — tampoco pasa por `errorHandler`.

`src/utils/parseIdParam.ts` (que lanzaba `AppError` para un `:id` no numérico) quedó sin uso:
turnos y médicos ahora validan el `:id` en línea dentro de su propio `try/catch`, para poder
setear `status`/`code` antes del `throw new Error(...)` sin depender de una clase de error
ajena a ese patrón.

Los endpoints de `/turnos` y `/medicos` responden únicamente con los códigos `200`, `201`,
`204`, `400`, `404` o `500`.

## Endpoint general

| Método   | Ruta   | Descripción                                  | Códigos de estado |
| -------- | ------ | ----------------------------------------------- | -------------------- |
| `GET`    | `/`    | Mensaje de bienvenida de la API                | `200`                 |
| `*`      | `*`    | Cualquier ruta/método no definido (catch-all)  | `404`                 |

## Endpoints de `/turnos`

| Método   | Ruta          | Descripción                   | Códigos de estado    |
| -------- | ------------- | ------------------------------- | ----------------------- |
| `GET`    | `/turnos`     | Lista turnos (admite filtros)   | `200`                    |
| `GET`    | `/turnos/:id` | Obtiene un turno por ID         | `200`, `400`, `404`      |
| `POST`   | `/turnos`     | Crea un nuevo turno             | `201`, `400`             |
| `PUT`    | `/turnos/:id` | Actualiza un turno existente    | `200`, `400`, `404`      |
| `DELETE` | `/turnos/:id` | Elimina un turno (sin body)     | `204`, `400`, `404`      |

`especialidad` debe ser uno de estos 4 valores exactos: `Clínica médica`, `Pediatría`,
`Odontología`, `Nutrición`. `fecha` en formato `YYYY-MM-DD` y `hora` en formato `HH:mm`.

### Filtros de `GET /turnos`

Se resuelven en la capa de servicios (`src/services/turnos.service.ts`), sin agregar
endpoints nuevos:

- `?especialidad=Pediatría` — turnos de esa especialidad.
- `?fecha=2026-08-15` — turnos en esa fecha.
- `?medicoId=2` — turnos asignados a ese médico.

Los filtros se pueden combinar, por ejemplo:

```
GET /turnos?especialidad=Pediatría&fecha=2026-08-15
GET /turnos?medicoId=2
```

## Endpoints de `/medicos`

| Método   | Ruta           | Descripción                   | Códigos de estado    |
| -------- | -------------- | ------------------------------- | ----------------------- |
| `GET`    | `/medicos`     | Lista médicos (admite filtros)  | `200`                    |
| `GET`    | `/medicos/:id` | Obtiene un médico por ID        | `200`, `400`, `404`      |
| `POST`   | `/medicos`     | Crea un nuevo médico            | `201`, `400`             |
| `PUT`    | `/medicos/:id` | Actualiza un médico existente   | `200`, `400`, `404`      |
| `DELETE` | `/medicos/:id` | Elimina un médico (sin body)    | `204`, `400`, `404`      |

Body: `nombre` (string), `especialidad` (mismo enum cerrado de 4 valores que turnos),
`matricula` (string) y `disponible` (boolean).

### Filtros de `GET /medicos`

Se resuelven en la capa de servicios (`src/services/medicos.service.ts`):

- `?especialidad=Odontología` — médicos de esa especialidad.
- `?disponible=true` o `?disponible=false` — médicos según su disponibilidad.

```
GET /medicos?especialidad=Odontología
GET /medicos?disponible=true
GET /medicos?especialidad=Nutrición&disponible=true
```

Cualquier error inesperado del servidor devuelve `500`.

## Eventos en tiempo real

Cada operación de escritura exitosa sobre un turno emite un evento interno con
`EventEmitter` (`turno:creado`, `turno:actualizado`, `turno:eliminado`), que a su vez se
retransmite por Socket.IO a todos los clientes conectados como `turno:nuevo`,
`turno:actualizado` y `turno:eliminado` respectivamente. Así, un cliente conectado ve los
cambios sin recargar la página ni hacer polling. Los médicos no emiten eventos por
Socket.IO.

## Uso de Inteligencia Artificial

| Tarea | Herramienta | Prompt | Respuesta generada | Ajuste manual aplicado |
|---|---|---|---|---|
| Middleware de errores + códigos HTTP estrictos | Claude Code | "Middleware centralizado de manejo de errores... /turnos debe responder 200/201/204/400/404/500 (DELETE pasa a 204)..." | Clase `AppError` (status/code/details), helper `parseIdParam`, refactor de los 5 controllers de Turno | Se verificó con pruebas manuales (curl/node fetch) que cada código de estado fuera el esperado antes de aceptar el cambio |
| Validación con Zod (Turno y Médico) | Claude Code | "Especialidad restringida a estos 4 valores exactos, tratalos como enum cerrado... 400 con el campo exacto que falló" | `turno.schema.ts` y `medico.schema.ts`, middleware de validación integrado con el formato de error estándar | Se confirmó que "Pediatria" (sin tilde) fallara y "Pediatría" pasara, ya que la consigna pedía un enum cerrado, no Title Case genérico |
| Colección de Postman con tests automáticos | Claude Code | "Generá la colección completa... con scripts pm.test... casos de especialidad inválida (400) y de id inexistente (404)" | `turnos-red.postman_collection.json` y el environment, con 12 requests y 24 tests | Hubo que regenerar los archivos una segunda vez porque la función "Work locally with Git" de Postman los convirtió a otro formato sin querer; también se corrigieron a mano los ids fijos (`turnoId`, `medicoId`) del entorno para que coincidieran con datos reales antes de correr el Collection Runner |
| Documentación del proyecto (CLAUDE.md y README) | Claude Code | `/init`, y luego "Actualizá README.md con requisitos, variables de entorno, estructura de carpetas y endpoints" | `CLAUDE.md` con la arquitectura completa, y README actualizado | Se le pidió regenerar `CLAUDE.md` una segunda vez para que reflejara los cambios de esta actividad (Zod, Médicos, filtros), en vez de quedar desactualizado |
