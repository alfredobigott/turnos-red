# Diseño de Módulo: Pacientes y Turnos

## Contexto

TurnosRed hoy identifica al paciente de un turno con un simple campo de texto
(`paciente: string`). Este documento propone una entidad `Paciente` completa,
desacoplada del turno, siguiendo la misma arquitectura en capas
(routes → controllers → services → models) ya usada para `Turno` y `Médico`.

## Modelado de datos

### Paciente

Datos mínimos indispensables para registrar un paciente:

```typescript
// Forma cruda, tal como podría llegar desde un formulario o import externo
export interface PacienteCrudo {
  dni?: string | number;
  nombre?: string;
  apellido?: string;
  fechaNacimiento?: string;
  telefono?: string;
  email?: string;
}

// Forma normalizada del dominio
export interface Paciente {
  id: number;
  dni: string;              // documento de identidad, único
  nombre: string;
  apellido: string;
  fechaNacimiento: string;  // YYYY-MM-DD
  telefono: string;
  email?: string;           // opcional
}
```

`dni` se normaliza a `string` (igual que `documento` en `Turno`), ya que es un
identificador, no un número con el que se opera aritméticamente.

### Turno (extensión)

Para asignar un turno médico a un paciente registrado, `Turno` incorpora una
referencia opcional, con el mismo patrón ya usado para `medicoId`:

```typescript
export interface Turno {
  // ...campos existentes...
  pacienteId?: number; // FK opcional hacia Paciente
}
```

Mantenerlo opcional preserva compatibilidad con los turnos ya existentes,
que fueron creados solo con el campo `paciente` de texto libre.

## Endpoints propuestos

### 1. `POST /pacientes`

Crea un nuevo paciente.

**Body:**
```json
{
  "dni": "38112233",
  "nombre": "Marcos",
  "apellido": "Peña",
  "fechaNacimiento": "1990-04-12",
  "telefono": "1122334455",
  "email": "marcos.pena@mail.com"
}
```

**Respuestas:**
| Código | Caso |
|---|---|
| `201` | Paciente creado, devuelve el objeto con `id` asignado |
| `400` | Faltan campos obligatorios o el DNI ya está registrado |

### 2. `PUT /turnos/:id/asignar-paciente`

Asigna un paciente ya registrado a un turno existente.

**Params:** `id` — id del turno (entero)

**Body:**
```json
{ "pacienteId": 4 }
```

**Respuestas:**
| Código | Caso |
|---|---|
| `200` | Turno actualizado con el `pacienteId` asignado |
| `400` | `pacienteId` inválido o ausente |
| `404` | El turno o el paciente indicado no existen |

Ambos endpoints seguirían la misma arquitectura en capas ya presente en el
proyecto: `pacientes.routes.ts` → `pacientes.controller.ts` →
`pacientes.service.ts` → `paciente.model.ts`, con su propio schema de
validación en Zod, replicando el patrón de `Médico`.
