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

# 5. Levantar el servidor en modo desarrollo (compila y arranca en un solo paso)
npm run dev
```

El servidor queda escuchando en `http://localhost:3000` (o el puerto que definas en `.env`).
Un cliente de prueba de Socket.IO queda disponible en `http://localhost:3000/socket-test.html`
para ver los eventos de turnos en tiempo real sin usar Postman.

### Ejecución en desarrollo

`npm run dev` es el comando pensado para el día a día: compila TypeScript con `tsc` y a
continuación arranca el servidor ya compilado (`node dist/index.js`), en un solo paso. Repetirlo
después de cada cambio en `src/**/*.ts` recompila y reinicia el servidor con el código
actualizado.

Si preferís separar los pasos (por ejemplo, para levantar el servidor varias veces sin
recompilar), podés usar `npm run build` seguido de `npm start` — son los mismos dos pasos que
ejecuta `npm run dev`, pero por separado.

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
| `npm run dev`    | `tsc && node dist/index.js` | Comando de arranque en desarrollo: compila y levanta el servidor en un solo paso. |
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

## Endpoints de la API

Referencia completa de los 12 endpoints reales del proyecto: 2 del controller general
(`src/controllers/general.controller.ts`), 5 de `/turnos`
(`src/routes/turnos.routes.ts` + `src/controllers/turnos.controller.ts`) y 5 de `/medicos`
(`src/routes/medicos.routes.ts` + `src/controllers/medicos.controller.ts`).

`especialidad` es siempre uno de estos 4 valores exactos (enum cerrado, ver
`src/schemas/turno.schema.ts`): `Clínica médica`, `Pediatría`, `Odontología`, `Nutrición`.

En las tablas de códigos de estado, `500` corresponde siempre al mismo caso: un error
verdaderamente inesperado que escapa al `try/catch` propio del controller (por ejemplo, una
falla al serializar la respuesta) y termina en el `errorHandler` centralizado
(`src/middleware/errorHandler.ts`), con `code: "INTERNAL_ERROR"`.

### Endpoint general

#### `GET /`

Mensaje de bienvenida de la API, útil para chequear que el servidor está levantado.

- **Path params:** ninguno.
- **Query params:** ninguno.
- **Body:** no aplica.

Respuesta `200`:
```json
{ "mensaje": "API de TurnosRed funcionando" }
```

| Código | Cuándo ocurre |
| ------ | --------------- |
| `200`  | Siempre; este endpoint no tiene condiciones de error. |

#### `* /*` (catch-all)

Cualquier combinación de método + ruta que no matchee `/`, `/turnos*` ni `/medicos*`
(registrado como el último `app.use()` de `src/index.ts`, antes del `errorHandler`).

- **Path params:** cualquiera (no matchea ninguna ruta definida).
- **Query params:** no aplica.
- **Body:** no aplica.

Respuesta `404` de ejemplo (`GET /no-existe`):
```json
{
  "status": 404,
  "message": "Ruta no encontrada: GET /no-existe",
  "code": "ROUTE_NOT_FOUND",
  "details": []
}
```

| Código | Cuándo ocurre |
| ------ | --------------- |
| `404`  | Siempre; es el único código que devuelve este handler. |

### Endpoints de `/turnos`

#### `GET /turnos`

Lista todos los turnos en memoria, opcionalmente filtrados.

- **Path params:** ninguno.
- **Query params** (todos opcionales, combinables entre sí):
  - `especialidad` (string) — turnos de esa especialidad.
  - `fecha` (string, `YYYY-MM-DD`) — turnos en esa fecha.
  - `medicoId` (string numérica) — turnos asignados a ese médico; debe representar un entero.
- **Body:** no aplica.

```
GET /turnos?especialidad=Pediatría&fecha=2026-08-15
GET /turnos?medicoId=2
```

| Código | Cuándo ocurre |
| ------ | --------------- |
| `200`  | Petición válida; devuelve el array de turnos (vacío si ningún turno matchea los filtros). |
| `400`  | `medicoId` viene en la query pero no representa un número entero (`code: "INVALID_QUERY_PARAM"`). |
| `500`  | Error inesperado no capturado por el `try/catch` del controller. |

#### `GET /turnos/:id`

Obtiene un turno puntual por ID.

- **Path params:** `id` (entero) — id del turno.
- **Query params:** ninguno.
- **Body:** no aplica.

| Código | Cuándo ocurre |
| ------ | --------------- |
| `200`  | Existe un turno con ese `id`; lo devuelve. |
| `400`  | `id` no es un número entero (`code: "INVALID_ID"`). |
| `404`  | No existe ningún turno con ese `id` (`code: "TURNO_NOT_FOUND"`). |
| `500`  | Error inesperado no capturado por el `try/catch` del controller. |

#### `POST /turnos`

Crea un nuevo turno. El body pasa primero por `validateBody(turnoBodySchema)`
(`src/schemas/turno.schema.ts`) antes de llegar al controller.

- **Path params:** ninguno.
- **Query params:** ninguno.
- **Body** (JSON, campo entre paréntesis indica si es obligatorio u opcional según el schema):
```json
{
  "paciente": "Marcos Peña",
  "documento": "38112233",
  "especialidad": "Pediatría",
  "fecha": "2026-08-15",
  "hora": "10:30",
  "confirmado": false,
  "observaciones": "Control de rutina",
  "medicoId": 2
}
```
  - `paciente` (obligatorio, string no vacío)
  - `documento` (obligatorio, string no vacío)
  - `especialidad` (obligatorio, uno de los 4 valores del enum)
  - `fecha` (obligatorio, `YYYY-MM-DD`)
  - `hora` (obligatorio, `HH:mm`)
  - `confirmado` (opcional, boolean, default `false`)
  - `observaciones` (opcional, string)
  - `medicoId` (opcional, entero positivo)

| Código | Cuándo ocurre |
| ------ | --------------- |
| `201`  | Turno creado; devuelve el turno con el `id` asignado por el service. |
| `400`  | El body no matchea `turnoBodySchema` — falta un campo obligatorio, `especialidad` no es uno de los 4 valores, `fecha`/`hora` no cumplen el formato, `medicoId` no es un entero positivo, etc. (`code: "VALIDATION_ERROR"`, `details` trae los `issues` de Zod con el campo exacto). También cubre, ya dentro del controller, el chequeo redundante de `paciente`/`documento`/`especialidad`/`fecha`/`hora` faltantes (`code: "MISSING_FIELDS"`), inalcanzable en la práctica porque Zod ya los exige antes. |
| `500`  | Error inesperado no capturado por el `try/catch` del controller. |

#### `PUT /turnos/:id`

Actualiza parcialmente un turno existente. El body pasa por
`validateBody(turnoBodyActualizacionSchema)`, la versión `.partial()` del schema de POST (todos
los campos opcionales, pero si vienen deben cumplir el mismo formato).

- **Path params:** `id` (entero) — id del turno a actualizar.
- **Query params:** ninguno.
- **Body** (JSON, cualquier subconjunto de los campos de `POST /turnos`), por ejemplo:
```json
{
  "hora": "11:00",
  "confirmado": true,
  "medicoId": 3
}
```

| Código | Cuándo ocurre |
| ------ | --------------- |
| `200`  | Turno actualizado; devuelve el turno con los cambios aplicados. |
| `400`  | El body no matchea `turnoBodyActualizacionSchema` (`code: "VALIDATION_ERROR"`) o `id` no es un número entero (`code: "INVALID_ID"`). |
| `404`  | No existe ningún turno con ese `id` (`code: "TURNO_NOT_FOUND"`). |
| `500`  | Error inesperado no capturado por el `try/catch` del controller. |

#### `DELETE /turnos/:id`

Elimina un turno existente. No devuelve body.

- **Path params:** `id` (entero) — id del turno a eliminar.
- **Query params:** ninguno.
- **Body:** no aplica.

| Código | Cuándo ocurre |
| ------ | --------------- |
| `204`  | Turno eliminado; respuesta sin body. |
| `400`  | `id` no es un número entero (`code: "INVALID_ID"`). |
| `404`  | No existe ningún turno con ese `id` (`code: "TURNO_NOT_FOUND"`). |
| `500`  | Error inesperado no capturado por el `try/catch` del controller. |

### Endpoints de `/medicos`

#### `GET /medicos`

Lista todos los médicos en memoria, opcionalmente filtrados.

- **Path params:** ninguno.
- **Query params** (todos opcionales, combinables entre sí):
  - `especialidad` (string) — médicos de esa especialidad.
  - `disponible` (string) — debe ser exactamente `"true"` o `"false"`.
- **Body:** no aplica.

```
GET /medicos?especialidad=Odontología
GET /medicos?disponible=true
GET /medicos?especialidad=Nutrición&disponible=true
```

| Código | Cuándo ocurre |
| ------ | --------------- |
| `200`  | Petición válida; devuelve el array de médicos (vacío si ninguno matchea los filtros). |
| `400`  | `disponible` viene en la query pero no es `"true"` ni `"false"` (`code: "INVALID_QUERY_PARAM"`). |
| `500`  | Error inesperado no capturado por el `try/catch` del controller. |

#### `GET /medicos/:id`

Obtiene un médico puntual por ID.

- **Path params:** `id` (entero) — id del médico.
- **Query params:** ninguno.
- **Body:** no aplica.

| Código | Cuándo ocurre |
| ------ | --------------- |
| `200`  | Existe un médico con ese `id`; lo devuelve. |
| `400`  | `id` no es un número entero (`code: "INVALID_ID"`). |
| `404`  | No existe ningún médico con ese `id` (`code: "MEDICO_NOT_FOUND"`). |
| `500`  | Error inesperado no capturado por el `try/catch` del controller. |

#### `POST /medicos`

Crea un nuevo médico. El body pasa primero por `validateBody(medicoBodySchema)`
(`src/schemas/medico.schema.ts`) antes de llegar al controller.

- **Path params:** ninguno.
- **Query params:** ninguno.
- **Body** (JSON, todos los campos son obligatorios en este schema):
```json
{
  "nombre": "Dra. Ana Gómez",
  "especialidad": "Odontología",
  "matricula": "MP12345",
  "disponible": true
}
```
  - `nombre` (obligatorio, string no vacío)
  - `especialidad` (obligatorio, uno de los 4 valores del enum, mismo `especialidadSchema` que turnos)
  - `matricula` (obligatorio, string no vacío)
  - `disponible` (obligatorio, boolean)

| Código | Cuándo ocurre |
| ------ | --------------- |
| `201`  | Médico creado; devuelve el médico con el `id` asignado por el service. |
| `400`  | El body no matchea `medicoBodySchema` — falta un campo, `especialidad` no es uno de los 4 valores, `disponible` no es boolean, etc. (`code: "VALIDATION_ERROR"`). También cubre, ya dentro del controller, el chequeo redundante de `nombre`/`especialidad`/`matricula` faltantes (`code: "MISSING_FIELDS"`), inalcanzable en la práctica porque Zod ya los exige antes. |
| `500`  | Error inesperado no capturado por el `try/catch` del controller. |

#### `PUT /medicos/:id`

Actualiza parcialmente un médico existente. El body pasa por
`validateBody(medicoBodyActualizacionSchema)`, la versión `.partial()` del schema de POST (todos
los campos opcionales, pero si vienen deben cumplir el mismo formato).

- **Path params:** `id` (entero) — id del médico a actualizar.
- **Query params:** ninguno.
- **Body** (JSON, cualquier subconjunto de los campos de `POST /medicos`), por ejemplo:
```json
{ "disponible": false }
```

| Código | Cuándo ocurre |
| ------ | --------------- |
| `200`  | Médico actualizado; devuelve el médico con los cambios aplicados. |
| `400`  | El body no matchea `medicoBodyActualizacionSchema` (`code: "VALIDATION_ERROR"`) o `id` no es un número entero (`code: "INVALID_ID"`). |
| `404`  | No existe ningún médico con ese `id` (`code: "MEDICO_NOT_FOUND"`). |
| `500`  | Error inesperado no capturado por el `try/catch` del controller. |

#### `DELETE /medicos/:id`

Elimina un médico existente. No devuelve body.

- **Path params:** `id` (entero) — id del médico a eliminar.
- **Query params:** ninguno.
- **Body:** no aplica.

| Código | Cuándo ocurre |
| ------ | --------------- |
| `204`  | Médico eliminado; respuesta sin body. |
| `400`  | `id` no es un número entero (`code: "INVALID_ID"`). |
| `404`  | No existe ningún médico con ese `id` (`code: "MEDICO_NOT_FOUND"`). |
| `500`  | Error inesperado no capturado por el `try/catch` del controller. |

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
