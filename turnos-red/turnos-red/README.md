# TurnosRed

Backend en Node.js + TypeScript + Express para centralizar la gestión de turnos de varios
centros de atención ambulatoria (clínica médica, pediatría, odontología y nutrición).
Lee un archivo JSON con formatos inconsistentes entre sedes, normaliza los datos, expone
una API REST con operaciones CRUD y retransmite los cambios en tiempo real por Socket.IO.

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
para ver los eventos en tiempo real sin usar Postman.

## Variables de entorno

| Variable          | Descripción                                         | Valor por defecto     |
| ----------------- | ---------------------------------------------------- | ---------------------- |
| `PORT`            | Puerto en el que escucha el servidor HTTP             | `3000`                 |
| `DATA_FILE_PATH`  | Ruta al archivo JSON con los turnos crudos            | `./data/turnos.json`   |

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
│   └── turnos.json              # Datos crudos de entrada (formatos inconsistentes)
├── public/
│   └── socket-test.html         # Cliente mínimo para ver eventos de Socket.IO en vivo
├── src/
│   ├── index.ts                 # Punto de entrada: arma Express + Socket.IO
│   ├── models/
│   │   └── turno.model.ts       # Interfaces TurnoCrudo/Turno + normalización de datos
│   ├── services/
│   │   ├── turnos.service.ts    # Lectura de datos, estado en memoria, CRUD, eventos
│   │   └── ejemplo-callbacks.ts # Ejemplo comparativo con callbacks (solo referencia)
│   ├── controllers/
│   │   └── turnos.controller.ts # Maneja req/res y códigos de estado HTTP
│   └── routes/
│       └── turnos.routes.ts     # Define los endpoints REST de /turnos
├── dist/                        # Salida compilada (generada, no se versiona)
├── .env.example                 # Plantilla de variables de entorno
├── .nvmrc                       # Versión de Node del proyecto
├── tsconfig.json                # Configuración del compilador de TypeScript
└── package.json
```

La separación sigue el flujo de una petición: **routes** decide qué URL dispara qué función,
**controllers** interpreta la petición HTTP y arma la respuesta, **services** contiene la
lógica real (datos, normalización, eventos), y **models** define las formas de los datos.

## Endpoints

| Método   | Ruta           | Descripción                  | Códigos de estado      |
| -------- | -------------- | ----------------------------- | ------------------------ |
| `GET`    | `/turnos`      | Lista todos los turnos        | `200`                    |
| `GET`    | `/turnos/:id`  | Obtiene un turno por ID       | `200`, `400`, `404`      |
| `POST`   | `/turnos`      | Crea un nuevo turno           | `201`, `400`             |
| `PUT`    | `/turnos/:id`  | Actualiza un turno existente  | `200`, `400`, `404`      |
| `DELETE` | `/turnos/:id`  | Elimina un turno              | `200`, `400`, `404`      |

Cualquier error inesperado del servidor devuelve `500`.

## Eventos en tiempo real

Cada operación de escritura exitosa emite un evento interno con `EventEmitter`
(`turno:creado`, `turno:actualizado`, `turno:eliminado`), que a su vez se retransmite por
Socket.IO a todos los clientes conectados como `turno:nuevo`, `turno:actualizado` y
`turno:eliminado` respectivamente. Así, un cliente conectado ve los cambios sin recargar
la página ni hacer polling.
