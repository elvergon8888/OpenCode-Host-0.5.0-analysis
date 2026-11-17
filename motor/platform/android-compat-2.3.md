# Fase 2.3 — Evaluación de compatibilidad con Android

> **Corrección metodológica prioritaria.** En la Fase 0/1 se registró que el runtime era
> *node-mobile*. La evidencia de esta fase lo refuta:
>
> ```
> libopencode.so contiene:
>   builtin://bun/ffi                builtin://bun/sqlite
>   builtin://internal/sql/sqlite    builtin://node/worker_threads
>   "node-v26.3.0"                   "Bun v" / bun_version / bun install
>   plataformas de Bun: linux macos windows wsl android arm
> ```
>
> `libopencode.so` **es Bun compilado para Android** (JavaScriptCore), no node-mobile.
> Los símbolos `node::Handle` / `node::MakeCallback` / `node_api_module` que motivaron la
> conclusión anterior son la **capa Node-API de Bun** (para cargar addons N-API como
> `libopencode-pty.so`), no node-mobile.
>
> **Consecuencia:** `bun:sqlite`, `bun:ffi`, `Bun.file`, `Bun.spawn` **ya existen** en el
> host. El trabajo de la Fase 3 no es "reemplazar Bun", sino **blindar los límites reales**.

---

## 2.3.1 `bun:sqlite` — persistencia sin pérdida

### Evidencia de uso (superficie exacta, leída del código)

| Módulo | Pos | Uso |
|---|---:|---|
| `chunk-s95j0csq.js` | 28200 | `@opencode/core/database/SqliteBun` — `new Database(filename,{readonly,readwrite,create})`, `db.query(sql)`, `stmt.all/values/safeIntegers`, `db.run("PRAGMA …")`, `db.serialize()`, `db.loadExtension()`, `db.close()` |
| `chunk-9f4f8etn.js` | 161677 | Migración V1→V2 — `new Database(path,{readonly:true,strict:true})`, `query(...).get()`, `run("BEGIN"/"ROLLBACK")`, `db.inTransaction` |
| `chunk-0hfmf8xt.js` | 378 | Integración Zed — `new Database(path,{readonly:true})` (solo lectura) |

### Estado medido en el APK vivo

```
opencode.log: "database schema bootstrap started"   migrations=59
opencode.log: "database schema bootstrap completed"  migrations=59 durationMs=33
sandbox: /data/user/0/app.opencodehost/files/home/.local/share/opencode/
         opencode.db  opencode.db-wal  opencode.db-shm
```

→ **59 migraciones aplicadas** y **WAL activo** (`-wal` + `-shm`). Sesiones, mensajes,
proyectos y credenciales **persisten** en Android hoy.

### Conclusión

| Requisito | Estado | Evidencia |
|---|---|---|
| Sesiones | ✅ persistidas | tabla `session`; `SELECT COUNT(*) … FROM session` en la ruta de migración |
| Mensajes | ✅ persistidos | lectura de la tabla de mensajes en `F7()` (chunk-9f4f8etn.js) |
| Credenciales | ✅ persistidas | `auth.json` en `$XDG_DATA_HOME/opencode` con modo `0600` |
| Persistencia | ✅ WAL activo | `opencode.db-wal` + `opencode.db-shm` presentes |

**Sustitución compatible y sin pérdida:** la sustituibilidad no la hace un shim, la hace el
**seam que el propio motor ya define**: `SqliteNative` es un `Effect.Service`
(`class ji extends B.Service()("@opencode/core/database/SqliteNative"){}`) y el motor
publica una implementación `SqliteBun` además de un `Sqlite` vacío (`var se={}`).
→ El punto de inyección ya existe. Cualquier implementación Android de `DatabaseProvider`
se enchufa **sin tocar la lógica de persistencia**.

### Opciones evaluadas

| Opción | Fidelidad | Esfuerzo | Veredicto |
|---|---|---|---|
| A. Conservar `bun:sqlite` de Bun | 100 % | 0 | **Vigente.** Es lo que ya funciona. |
| B. Shim sobre `node:sqlite` (Node v26) | 85–90 % | medio | **Descartada como ruta principal**: `node:sqlite` no expone `serialize()`, ni `safeIntegers()` (sí `setReadBigInts`), ni la opción `strict`; `db.query()` no existe (es `prepare()`). Exigiría un shim que reimplementa esas diferencias → más riesgo que el beneficio. |
| C. Addon N-API con SQLite del NDK (amalgamation `sqlite3.c`) | 100 % + control de `serialize()`/`loadExtension`/`strict` | alto | **Ruta de futuro** si el objetivo es un host sin Bun. |

---

## 2.3.2 `bun:ffi` — bibliotecas nativas y ABI

### Evidencia

`chunk-kb1j967y.js` @133:
```js
import{dlopen as I,FFIType as _,ptr as l}from"bun:ffi";
var n=u(function(X,J){J.exports="/$bunfs/root/librust_pty_arm64-2resfh96.so"});
// mapeo de plataforma YA incluye android:
function c(T,R,D){ if(T==="darwin")…; if(T==="win32")…;
  return R==="arm64"?["librust_pty_arm64.so","librust_pty.so"]:["librust_pty.so"] }
```
Firmas FFI: `bun_pty_spawn/write/read/resize/kill/get_pid/get_exit_code/close`.

### ABI

- `librust_pty_arm64-2resfh96.so` es un **Rust cdylib** compilado para `aarch64-linux-android`
  (bionic). Se carga con `dlopen` desde el proceso: **no** requiere que el runtime sea ELF de
  Android para la interoperabilidad de `dlopen`; pero sí que la .so esté compilada contra bionic.
- El APK ya trae `libopencode-pty.so` (2.9 MB, Rust, `portable_pty`/`openpty`,
  `OPENCODE_PTY_SOCKET_DIR`) → **ya existe un PTY bionic nativo en el host**.
- El motor tiene además la **ruta de proceso** (`opencode-pty` + framing JSON), que no usa FFI.

### Conclusión

`bun:ffi` **funciona** en el host (`builtin://bun/ffi` registrado). No hay pérdida funcional.
El riesgo real es de **empaquetado y resolución**, no de ABI:
`f()` resuelve el binario por `BUN_PTY_LIB` → módulo nativo del VFS → rutas del filesystem.
En un host reconstruido, el asset debe seguir siendo embebido y su checksum debe verificarse.

**Riesgo residual:** `forkpty`/`openpty` dentro del sandbox de una app Android puede quedar
restringido por la política de procesos. **No está medido** (el PTY no aparece en el log) →
prueba PTY-01..04 obligatoria antes de declarar el camino cerrado.

---

## 2.3.3 `librust_pty` — procesos y terminales en Android

| Vía | Mecanismo | Estado | Nota |
|---|---|---|---|
| FFI | `dlopen(librust_pty_arm64)` + 8 funciones `bun_pty_*` | Disponible (`builtin://bun/ffi`) | Asset embebido; resolución multi-ruta ya implementada |
| Helper | binario `opencode-pty` 0.4.0 + framing JSON (uint32 BE + JSON, máx 8 MiB) | Disponible, con binario propio | Extracción atómica verificada por sha256 |
| Host | `libopencode-pty.so` (Rust, bionic, socket en `OPENCODE_PTY_SOCKET_DIR`) | Ya en el APK | Equivalente funcional del host |

**El motor ya tiene las tres.** `PtyProvider.backends` expone `"ffi" | "helper" | "both"` para que
la decisión sea del **host**, no un `if (platform==="android")` dentro del motor.

**Restricciones Android 10+:**
- Una app Android no puede lanzar procesos arbitrarios fuera de su sandbox.
- `detached` + grupos de procesos (`kill(-pid)`) están restringidos; el motor ya lo contempla
  (`or(e,t)` → `process.kill(-e.pid,0)` con `try/catch`).
- Termux es una app **distinta**: sus binarios (`/data/data/com.termux/files/usr/bin`) **no** son
  ejecutables desde el sandbox de `app.opencodehost` sin un puente explícito. El MCP bridge
  (`opencode-mcp-bridge`) ofrece `termux_exec` justamente para eso.
  → **Consecuencia de diseño:** `ProcessProvider.executableSearchPath()` debe declarar qué
  binarios son ejecutables desde el host, en lugar de asumir `$PATH`.

---

## 2.3.4 `node:worker_threads` — alternativas sin asumir equivalencia con fibers

### Los tres contactos

| Módulo | Pos | Qué es |
|---|---:|---|
| `chunk-yq5qw44s.js` | 1110203 | **Blob binario** (worker OpenTUI embebido): `"import { parentPort } from "node:worker_threads"` + puente `globalThis.postMessage` / `__opentuiWorkerMessageBridge` |
| `chunk-z4ny5a8k.js` | 131 | **Módulo ES de worker real**: `parentPort.on("message")` / `postMessage({_tag:"Done",…})` |
| `chunk-23n3wbjy.js` | 2420 | `await import("worker_threads")` → `new Worker(photon-worker.js)`, con `terminate()`, `once("message"/"error"/"exit")` |

### Por qué un fiber de Effect **NO** es equivalente

| Capacidad del worker | Fiber de Effect |
|---|---|
| Paralelismo real (hilo/proceso) | ❌ mismo isolate, mismo event loop |
| CPU-bound sin congelar el loop | ❌ congela el loop |
| `postMessage` / `terminate` / `ref` / `unref` | ❌ inexistente |
| Contexto JS aislado (`import.meta`, `Worker` con su propio módulo) | ❌ mismo contexto |
| `MessagePort` / `MessageChannel` / `SHARE_ENV` | ❌ |
| Aislar un crash del worker | ❌ un error no capturado puede tumbar el padre |

Por tanto **el contrato no ofrece "fibers como workers"**. `WorkerProvider.backends` es
`"none" | "thread" | "process"`, y `selectWorkerBackend()` nunca devuelve un fiber.

### Precedente del propio motor (no es una suposición)

`Image.Photon` (chunk-23n3wbjy.js) **ya tiene** el patrón de degradación deliberada:
```js
spawnWorker: try { const {Worker}=await import("worker_threads"); … }
                catch { return new WorkerUnavailableError({cause}) }
// makeWith:
const c = c ??= y.load();   // respaldo: cargar la librería EN PROCESO
```
con timeout de 10 s y el mismo límite en ambos modos.

→ El diseño de `WorkerProvider` **replica el seam que OpenCode ya eligió**, y en el caso del
worker de parser (aislamiento de contexto + CPU-bound) el único sustituto admisible es un
**worker por proceso** con protocolo de mensajes, no un fiber.

**Compat de Bun:** `builtin://node/worker_threads` está registrado, pero la capa `node:` de Bun
lanza `throwNotImplemented("worker_threads.moveMessagePortToContext")` y
`warnNotImplementedOnce("worker_threads.Worker.performance")`. → La verificación de equivalencia
debe comprobar specifically `new Worker()`, `postMessage`, `terminate` y aislamiento de contexto.

---

## 2.3.5 Filesystem — permisos, almacenamiento privado y compartido

### Rutas reales medidas

| Dato | Valor | Origen |
|---|---|---|
| `HOME` del servidor | `/data/data/app.opencodehost/files/home` | sandbox Android |
| `data` | `<HOME>/.local/share/opencode` | `XDG_DATA_HOME` no definido → `homedir()/.local/share` |
| `config` | `<HOME>/.config/opencode` | idem |
| `cache` | `<HOME>/.cache/opencode` | idem |
| `state` | `<HOME>/.local/state/opencode` | idem |
| `tmp` | `os.tmpdir()/opencode` | `TMPDIR` del proceso |

Fuente: `chunk-dpsr58v2.js` (`@opencode/core/Global`) + `chunk-09yx2ges.js` (`auth.json`).

### Permisos

| Ámbito | Acceso desde la app | Afectación al motor |
|---|---|---|
| `/data/data/app.opencodehost/**` | ✅ lectura/escritura | Zona principal de datos, config, cache, sesiones |
| `/storage/emulated/0/**` | ⚠️ requiere permiso; el bridge veta la raíz `sdcard` | Proyectos del usuario, `Termux` (`com.termux`) |
| `/`, `/data`, `/data/data` | ❌ `EACCES` | `scandir '/'` → HTTP 500 en `/api/fs/list` (medido) |

### Requisitos del contrato

1. `FilesystemProvider` **no** decide permisos: los propaga. El motor ya los propaga bien
   (`EACCES` llega como `FileSystemError` con su causa).
2. `capabilities.privateStorage = true`, `capabilities.sharedStorage` depende del permiso
   efectivo. Declarar `sharedStorage=false` **no** es degradación: es el estado real, y el
   motor debe poder preguntar antes de asumir acceso.
3. **Almacenamiento compartido** (SAF/MediaStore) **no** está soportado por el motor actual.
   Añadirlo sería una **extensión**, no una sustitución: exigiría un `FilesystemProvider`
   alternativo con `content://` y SAF, fuera del alcance de esta fase.
4. **Privacidad:** `auth.json` en modo `0600` dentro del sandbox privado es correcto en Android.
   `CredentialProvider.supportsSharedStorage=false` lo documenta.

---

## 2.3.6 Procesos — restricciones de Android 10 y ejecución desde Termux

### Medido

```
opencode.log: message="spawning process" command=git args=["init"] cwd=/data/.../work
opencode.log: message="spawning process" command=git args=["rev-parse","--git-dir",…]
```
→ `child_process.spawn` **funciona** dentro del sandbox. `git` estaba en el PATH del host
(el APK trae `libgit.so` y el host expone `git`).

### Restricciones de Android 10+ (API 29+)

| Restricción | Impacto | Mitigación en el contrato |
|---|---|---|
| Sin ejecución de archivos en `/data` de otras apps | No se puede ejecutar binarios de Termux desde OpenCode-Host | `ProcessProvider.executableSearchPath()` declara el PATH real; el MCP bridge expone `termux_exec` para el cruce entre apps |
| Sin `execve` de binarios de `/system` fuera de las APIs públicas | `Bun.spawn(["/system/bin/am",…])` **sí** funciona (es la vía de intents del sistema) | Ya implementado en el motor; se mantiene en `RuntimeProvider.openExternal()` |
| Procesos en segundo plano limitados | `detached` puede ser rechazado | `capabilities.detachedProcesses`; el motor ya captura el error |
| Grupos de procesos y `kill(-pid)` restringidos | El linger del PTY puede fallar | `capabilities.processGroups`; `ProcessProvider.killGroup()` degrada a `kill(pid)` |
| `PATH` no estándar | `git`, `rg`, `sh` pueden no estar disponibles | `executableSearchPath()` explícito; comprobación al inicio, no al uso |

### Conclusión

`ProcessProvider` **no necesita** re-arm en Android: la API funciona. Lo que sí necesita es
**declarar** las capacidades, porque el motor hoy asume `PATH` y grupos de procesos.
