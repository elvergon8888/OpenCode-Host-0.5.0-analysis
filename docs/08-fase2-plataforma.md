# 08 — Fase 2 (opción a): abstracción `PlatformProvider`

**Estado:** COMPLETADA — diseño y documentación. **Sin modificar el motor.**
**Alcance:** 2.1 auditoría · 2.2 contrato · 2.3 compatibilidad Android · 2.4 entregables · 2.5 validación.

---

## 0. Resumen ejecutivo

| | |
|---|---|
| APIs auditadas | **34 / 34** con contacto verificado |
| Puntos de contacto reales | **565** (tokenizador léxico, 114 módulos) |
| Interfaz propuesta | **9** (Filesystem, Database, Process, Pty, Worker, Environment, Network, Credential, Runtime) |
| Contrato | **1.119 líneas** de TypeScript en `motor/platform/` |
| Type-check del contrato | **0 errores** (`tsc --noEmit`, strict) en los 11 ficheros TypeScript |
| Cobertura de contactos | **565 / 565 (100 %)** |
| Cobertura de los 411 dependientes del núcleo | **411 / 411 (100 %)** — 92 en frontera + 319 indirectos |
| Módulos que NO requieren cambio | **379 / 493 (76,9 %)** |
| Integridad de los originales | **496 hashes OK**, cobertura 493/493, reversibilidad 493/493 |

### Hallazgo que cambia la premisa de la fase

> La Fase 0/1 concluyó que el runtime era **node-mobile**. **Es incorrecto.**
> `libopencode.so` es **Bun compilado para Android** (JavaScriptCore):
> ```
> builtin://bun/ffi      builtin://bun/sqlite      builtin://internal/sql/sqlite
> builtin://node/worker_threads                    "node-v26.3.0"
> plataformas de Bun: linux macos windows wsl android arm
> ```
> Los símbolos `node::Handle` / `node::MakeCallback` / `node_api_module` que originaron esa
> conclusión son la **capa Node-API de Bun** (para cargar `libopencode-pty.so`), no node-mobile.
>
> **Consecuencia:** `bun:sqlite`, `bun:ffi`, `Bun.file`, `Bun.spawn` **ya existen** en el host.
> La Fase 3 **no** consiste en "sustituir Bun": consiste en **blindar los límites reales**.

### Gaps reales medidos en el APK vivo

| Gap | Severidad | Estado |
|---|---|---|
| `unsupported platform for ripgrep: arm64-android` → HTTP 500 en `/api/fs/find` | **Crítica** | Materializado |
| `watcher backend not supported platform=android` → cae a `backend=node` | Alta | Materializado |
| `EACCES: permission denied, scandir '/'` | Media | Materializado (sandbox) |
| PTY (`bun:ffi` / helper `opencode-pty`) | — | **Sin ejercitar** → verificación pendiente |
| `worker_threads` (compat parcial de Bun) | — | **Sin ejercitar** → verificación pendiente |

Y lo que **sí** funciona, medido:

```
opencode.log: "cli starting" version=2.2.5 channel=latest role=cli
opencode.log: "database schema bootstrap completed" migrations=59 durationMs=33
opencode.log: "spawning process" command=git args=["init"]
opencode.log: "mcp connected" server=android tools=31
sandbox: opencode.db + opencode.db-wal + opencode.db-shm
```

---

## 1. Fase 2.1 — Auditoría de las 34 APIs

**Método.** Escaneo léxico de los 493 chunks originales (364 MB) con un tokenizador de estados
(0 = código, 1 = comentario, 2 = string, 3 = template). Solo cuentan las coincidencias en
código real; se descartan las que viven en documentación embebida (p. ej. los ejemplos de
`bun:sqlite` dentro de los tipos de Bun, que un regex ingenuo contaba como 5 contactos falsos).
Cruce contra `motor/graph/edges.json` (10.318 aristas): 602 de los contactos iniciales
coinciden con aristas del grafo; los 94 restantes los aporta el escáner (imports dinámicos,
`require`, y miembros del global `Bun`), que el parser de aristas no registraba.

**Corrección de la Fase 1.** El inventario previo (`motor/modules/platform_inventory.json`)
detectaba las 34 APIs por regex **a nivel de chunk**, lo que mezclaba documentación con
código y sobreestimaba el alcance. Este informe sustituye a aquel como dato válido.

**Resultado.** 565 contactos, 114 módulos, las 34 APIs cubiertas.

| # | API | Contactos | Módulos | Criticidad | Decisión |
|---:|---|---:|---:|---|---|
| 1 | `node:path` | 171 | 61 | crítica | CONSERVAR → `RuntimeProvider.path` |
| 2 | `node:os` | 67 | 50 | crítica | CONSERVAR → `EnvironmentProvider` |
| 3 | `node:fs/promises` | 64 | 30 | alta | CONSERVAR → `FilesystemProvider` |
| 4 | `node:fs` | 61 | 28 | crítica | CONSERVAR → `FilesystemProvider` (watcher: gap R3) |
| 5 | `node:crypto` | 35 | 21 | crítica | CONSERVAR → `RuntimeProvider.crypto` |
| 6 | `node:url` | 27 | 19 | crítica | CONSERVAR → `RuntimeProvider` |
| 7 | `node:child_process` | 14 | 8 | media | SUSTITUIR → `ProcessProvider` |
| 8 | `Bun.file` | 13 | 5 | baja | SUSTITUIR → `FilesystemProvider.file` |
| 9 | `node:util` | 13 | 9 | alta | CONSERVAR → `RuntimeProvider.util` |
| 10 | `node:stream` | 12 | 7 | alta | CONSERVAR → `NetworkProvider` |
| 11 | `node:buffer` | 9 | 9 | alta | CONSERVAR → `RuntimeProvider.buffer` |
| 12 | `Bun.env` | 2 | 1 | baja | CONSERVAR → `EnvironmentProvider` |
| 13 | `node:module` | 7 | 6 | media | CONSERVAR → `RuntimeProvider.createRequire` |
| 14 | `node:process` | 7 | 3 | media | CONSERVAR → `EnvironmentProvider` |
| 15 | `node:events` | 6 | 4 | alta | CONSERVAR |
| 16 | `node:net` | 6 | 6 | alta | CONSERVAR → `NetworkProvider` |
| 17 | `node:http` | 4 | 3 | baja | CONSERVAR → `NetworkProvider` |
| 18 | `node:readline` | 4 | 3 | media | CONSERVAR → `PtyProvider` |
| 19 | `bun:ffi` | 3 | 2 | media | SUSTITUIR → `PtyProvider` |
| 20 | `node:worker_threads` | 3 | 3 | alta | SUSTITUIR → `WorkerProvider` |
| 21 | `node:async_hooks` | 3 | 3 | media | CONSERVAR → `RuntimeProvider` |
| 22 | `node:https` | 3 | 2 | alta | CONSERVAR → `NetworkProvider` |
| 23 | `node:stream/promises` | 3 | 2 | media | CONSERVAR |
| 24 | `node:tty` | 3 | 2 | media | CONSERVAR → `PtyProvider` |
| 25 | `bun:sqlite` | 2 | 2 | media | SUSTITUIR → `DatabaseProvider` (seam `SqliteNative`) |
| 26 | `node:timers` | 2 | 2 | hoja | CONSERVAR |
| 27 | `node:zlib` | 2 | 2 | media | CONSERVAR → `NetworkProvider` |
| 28 | `Bun.spawn` | 1 | 1 | baja | CONSERVAR (ya Android-native) |
| 29 | `node:assert` | 1 | 1 | media | CONSERVAR |
| 30 | `node:perf_hooks` | 1 | 1 | hoja | CONSERVAR |
| 31 | `node:stream/consumers` | 1 | 1 | baja | CONSERVAR |
| 32 | `Bun.write` | 7 | 1 | baja | CONSERVAR (desarrollo) |
| 33 | `Bun.serve` | 8 | 1 | baja | CONSERVAR (desarrollo) |
| 34 | `node:inspector` | 0 | 0 | — | SIN USO (0 contactos léxicos) |

Detalle completo con **chunk, módulo, símbolo y posición byte exacta**:
`motor/platform/audit-2.1.md` (70 KB) y `motor/platform/api-audit.json`.

### Dependencias directas, indirectas y transitivas

Alcance inverso (módulos alcanzados a través de los dependientes de cada contacto):

| API | Contactos | rdeps máx. | Alcance inverso | En los 411 del núcleo |
|---|---:|---:|---:|---:|
| `node:path` | 61 | 102 | 269 | 239 |
| `node:fs` | 28 | 102 | 266 | 240 |
| `node:crypto` | 21 | 102 | 253 | 228 |
| `node:os` | 50 | 102 | 253 | 228 |
| `node:url` | 19 | 102 | 244 | 221 |
| `node:buffer` | 9 | 95 | 213 | 190 |
| `node:stream` | 7 | 63 | 107 | 88 |
| `node:fs/promises` | 30 | 52 | 100 | 93 |
| `node:worker_threads` | 3 | 63 | 83 | 70 |
| `bun:sqlite` | 2 | 6 | 9 | 9 |
| `bun:ffi` | 2 | 6 | 8 | 8 |
| `node:child_process` | 8 | 7 | 16 | 16 |

Detalle completo en `motor/platform/audit-2.1.md` §2.1.3 y `motor/platform/reach-analysis.json`.

---

## 2. Fase 2.2 — Diseño del contrato

**9 interfaces**, no 34. Se agrupan por **coherencia de capacidad** y por los **seams reales
que el motor ya define** — no por cada API de Node:

| Interfaz | Seams del motor que la justifican |
|---|---|
| `FilesystemProvider` | `Global` (rutas), extracción de assets |
| `DatabaseProvider` | **`SqliteNative`** (`@opencode/core/database/SqliteNative`) |
| `ProcessProvider` | `credential_process`, spawn de `opencode-pty`, git |
| `PtyProvider` | `bun:ffi` + `librust_pty`, helper `opencode-pty` |
| `WorkerProvider` | `Image.Photon` (ya tiene `WorkerUnavailableError` + respaldo) |
| `EnvironmentProvider` | `Global` (`@opencode/Global`) |
| `NetworkProvider` | servidor `/api/*`, MCP, catálogo remoto |
| `CredentialProvider` | `auth.json` (`Ph()`), OAuth, `credential_process` |
| `RuntimeProvider` | `crypto`, `buffer`, `path`, `url`, `util`, `async_hooks`, intents |

**Capacidades declaradas, no supuestas.** `PlatformCapabilities` enumera 24 capacidades
(`nativeSqlite`, `sqliteSerialize`, `nativeFfi`, `nativeWatcher`, `recursiveWatch`,
`processGroups`, `pty`, `worker`, `workerParallelism`, `sharedStorage`, `caseSensitivePaths`, …).
El motor **pregunta**; no deduce del nombre del sistema. Cuando una capacidad falta, el motor
elige una ruta equivalente **que el propio OpenCode ya posee** (p. ej. FFI → helper de proceso;
worker → respaldo en proceso de Photon).

**Prohibición explícita.** `WorkerProvider` **no** ofrece fibers de Effect como workers.
Un fiber comparte isolate y event loop, no tiene `postMessage`/`terminate`, no aísla contexto
y congela el loop con CPU-bound. Los backends son `"none" | "thread" | "process"`.

Entregables:

```
motor/platform/Platform.ts                  contrato agregado + selectPtyBackend/selectWorkerBackend
motor/platform/contracts/filesystem.ts
motor/platform/contracts/database.ts        superficie exacta de bun:sqlite leída del código
motor/platform/contracts/process.ts
motor/platform/contracts/pty.ts             dos backends (FFI + helper)
motor/platform/contracts/worker.ts
motor/platform/contracts/environment.ts
motor/platform/contracts/network.ts
motor/platform/contracts/credential.ts
motor/platform/contracts/runtime.ts
motor/platform/contracts/index.ts
```

---

## 3. Fase 2.3 — Compatibilidad Android

Detalle completo: `motor/platform/android-compat-2.3.md`. Resumen de los seis puntos exigidos:

### 3.1 `bun:sqlite` — sin pérdida ✅

Superficie exacta usada por el motor (leída del código, no inferida):
`new Database(path,{readonly,readwrite,create,strict})`, `db.query`, `db.run`, `db.close`,
`db.serialize`, `db.loadExtension`, `db.inTransaction`; statement: `all`, `values`, `get`,
`safeIntegers`.

Medido: **59 migraciones aplicadas**, `opencode.db` + `-wal` + `-shm` presentes → sesiones,
mensajes y credenciales **persisten** hoy en Android.

El seam ya existe (`SqliteNative` es un `Effect.Service` del propio OpenCode). Cualquier
implementación Android se enchufa sin tocar la lógica de persistencia.
Ruta alternativa evaluada y **descartada**: shim sobre `node:sqlite` (Node v26) — no expone
`serialize()`, ni `safeIntegers()`, ni `strict`; `db.query()` no existe. Exigiría más shim que
beneficio.

### 3.2 `bun:ffi` — ABI ✅ (riesgo de empaquetado, no de ABI)

`librust_pty_arm64-2resfh96.so` es un Rust cdylib para bionic, embebido en el VFS.
El mapeo de plataformas del motor **ya incluye `android`**
(`["librust_pty_arm64.so","librust_pty.so"]`). El APK ya trae `libopencode-pty.so`
(Rust, bionic, `portable_pty`/`openpty`, `OPENCODE_PTY_SOCKET_DIR`).
`builtin://bun/ffi` está registrado. El riesgo real es de **empaquetado y resolución**, no de ABI.

### 3.3 `librust_pty` — tres rutas ya disponibles ✅

| Vía | Mecanismo | Estado |
|---|---|---|
| FFI | `dlopen(librust_pty_arm64)` + 8 funciones `bun_pty_*` | Disponible |
| Helper | binario `opencode-pty` 0.4.0 + framing JSON (uint32 BE, máx 8 MiB) | Disponible, con checksum sha256 |
| Host | `libopencode-pty.so` (bionic, socket) | Ya en el APK |

Restricciones Android 10+: sin ejecución de binarios de otras apps (Termux es otra app →
`ProcessProvider.executableSearchPath()` debe declarar el PATH real), procesos detached y
grupos restringidos (`capabilities.processGroups`).

### 3.4 `node:worker_threads` — sin asumir equivalencia con fibers ✅

3 contactos: un **blob binario** con el worker OpenTUI embebido, un **módulo ES de worker real**
(`parentPort`/`postMessage`) y un **import dinámico** (`Image.Photon`).
La incompat de Bun es parcial: `throwNotImplemented("worker_threads.moveMessagePortToContext")`.
**Precedente del propio motor**: `Image.Photon` ya degrada de forma deliberada y explícita a
carga en proceso con `WorkerUnavailableError` y timeout de 10 s. El contrato replica ese seam.
`WorkerProvider.backends = "none" | "thread" | "process"` — **nunca** un fiber.

### 3.5 Filesystem — permisos y almacenamiento ✅

Rutas reales medidas: `HOME=/data/data/app.opencodehost/files/home`;
`data=<HOME>/.local/share/opencode`; `config=<HOME>/.config/opencode`; etc. (XDG no definido).
`/data/data/...` ✅, `/storage/emulated/0` ⚠️ (permiso; el bridge veta la raíz), `/` ❌ EACCES.
Almacenamiento compartido (SAF/MediaStore) **no** lo soporta el motor actual: es una
**extensión**, no una sustitución, y queda fuera de alcance.

### 3.6 Procesos — Android 10 y Termux ✅

Medido: `spawning process command=git` → `child_process.spawn` **funciona** en el sandbox.
Restricciones (procesos en segundo plano, grupos, `PATH`) quedan **declaradas** en
`capabilities`, no asumidas.

---

## 4. Fase 2.4 — Entregables

| Entregable | Fichero | Estado |
|---|---|---|
| `Platform.ts` propuesto | `motor/platform/Platform.ts` | ✅ 9 interfaces + capacidades |
| Contratos TypeScript completos | `motor/platform/contracts/*.ts` (10 ficheros) | ✅ 1.119 líneas |
| Matriz API → interfaz → implementación Android | `motor/platform/compatibility-matrix.md` | ✅ 34 filas + 7 no sustituibles |
| Dependencias no sustituibles directamente | `motor/platform/compatibility-matrix.md` §3 | ✅ 7 |
| Riesgos de incompatibilidad | `motor/platform/risks.md` | ✅ 12 riesgos (R1–R12) |
| Estrategia de migración sin pérdida | `motor/platform/migration-strategy.md` | ✅ 4 capas + 11 pasos (M0–M10) |
| Plan de pruebas de equivalencia | `motor/platform/equivalence-tests.md` | ✅ 9 suites, 60+ pruebas |
| Configuracion de type-check | `motor/platform/tsconfig.json` | ✅ `strict`, `noEmit` |
| Script de type-check | `motor/tools/typecheck_platform.sh` | ✅ reproducible, exit 0 |

**Cómo se conecta el contrato sin tocar los chunks** (estrategia de migración):

| Capa | Mecanismo | Bytes del motor modificados |
|---|---|---|
| 1 | Inyectar `globalThis.Bun` extendido en el arranque | **0** |
| 2 | Plugin de **resolución** de Bun: `bun:sqlite`→`creaf:sqlite`, `bun:ffi`→`creaf:ffi`, `node:worker_threads`→`creaf:worker` | **0** (el alias ocurre en la resolución, no en el fichero) |
| 3 | Enchufar en los seams ya existentes: `SqliteNative`, `Global`, `Image.Photon` | solo esos seams |
| 4 | *(condicional)* Addons N-API para un host **sin** Bun | fase futura |

---

## 5. Fase 2.5 — Validación arquitectónica

Generada por `motor/tools/validate_platform_design.py` → `motor/platform/validation-2.5.md`.

| Comprobación | Resultado |
|---|---|
| V1 Cobertura de contactos | ✅ **565 / 565** mapeados, **0** sin destino |
| V2 Trazabilidad de las 34 APIs | ✅ **34 / 34** con interfaz, implementación y suite |
| V3 Cobertura de los 411 dependientes del núcleo | ✅ **411 / 411** (92 en frontera + 319 indirectos) |
| V4 Módulos sin cambio | ✅ **379 / 493 (76,9 %)** |
| V5 Superficie del contrato | ✅ 1.119 líneas |
| V6 Type-check del contrato (TypeScript estricto) | ✅ **0 errores** en los 11 ficheros (`strict`, `noUnusedLocals`, `verbatimModuleSyntax`) |

### El núcleo crítico `chunk-n21h4aaz.js`

- 1.209 exports, 416.467 bytes, **411 dependientes**, 1 dependencia, topológico #491.
- **0 contactos de plataforma.** Es un módulo de primitivas compartidas (helpers de interop de
  Bun, utilidades de esquema). **No requiere ninguna modificación.**
- 92 de sus 411 dependientes están en la **frontera** (tienen contacto de plataforma directo);
  los otros 319 llegan a la plataforma **a través** de esos 92.
- Los 92 módulos de frontera son los únicos puntos de re-armadura effective.

> `chunk-n21h4aaz.js` no es donde hay que re-armar: es donde **no** hay que tocar nada.
> Es el punto de mayor fan-in y queda **invulnerable**.

---

## 6. Reglas innegociables: cumplimiento

| Regla | Cumplimiento | Prueba |
|---|---|---|
| No modificar los 493 chunks originales | ✅ 0 bytes modificados en esta fase | `verify_integrity.py`: 496 hashes OK, 493/493 reversibles |
| No eliminar funcionalidades | ✅ la matriz cubre las 34 APIs con destino explícito; 7 dependencias no sustituibles documentadas | §4 + matriz §3 |
| No sustituir por implementaciones simplificadas | ✅ los shims **delegan**; las pruebas son diferenciales contra el APK como oráculo | `equivalence-tests.md` |
| No cambiar contratos públicos sin documentar | ✅ `Platform` es interno; los esquemas Effect, la API HTTP y el esquema de la DB no se tocan | R10, API-01..03 |
| No alterar el APK ni las `.so` originales | ✅ solo lectura; hashes `.so=af51da7e…`, APK=`c63685e1…` intactos | `verify_integrity.py` |
| Mantener hashes y trazabilidad | ✅ baseline SHA-256, `traceability.csv` (493 filas), log de renombrados (6.015) | `motor/integrity/` |
| No iniciar la implementación Android | ✅ Fase 2 = diseño y documentación únicamente | este informe |

---

## 7. Estado y siguiente paso

**Fase 2 (opción a): COMPLETADA.**

Queda **un gap crítico abierto**, medido y reproducible:

> `unsupported platform for ripgrep: arm64-android` → **HTTP 500 en `/api/fs/find`**.
> Las herramientas `grep`, `glob` y `find` del motor **no funcionan hoy en Android**.

Es el **primer** paso de la Fase 3 (paso M6 de la estrategia de migración), porque es un gap
**funcional medido**, no una hipótesis de diseño.

**Detenido a la espera de autorización expresa para la Fase 3.**

Opciones que se ofrecen para autorizar:

- **(a) Cerrar el gap de `ripgrep`** — compilar ripgrep 15.1.0 para `aarch64-linux-android`
  (NDK r27c, API 24) y registrarlo en el mapa de plataformas del motor. Es el único punto
  donde hoy se pierde una capacidad del motor.
- **(b) Instrumentar el contrato** — implementar `BunPlatform` (delegación 1:1) e inyectar
  `globalThis.Bun` extendido (capa 1). Riesgo bajo, verificable de inmediato con el oráculo vivo.
- **(c) Verificar los gaps no medidos** — PTY (FFI y helper) y `worker_threads`, que no aparecen
  en el log porque no se han ejercitado. Sin ellos, la equivalencia de esas capacidades no
  puede afirmarse.

Recomendación: **(c) → (a) → (b)**. Primero medir lo que no se sabe, después cerrar el gap
funcional que ya se sabe, y solo entonces instrumentar el contrato.
