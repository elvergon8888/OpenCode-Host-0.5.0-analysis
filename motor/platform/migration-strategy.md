# Estrategia de migración sin pérdida funcional

> **Fase 2 = diseño. Ningún cambio se ejecuta aquí.**
> Esta documento describe cómo se conectaría el contrato `Platform` al motor
> **sin modificar los 493 chunks originales**, con la regla innegociable:
> *OpenCode conserva sus capacidades; Android se adapta al motor.*

---

## 0. Restricción dominante: los chunks son inmutables

Los 493 chunks son la fuente de verdad y están verificados por SHA-256
(`motor/integrity/baseline.sha256`, 496 hashes). El motor vive dentro del VFS de Bun
(`/$bunfs/root/…`) embebido en `libopencode.so`. Editar un chunk exigiría reconstruir
el `.so`, lo que además de prohibido por la regla "no alterar el APK ni las bibliotecas
nativas originales".

**Conclusión: la instrumentación NO puede ser una edición de fuente.**

---

## 1. Tres mecanismos de instrumentación, por capa

### Capa 1 — Inyección de global en el arranque (0 bytes del motor modificados)

El runtime es Bun. Bun permite inyectar un `globalThis` **antes** de que se cargue el bundle.

| Objetivo | Mecanismo | Contactos cubiertos |
|---|---|---|
| `Bun.file`, `Bun.write`, `Bun.spawn`, `Bun.env`, `Bun.serve`, `Bun.fileURLToPath`, `Bun.pathToFileURL` | `globalThis.Bun = { ...nativeBun, ...shim }` en el bootstrap del host | 51 contactos |

**Por qué es la primera opción:** no toca el motor, no toca los chunks, no altera hashes.
El shim **delega** en la API nativa (no reimplementa): `Bun.file` → `Bun.file` nativo,
`Bun.spawn` → `Bun.spawn` nativo. Solo añade los members que falten.

**Riesgo:** sombrear `globalThis.Bun` podría afectar al código que ya lo usa. Mitigación:
el shim **envuelve** el original (`Object.assign(Object.create(nativeBun), shim)`) y solo
cambia los members que el contrato necesita abstraer.

### Capa 2 — Alias de resolución de módulos (0 bytes del motor modificados)

Bun resuelve los especificadores en tiempo de empaquetado. Un **plugin de resolución**
puede redirigir un especificador a otro módulo **sin reescribir el archivo de origen**.

| Especificador original | Alias a | Motivo |
|---|---|---|
| `bun:sqlite` | `creaf:sqlite` | Implementación del `DatabaseProvider` |
| `bun:ffi` | `creaf:ffi` | Implementación del `PtyProvider` |
| `node:worker_threads` | `creaf:worker` | Implementación del `WorkerProvider` |

**El archivo del chunk no se modifica**: el plugin intercepta la *resolución*, no el *contenido*.
Esto es lo que hace que la regla "no modificar los 493 chunks" sea literalmente cierto.

**Consecuencia:** la re-empaquetación (Fase 3) se hace **fuera del APK**: se reconstruye el
bundle en un host de compilación y se genera un artefacto nuevo. El APK original queda
intacto como referencia y para comparaciones diferenciales.

### Capa 3 — Inyección de contexto (seams ya existentes en el motor)

El motor **ya tiene seams** para las dos dependencias más delicadas:

| Seam | Dónde | Cómo se usa |
|---|---|---|
| `SqliteNative` (Effect Service) | `chunk-s95j0csq.js` | `class ji extends B.Service()("@opencode/core/database/SqliteNative"){}` + `SqliteBun` |
| `Global` (Effect Service) | `chunk-dpsr58v2.js` | Rutas base del motor |
| `Image.Photon` | `chunk-23n3wbjy.js` | Ya tiene `WorkerUnavailableError` + respaldo en proceso |

Estos seams **no se crean**: se **usan**. El `DatabaseProvider` se enchufa en `SqliteNative`;
el `EnvironmentProvider` en `Global`; el `WorkerProvider` donde el motor ya pregunta por el
worker.

### Capa 4 (condicional) — Re-arm nativo para un host sin Bun

Solo si el objetivo futuro es un host **no-Bun**. Requiere:
- Addon N-API con SQLite (amalgamation `sqlite3.c` compilada con NDK r27c, API 24).
- Addon N-API que envuelva `librust_pty` o reuso de `libopencode-pty.so` vía socket.
- Worker por proceso con protocolo de mensajes.

**No es necesario para el APK actual** (Bun ya está ahí). Es la ruta para *CreafMotorCode
como motor propio*, y por eso el contrato existe.

---

## 2. Secuencia de migración propuesta (Fase 3, a autorizar)

| Paso | Acción | Toca el motor | Criterio de salida |
|---:|---|---|---|
| **M0** | Congelar la línea base: `verify_integrity.py` → `INTEGRIDAD OK` | no | 496 hashes, 493/493, reversibilidad 493/493 |
| **M1** | Congelar el **oráculo**: capturas golden del servidor vivo (API, DB, logs) | no | `motor/platform/golden/` versionado |
| **M2** | Implementar `BunPlatform` (delegación 1:1 a Bun) como provider por defecto | no | Test de paridad Bun↔Bun trivial |
| **M3** | Inyectar `globalThis.Bun` extendido (Capa 1) | no | Sin diferencia observable en el golden |
| **M4** | Enchufar `SqliteNative` → `DatabaseProvider` con la implementación Bun | seam existente | 59 migraciones OK, DB byte-comparable |
| **M5** | Enchufar `Global` → `EnvironmentProvider` | seam existente | Rutas idénticas |
| **M6** | Resolver `ripgrep` para `arm64-android` (**R2**, el gap crítico) | sí (artefacto) | `/api/fs/find` → 200, mismos resultados |
| **M7** | Enchufar `PtyProvider` y ejercitar las dos rutas (FFI y helper) | seam | PTY-01..04 OK |
| **M8** | Enchufar `WorkerProvider` y verificar Photon | seam | WORK-01..04 OK |
| **M9** | Declarar `capabilities` en el arranque y registrarlas en el log | no | Log incluye el bloque de capacidades |
| **M10** | Suite de equivalencia differential completa | no | 100 % verde frente al oráculo |

**Orden clave:** M6 (ripgrep) va **antes** que cualquier trabajo de providers, porque es un
gap **medido** que degrada una herramienta nativa hoy. M2–M5 son de riesgo bajo y
**verificables de inmediato**.

---

## 3. Reglas de no-pérdida

| Regla | Cómo se garantiza |
|---|---|
| No se elimina ninguna API del motor | El contrato **añade** interfaces; no retira ninguna. La matriz de las 34 APIs las cubre todas con destino explícito. |
| No se sustituye por implementación simplificada | Cada shim **delega**; no reimplementa. Las pruebas de equivalencia son *differentials* contra el APK actual. |
| No se cambia ningún contrato público | `Platform` es interno. Los esquemas Effect (`n.Struct`), los endpoints HTTP y el esquema de la DB no se tocan. |
| Se mantienen hashes y trazabilidad | Baseline SHA-256 + `traceability.csv` + log de renombrados, verificados en CI antes de cada commit. |
| No se altera el APK ni las `.so` originales | El APK queda como artefacto de referencia; la re-empaquetación produce artefactos nuevos con hash propio. |

---

## 4. Trazabilidad de la migración

Cada fila de la matriz debe poder convertirse en un artefacto verificable:

| API original | Artefacto de la migración | Verificación |
|---|---|---|
| `bun:sqlite` | `creaf:sqlite` (alias) + `DatabaseProvider` | DB-01..07 |
| `bun:ffi` | `creaf:ffi` (alias) + `PtyProvider` | PTY-01..04 |
| `node:worker_threads` | `creaf:worker` (alias) + `WorkerProvider` | WORK-01..04 |
| `Bun.*` | shim de `globalThis.Bun` | RT-01..05, FS-01..04 |
| `node:fs` | `FilesystemProvider` | FS-01..08 |
| `node:child_process` | `ProcessProvider` | PROC-01..03 |
| resto (23 APIs) | se conservan; el contrato las **expone** | API-01..03 |

---

## 5. Criterio de "Fase 3 completada"

1. `python3 motor/tools/verify_integrity.py` → `RESULTADO: INTEGRIDAD OK` (originales intactos).
2. Suite de equivalencia: **todas** las pruebas en verde frente al oráculo del APK actual.
3. `/api/fs/find` responde 200 (gap R2 cerrado).
4. El log del arranque declara el bloque de `capabilities` completo.
5. Cero cambios en los 493 chunks: los hashes de `bundle/chunks/` no han cambiado respecto
   a `baseline.sha256` **y** los artefactos nuevos viven en rutas nuevas.
