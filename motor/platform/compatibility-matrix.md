# Matriz de compatibilidad — API original → interfaz → implementación Android

**Base:** `motor/platform/audit-2.1.md` (565 contactos verificados, 34/34 APIs).
**Runtime real medido:** `libopencode.so` es **Bun compilado para Android** (`builtin://bun/ffi`,
`builtin://bun/sqlite`, `builtin://node/worker_threads`, `node-v26.3.0`, plataforma `android`).
**Motor real medido:** OpenCode **2.2.5**, 59 migraciones de BD aplicadas, `spawn` de `git` operativo.

Leyenda de la columna **Estado en Android**:
- `NATIVO` — funciona hoy en el APK, sin cambios.
- `NATIVO*` — funciona, pero con una limitación real medida (documentada).
- `SHIM` — requiere un módulo de adapting (alias de resolución o shim de API), sin tocar el motor.
- `NATIVO-NUEVO` — requiere una biblioteca nativa nueva (no presente hoy).

---

## 1. Resumen por interfaz

| Interfaz | APIs absorbidas | Contactos | Módulos | Implementación Android | Estado |
|---|---:|---:|---:|---|---|
| `FilesystemProvider` | `node:fs`, `node:fs/promises`, `Bun.file`, `node:path`, `node:url`, `node:module` | 335 | 61 | `node:fs` de Bun + `Bun.file`; watcher con backend `node` | NATIVO* |
| `DatabaseProvider` | `bun:sqlite` | 2 | 2 | `bun:sqlite` de Bun (ya activo) | NATIVO |
| `ProcessProvider` | `node:child_process`, `node:process` | 21 | 10 | `node:child_process` de Bun | NATIVO |
| `PtyProvider` | `bun:ffi`, `node:tty`, `node:readline` | 10 | 6 | `bun:ffi` + `librust_pty_arm64` (embebido) **o** helper `opencode-pty` | NATIVO* |
| `WorkerProvider` | `node:worker_threads` | 3 | 3 | `worker_threads` de Bun (parcial) **o** worker por proceso | NATIVO* |
| `EnvironmentProvider` | `node:os`, `Bun.env` | 69 | 50 | `node:os` + `process.env` | NATIVO |
| `NetworkProvider` | `node:http`, `node:https`, `node:net`, `node:stream`, `node:stream/promises`, `node:zlib`, `node:events` | 36 | 17 | `node:http`/`https`/`net` de Bun | NATIVO |
| `CredentialProvider` | `node:fs` (auth.json), `node:child_process` (credential_process), `node:crypto` | 16 | 5 | `node:fs` + `node:child_process` | NATIVO* |
| `RuntimeProvider` | `node:crypto`, `node:buffer`, `node:util`, `node:async_hooks`, `node:timers`, `node:assert`, `node:perf_hooks`, `node:inspector`, `Bun.write`, `Bun.serve`, `Bun.spawn` | 102 | 46 | Bun + `globalThis.Bun` | NATIVO |

> Los contactos se solapan entre interfaces (p. ej. `node:fs` alimenta `FilesystemProvider`
> y también `CredentialProvider`). La suma por interfaz supera los 565 por diseño.

---

## 2. Matriz completa API → interfaz → implementación

| # | API original | Interfaz destino | Implementación Android | Estado | Evidencia / Nota |
|---:|---|---|---|---|---|
| 1 | `bun:sqlite` | `DatabaseProvider.open()` | `bun:sqlite` de Bun; alternativa N-API con SQLite del NDK | **NATIVO** | 59 migraciones aplicadas; `opencode.db`+WAL+SHM presentes |
| 2 | `bun:ffi` | `PtyProvider.spawn()` | `bun:ffi` de Bun → `librust_pty_arm64-2resfh96.so` (embebido en VFS) | **NATIVO*** | `builtin://bun/ffi` registrado; PTY aún sin ejercitar en log |
| 3 | `Bun.file` | `FilesystemProvider.file()` | `Bun.file` de Bun | **NATIVO** | Extracción de `opencode-pty` con verificación sha256 verificada |
| 4 | `Bun.write` | `RuntimeProvider` (streams) | `Bun.write` de Bun | NATIVO | Solo inspector de depuración |
| 5 | `Bun.spawn` | `ProcessProvider.spawn()` | `Bun.spawn` de Bun | NATIVO | Ya invoca `/system/bin/am` (intent Android) |
| 6 | `Bun.serve` | `NetworkProvider.serve()` | `Bun.serve` de Bun | NATIVO | Solo dependencia de desarrollo del bundle |
| 7 | `Bun.env` | `EnvironmentProvider.env()` | `Bun.env` ≡ `process.env` | NATIVO | No es camino crítico |
| 8 | `node:child_process` | `ProcessProvider.spawn/exec/execFile` | `node:child_process` de Bun | NATIVO | `spawning process command=git` en el log |
| 9 | `node:worker_threads` | `WorkerProvider.spawn()` | `worker_threads` de Bun; respaldo: worker por proceso | **NATIVO*** | Compat de Bun parcial (`throwNotImplemented`) |
| 10 | `node:fs` | `FilesystemProvider` | `node:fs` de Bun | **NATIVO*** | Watcher recursivo no soportado → `backend=node` |
| 11 | `node:fs/promises` | `FilesystemProvider` | `node:fs/promises` de Bun | NATIVO | Extracción atómica de assets OK |
| 12 | `node:net` | `NetworkProvider` | `node:net` de Bun | NATIVO | Socket del PTY y del servidor |
| 13 | `node:http` | `NetworkProvider` | `node:http` de Bun | NATIVO | Servidor en 127.0.0.1:4096 operativo |
| 14 | `node:https` | `NetworkProvider` | `node:https` de Bun | NATIVO | TLS del catálogo de modelos OK |
| 15 | `node:crypto` | `RuntimeProvider.crypto` | `node:crypto` de Bun | NATIVO | sha256 de assets, randomUUID |
| 16 | `node:os` | `EnvironmentProvider` | `node:os` de Bun | NATIVO | `homedir()` → sandbox de la app |
| 17 | `node:readline` | `PtyProvider` / TUI | `node:readline` de Bun | NATIVO | TUI y PTY de Effect |
| 18 | `node:tty` | `PtyProvider` | `node:tty` de Bun | NATIVO | `ReadStream`/`WriteStream` |
| 19 | `node:zlib` | `NetworkProvider` | `node:zlib` de Bun | NATIVO | brotli de AppArchive, gzip/deflate/zstd |
| 20 | `node:module` | `RuntimeProvider.createRequire` | `node:module` de Bun | NATIVO | Dependencias opcionales |
| 21 | `node:path` | `RuntimeProvider.path` | `node:path` de Bun | NATIVO | Rutas POSIX |
| 22 | `node:url` | `RuntimeProvider.fileURLToPath` | `node:url` de Bun | NATIVO | — |
| 23 | `node:util` | `RuntimeProvider.util` | `node:util` de Bun | NATIVO | `promisify(execFile)` |
| 24 | `node:stream` | `NetworkProvider` / `PtyProvider` | `node:stream` de Bun | NATIVO | — |
| 25 | `node:events` | `NetworkProvider` | `node:events` de Bun | NATIVO | — |
| 26 | `node:process` | `EnvironmentProvider` | `node:process` de Bun | NATIVO | — |
| 27 | `node:buffer` | `RuntimeProvider.buffer` | `node:buffer` de Bun | NATIVO | Framing del protocolo PTY |
| 28 | `node:async_hooks` | `RuntimeProvider.createAsyncLocalStorage` | `node:async_hooks` de Bun | NATIVO | `AsyncLocalStorage` del contexto de sesión |
| 29 | `node:inspector` | `RuntimeProvider` (diagnóstico) | — | SIN USO | 0 contactos léxicos |
| 30 | `node:perf_hooks` | `RuntimeProvider` (diagnóstico) | `node:perf_hooks` de Bun | NATIVO | `monitorEventLoopDelay` en TUI |
| 31 | `node:assert` | `RuntimeProvider` | `node:assert` de Bun | NATIVO | `fail()` de esquema |
| 32 | `node:timers` | `RuntimeProvider` | `node:timers` de Bun | NATIVO | `timers/promises` |
| 33 | `node:stream/promises` | `NetworkProvider` | `node:stream/promises` de Bun | NATIVO | `pipeline()` del duplex PTY |
| 34 | `node:stream/consumers` | `RuntimeProvider` | `node:stream/consumers` de Bun | NATIVO | `text(process.stdin)` |

---

## 3. Dependencias que NO pueden sustituirse directamente

| # | Dependencia | Por qué no es sustituible | Ruta real |
|---:|---|---|---|
| 1 | **`@vscode/ripgrep` 15.1.0** (binario nativo de búsqueda) | No existe build `arm64-android`; el motor **intenta descargarlo** y falla → HTTP 500 en `/api/fs/find`. No es una API: es un artefacto binario. | Compilar ripgrep 15.1.0 para `aarch64-linux-android` con NDK y registrarlo en el mapa de plataformas; o sustituir el backend de `find` por la implementación JS. |
| 2 | **`librust_pty_arm64-2resfh96.so`** | Biblioteca Rust cdylib para bionic, embebida en el VFS de Bun. `bun:ffi` puede cargarla; un host que no sea Bun necesita un **addon N-API** que la envuelva. | `PtyProvider` con backend `helper` (binario `opencode-pty`, framing JSON ya implementado en el motor). |
| 3 | **`opencode-pty` 0.4.0** (binario helper) | Ya embebido con sha256 `1e5bdbc5…`; el motor lo extrae y verifica. Es un ejecutable, no una API. | Requiere build `aarch64-linux-android`; el APK trae `libopencode-pty.so` (Rust, bionic) como equivalente funcional vía socket. |
| 4 | **`@ff-labs/fff`** (búsqueda rápida, FFI) | El paquete declara 30+ símbolos FFI; en Android el cargador devuelve `null` (`async function Tr(){return null}`), por lo que la instancia nativa nunca se crea. | Ya tiene ruta de degradación en el propio paquete; verificar que la alternativa JS cubre el caso de uso o compilar `fff` para Android. |
| 5 | **Watch recursivo de directorios** | Bun no lo soporta en Android (`watcher backend not supported`), y `fs.watch` de Node no es recursivo. | `FilesystemProvider.watch()` con `capabilities.recursiveWatch=false` + recorrido periódico; o `inotify` nativo vía N-API. |
| 6 | **Contextos asíncronos (`AsyncLocalStorage`)** | Dependen del modelo de isolates/async-hooks del runtime. Un runtime no-Bun puede no soportarlos. | `RuntimeProvider.createAsyncLocalStorage()`; si el host no lo da, el motor necesita un contexto explícito (no hay equivalente trivial). |
| 7 | **Ejecución en paralelo real** | Un *fiber* de Effect **no** es un worker: mismo isolate, mismo event loop, sin `postMessage`/`terminate`, sin aislamiento de contexto, y el CPU-bound congela el loop. | `WorkerProvider` con backend `thread` o `process`. El propio motor ya tiene el precedente en `Image.Photon` (`WorkerUnavailableError` → carga en proceso). |

---

## 4. Trazabilidad de los gaps medidos

| Gap observado | API implicada | Contacto | Evidencia |
|---|---|---|---|
| `unsupported platform for ripgrep: arm64-android` | artefacto nativo (no API) | `chunk-a9g7vvqy.js` @871702 | `opencode.log` líneas 67–104, HTTP 500 en `/api/fs/find` |
| `watcher backend not supported platform=android` | `node:fs` (watch) | `chunk-4z9vkptb.js` @701382 | `opencode.log` líneas 5, 44, 127, 180 → `backend=node` |
| `EACCES: permission denied, scandir '/'` | `node:fs` (readdir) | `chunk-ctfvsqfc.js` | `opencode.log` líneas 85, 96, 103 → sandbox Android |
| `worktree discovery failed` | `node:child_process` (git) | `chunk-4z9vkptb.js` | `opencode.log` línea 72 (resuelto después: `spawning process command=git`) |
