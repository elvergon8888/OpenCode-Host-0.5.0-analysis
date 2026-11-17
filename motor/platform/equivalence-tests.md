# Plan de pruebas de equivalencia

**Método:** pruebas **diferenciales**. El APK actual (`OpenCode-Host-0.5.0-7`) y su servidor
vivo son el **oráculo**: cualquier re-armadura debe producir **resultados indistinguibles**
en las capacidades del motor.

**Oráculos concretos disponibles hoy:**
- Servidor OpenCode 2.2.5 vivo en `127.0.0.1:4096` (con autenticación).
- `opencode.log` con trazas de arranque, BD, watcher, spawn y MCP.
- `opencode.db` + `-wal` + `-shm` en el sandbox de la app.
- Corpus de 493 chunks con hashes SHA-256 y grafo de 10.318 aristas.

**Criterio de passage:** una prueba pasa si la salida del host nuevo es **igual** a la del
oráculo en los campos observados, dentro de las tolerancias declaradas.
Una prueba que no se puede construir con el oráculo se marca `ORÁCULO PENDIENTE` y **bloquea**
la afirmación de equivalencia de esa capacidad (no se da por buena por defecto).

---

## 1. Base de datos (DB)

| ID | Prueba | Oráculo | Criterio |
|---|---|---|---|
| DB-01 | Arranque en frío: bootstrap de esquema | `opencode.log` | `migrations=59`, `durationMs` comparable, sin error |
| DB-02 | Integridad del fichero tras N escrituras | `sqlite3 opencode.db "PRAGMA integrity_check"` | `ok` en ambos |
| DB-03 | WAL activo | presencia de `-wal`/`-shm` | idéntica en ambos; `PRAGMA journal_mode` igual |
| DB-04 | `serialize()` produce una base reabrible | `db.serialize()` de Bun | el buffer reescrito se abre con `PRAGMA integrity_check=ok` y mismo `user_version` |
| DB-05 | Modo `strict`: SQL malformado | Bun `strict:true` | mismo código de error y mismo mensaje |
| DB-06 | `safeIntegers(true)` en columnas BIGINT | Bun | mismo tipo/valor (bigint vs number) en `all()` y `values()` |
| DB-07 | Migración V1→V2 (lectura `readonly`, `strict`) | `chunk-9f4f8etn.js` `F7()` | mismas filas migradas, mismos conteos, `BEGIN/ROLLBACK` correcto |
| DB-08 | `loadExtension` | Bun | misma carga; si el host no soporta → `supportsLoadExtension=false` y el motor **no** lo invoca |
| DB-09 | `inTransaction` durante `BEGIN`/`ROLLBACK` | Bun | mismo valor en cada punto |

## 2. Sesiones, mensajes y credenciales (PERS)

| ID | Prueba | Criterio |
|---|---|---|
| PERS-01 | Crear sesión, mensaje y releer | misma fila, mismos campos, mismo orden (`seq`) |
| PERS-02 | Reinicio del proceso y relectura | 0 sesiones perdidas, 0 mensajes perdidos |
| PERS-03 | `auth.json`: escritura con modo `0600` | mismo `stat().mode`, mismo JSON, mismas claves |
| PERS-04 | `auth.json`: lectura con `XDG_DATA_HOME` ausente y presente | misma ruta que `Ph()` en ambos casos |
| PERS-05 | Credencial `oauth` con expiración y refresh | mismo refresh, misma expiración, mismo cacheo |

## 3. Sistema de ficheros (FS)

| ID | Prueba | Criterio |
|---|---|---|
| FS-01 | Rutas base (`data/cache/config/state/tmp/bin/log/repos`) | igualdad exacta con `Global.Path` |
| FS-02 | `mkdir` recursivo + `realpath(tmp)` | mismas rutas tras `realpath` |
| FS-03 | Extracción atómica de `opencode-pty` | sha256 idéntico, modo `0700`, rename atómico, `.tmp` limpiado |
| FS-04 | Anti-symlink en el directorio de extracción | un symlink en la ruta → error, igual que Bun |
| FS-05 | Watch recursivo en subdirectorio de 3 niveles | evento recibido; **con `capabilities.recursiveWatch=false`**, el periodo de detección se documenta como diferencia aceptada |
| FS-06 | `EACCES` fuera del sandbox | mismo `FileSystemError` con la misma causa y el mismo `code` |
| FS-07 | `Bun.file(...).text()/.arrayBuffer()` | mismos bytes, mismo `type` inferido |
| FS-08 | `open(path,"wx",0700)` + `fsync` | EEXIST si ya existe; datos persistidos |

## 4. Procesos (PROC)

| ID | Prueba | Criterio |
|---|---|---|
| PROC-01 | `spawn("git",["init"])` en el cwd del proyecto | mismo exit code, mismo stdout/stderr |
| PROC-02 | `spawn` con `detached`, `stdio:["ignore","ignore","pipe"]`, `env` | mismas señales y mismo flujo |
| PROC-03 | `kill(-pid)` / grupo de procesos | con `supportsProcessGroups=true` idéntico; con `false`, degradación **declarada** y registrada |
| PROC-04 | `credential_process` de git | mismo JSON de salida, mismo `Version 1` exigido |
| PROC-05 | `execFile`/`execFileSync` | misma salida, mismo código |

## 5. Terminales (PTY)

| ID | Prueba | Criterio |
|---|---|---|
| PTY-01 | Crear PTY (`sh`) y escribir `echo creaf\n` | mismo eco, mismo prompt |
| PTY-02 | `resize(cols,rows)` y consulta de `TIOCSWINSZ` | mismo tamaño reported por el hijo |
| PTY-03 | Ruta FFI: `dlopen(librust_pty_arm64)` + 8 funciones | mismo `pid`, mismos bytes de salida, mismo exit code |
| PTY-04 | Ruta helper: binario `opencode-pty` + framing JSON | mismo framing (uint32 BE), mismos mensajes, mismo timeout |
| PTY-05 | Killing y `get_exit_code` | mismo código de salida y misma señal |
| PTY-06 | `BUN_PTY_LIB` y rutas alternativas de resolución | misma prioridad de resolución y mismo error si ninguna existe |

## 6. Workers (WORK)

| ID | Prueba | Criterio |
|---|---|---|
| WORK-01 | `new Worker(script)` con `postMessage`/`on("message")` | mismo mensaje recibido, mismo payload |
| WORK-02 | `terminate()` | el worker muere; el padre sigue vivo |
| WORK-03 | Aislamiento de contexto | el worker **no** comparte `globalThis` con el padre |
| WORK-04 | Paralelismo real | un worker CPU-bound de 5 s **no** bloquea el event loop del padre (**fiber NO sería equivalente**: debe medir el retardo del padre) |
| WORK-05 | `Image.Photon` en modo worker | misma imagen normalizada |
| WORK-06 | `Image.Photon` sin worker (`WorkerUnavailableError`) | mismo resultado por el respaldo en proceso, mismo timeout de 10 s |

## 7. Red (NET)

| ID | Prueba | Criterio |
|---|---|---|
| NET-01 | `GET /api/global/health` | mismo cuerpo y mismo código |
| NET-02 | Catálogo de modelos remoto | mismo sha256 del catálogo cacheado |
| NET-03 | MCP remoto (`http://127.0.0.1:8765/mcp`) | mismo handshake, mismos 31 tools, mismos resultados |
| NET-04 | HTTPS a `models.opencode.ai` | mismo contenido, mismo `content-type` |
| NET-05 | `brotliDecompressSync` de `AppArchive` | mismos bytes descomprimidos |

## 8. Runtime (RT)

| ID | Prueba | Criterio |
|---|---|---|
| RT-01 | Identidad del runtime | `identity.engine`, `version`, `platform`, `arch` correctos |
| RT-02 | `sha256` de un asset conocido | mismo digest que `Bun.file` |
| RT-03 | `randomUUID` | formato UUID v4, 128 bits, sin colisión en 10^6 |
| RT-04 | `AsyncLocalStorage` | el contexto sobrevive a `await` anidado y a `Promise.all` |
| RT-05 | `fileURLToPath` / `pathToFileURL` | ida y vuelta estable, con `file://` y con espacios/unicode |
| RT-06 | `stripVTControlCharacters` | mismo resultado en secuencias ANSI |

## 9. Herramientas nativas del motor (TOOL)

| ID | Prueba | Criterio |
|---|---|---|
| TOOL-01 | `/api/fs/find` (gap R2) | **HTTP 200** (hoy: 500 `unsupported platform for ripgrep: arm64-android`) y mismos resultados que el `rg` de referencia |
| TOOL-02 | `grep` sobre un corpus de 10 MB | mismos ficheros y mismas líneas que `rg` de referencia |
| TOOL-03 | `glob` | mismos patrones expandidos |
| TOOL-04 | `read`/`write`/`edit` | mismos contenidos y mismos parches |
| TOOL-05 | `shell` (tool) | mismo stdout/stderr y mismo exit code |

## 10. Contrato público (API)

| ID | Prueba | Criterio |
|---|---|---|
| API-01 | Captura golden de `/api/session`, `/api/config`, `/api/provider`, `/api/event` | JSON **idéntico** (mismos campos, mismos tipos) |
| API-02 | Esquema de la DB (`sqlite_master`) | mismo conjunto de tablas, índices y triggers |
| API-03 | Formato de los eventos SSE | mismos `type`, mismos campos, mismo orden |

---

## 11. Matriz de passage

| Suite | Bloquea | Requiere oráculo vivo |
|---|---|---|
| DB + PERS | M4, M10 | Sí (BD del APK) |
| FS | M3, M5, M10 | Sí |
| PROC | M8, M10 | Sí |
| PTY | M7, M10 | Sí (hoy sin ejercitar) |
| WORK | M8, M10 | Sí |
| NET | M10 | Sí |
| RT | M2, M9, M10 | Sí |
| TOOL | **M6**, M10 | Sí |
| API | M10 | Sí |

## 12. Reglas de la suite

1. **Diferencial, no golden fijo.** El oráculo es el APK actual; se compara host-nuevo vs APK.
2. **Tolerancias declaradas.** Solo se toleran: timestamps, duraciones, PIDs, puertos efímeros
   y rutas absolutas equivalentes por sandbox. Nada más.
3. **Una prueba por capacidad declarada.** Si `capabilities.X === false`, la prueba X debe
   verificar que el motor **reporta la ausencia** y elige la ruta alternativa **documentada**
   (p.ej. `WORK-06` para Photon). Nunca se permite un `skip` silencioso.
4. **Sin `skip` implícitos.** Un `skip` es un fallo de la suite salvo que esté anotado como
   `ORÁCULO PENDIENTE` en el informe, con responsable y fecha.
5. **El log del APK es oráculo de trazas.** El patrón de arranque (migraciones, watcher,
   spawn, MCP) debe reproducirse; las diferencias se justifican una a una.
