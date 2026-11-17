# Riesgos de incompatibilidad — PlatformProvider

**Escala:** `Prob.` = probabilidad de materializarse · `Imp.` = impacto sobre la funcionalidad
original de OpenCode · `Sev.` = Prob. × Imp.

Ninguna mitigación de este documento **elimina** funcionalidad: todas o bien
(a) cambian *dónde* se ejecuta una capacidad, conservando su semántica, o
(b) la declaran explícitamente como no disponible en un host concreto, de modo que
el motor pueda elegir una ruta equivalente que ya posee.

---

## R1 — Confundir el runtime (Bun vs node-mobile)

| | |
|---|---|
| **Descripción** | La Fase 0/1 concluyó que el runtime era node-mobile. Es **Bun para Android**. Diseñar la re-armadura sobre la premisa equivocada habría producido un plan entero (sustituir `bun:sqlite`, `bun:ffi`, `Bun.file`) que no era necesario. |
| **Prob.** | Media (ya materializado una vez) | **Imp.** | Catastrófico (plan entero errado) | **Sev.** | **Crítico** |
| **Mitigación** | `runtime.identity` (`engine`, `version`, `nodeCompatVersion`) en el contrato; la plataforma se **pregunta**, no se deduce del nombre del paquete. La evidencia de `builtin://bun/*` queda registrada como prueba. |
| **Verificación** | Test RUNTIME-01: `platform.identity.engine === "bun"` y `version` no vacía. |

## R2 — `ripgrep` sin build `arm64-android`

| | |
|---|---|
| **Descripción** | `@vscode/ripgrep` 15.1.0 no publica binario para `arm64-android`; el motor lo **descarga** en runtime y falla → HTTP 500 en `/api/fs/find`. Las herramientas `grep`/`glob`/`find` quedan inservibles. |
| **Prob.** | **Alta** (ya estáMaterializado en el APK vivo) | **Imp.** | Alto (3 herramientas nativas inutilizables) | **Sev.** | **Crítico** |
| **Mitigación** | (a) compilar ripgrep 15.1.0 para `aarch64-linux-android` con NDK r27c y registrarlo en el mapa de plataformas; (b) `PlatformToolProvider` que declare un backend `js` equivalente. **No** se puede "quitar" la herramienta: el motor debe seguir exponiéndola. |
| **Verificación** | Test TOOL-01: `/api/fs/find` responde 200 y devuelve los mismos resultados que la implementación de referencia. |

## R3 — Worker recursivo no soportado

| | |
|---|---|
| **Descripción** | `watcher backend not supported platform=android` → el motor cae a `backend=node` (`fs.watch` no recursivo). Un cambio en un subdirectorio profundo puede no disparar eventos. |
| **Prob.** | **Alta** (materializado) | **Imp.** | Medio (detección de cambios tardía o ausente) | **Sev.** | **Alto** |
| **Mitigación** | `capabilities.recursiveWatch=false` + `FilesystemProvider.watch()` con recorrido periódico; a medio plazo, `inotify` nativo vía N-API. El motor ya tiene la degradación implementada: el riesgo es de **corrección**, no de caída. |
| **Verificación** | Test FS-05: crear un fichero en un subdirectorio de 3 niveles → evento recibido ≤ N s. |

## R4 — Pérdida de credenciales al cambiar de ruta de datos

| | |
|---|---|
| **Descripción** | Si un host futuro usara almacenamiento compartido o cambiara la resolución de XDG, `auth.json` y `opencode.db` quedarían en otra ruta → sesiones y credenciales "desaparecerían". |
| **Prob.** | Media | **Imp.** | **Catastrófico** (pérdida de datos de usuario) | **Sev.** | **Alto** |
| **Mitigación** | `EnvironmentProvider.paths()` es **única** fuente de verdad y su resultado se persiste en el log del arranque; `CredentialProvider.store.path` se deriva de `paths().data`; la equivalencia exige que una base existente sea **detectada y migrada**, no simplemente ignorada. |
| **Verificación** | Test CRED-02: migrar de `<HOME>/.local/share` a otra ruta → 0 sesiones perdidas, 0 credenciales perdidas. |

## R5 — `db.serialize()` no disponible en `node:sqlite`

| | |
|---|---|
| **Descripción** | Si se eligiera la ruta de shim sobre `node:sqlite`, el método `serialize()` (export de la base) **no existe** en la API de Node. El motor lo usa en la capa de backup/export. |
| **Prob.** | Alta (si se toma la ruta B) | **Imp.** | Medio | **Sev.** | **Alto** |
| **Mitigación** | `DatabaseProvider.supportsSerialize` debe ser explícito; si es `false`, el motor debenegarse a exportar, no devolver un buffer vacío. Un addon N-API con `sqlite3_serialize` cierra el hueco. |
| **Verificación** | Test DB-04: `serialize()` produce un byte-array que SQLite puede reabrir sin pérdida. |

## R6 — Modo `strict` de Bun no replicable

| | |
|---|---|
| **Descripción** | `new Database(path,{strict:true})` se usa en la **migración V1→V2** (`chunk-9f4f8etn.js`). `strict` controla que SQLite rechace consultas malformadas. Un motor SQLite con `SQLITE_DBCONFIG_DQS` distinto cambia el comportamiento ante SQL inválido. |
| **Prob.** | Media | **Imp.** | Medio (una migración podría abortar donde antes no) | **Sev.** | **Medio** |
| **Mitigación** | `DatabaseProvider.supportsStrictMode`; emulación con `PRAGMA` equivalentes (`SQLITE_DBCONFIG_DQS_DDL/DML`); test de equivalencia que injecta SQL malformado y compara el código de error. |
| **Verificación** | Test DB-05: consulta malformada → mismo error y mismo código en ambas implementaciones. |

## R7 — Restricciones de sandbox sobre procesos y PTY

| | |
|---|---|
| **Descripción** | Android 10+ limita la ejecución de binarios, los procesos detached y los grupos de procesos. Termux es una app distinta: sus binarios no son ejecutables desde `app.opencodehost`. `forkpty`/`openpty` puede estar restringido. |
| **Prob.** | Media | **Imp.** | Alto (PTY y shell tool) | **Sev.** | **Alto** |
| **Mitigación** | `capabilities.detachedProcesses`, `capabilities.processGroups`, `PtyProvider.backends`; `ProcessProvider.executableSearchPath()` declara el PATH real. El motor tiene **dos** rutas de PTY: si FFI falla, usa el helper de proceso. |
| **Verificación** | Test PTY-01..04 + PROC-01..03. |

## R8 — `AsyncLocalStorage` en un host no-Bun

| | |
|---|---|
| **Descripción** | `AsyncLocalStorage` (3 contactos) sostiene el contexto de sesión. Depende del modelo de isolates/async-hooks del runtime. |
| **Prob.** | Baja (solo si se abandona Bun) | **Imp.** | Alto (contexto de sesión perdido) | **Sev.** | **Medio** |
| **Mitigación** | `RuntimeProvider.createAsyncLocalStorage()` lo hace explícito; si el host no lo da, el motor necesita un contexto explícito (no hay equivalente trivial). |
| **Verificación** | Test RT-04: el contexto de sesión sobrevive a un `await` anidado. |

## R9 — Shims que divergen del comportamiento de Bun

| | |
|---|---|
| **Descripción** | Un shim de `bun:sqlite`, `bun:ffi` o `Bun.file` reimplementado a mano puede diferir en casos límite (errores, tipos, `safeIntegers`, flags de `open`). |
| **Prob.** | Media | **Imp.** | Medio–alto | **Sev.** | **Medio** |
| **Mitigación** | Los shims deben ser **delegación**, no reimplementación: delegan en la API nativa del host. El `DatabaseProvider` solo existe para **descubrir** la capacidad y abstraer el seam; la implementación por defecto es un adaptador 1:1. |
| **Verificación** | Suite de equivalencia differential (ver `equivalence-tests.md`), ejecutada contra el APK actual como **oráculo**. |

## R10 — Romper el contrato público de OpenCode

| | |
|---|---|
| **Descripción** | Cambiar la forma de las respuestas HTTP, los nombres de evento o el esquema de la base rompe a los clientes (TUI, MCP, SDK). |
| **Prob.** | Baja | **Imp.** | Catastrófico | **Sev.** | **Alto** |
| **Mitigación** | El Platform **no aparece en ninguna respuesta pública**. `PlatformProvider` es interno; los tiposEffect (`SqliteNative`, `Global`, `Session`) y los esquemas Effect (`n.Struct`) no se tocan. |
| **Verificación** | Test API-01: captura golden de `/api/session`, `/api/config`, `/api/provider` antes/después. |

## R11 — Explosión de proveedores (34 → 34)

| | |
|---|---|
| **Descripción** | Un proveedor por cada API de Node produce 34 interfaces, sin seam real que las respalde, y una superficie de mantenimiento enorme. |
| **Prob.** | **Alta** (es el riesgo por defecto de este tipo de fase) | **Imp.** | Medio | **Sev.** | **Medio** |
| **Mitigación** | Se agrupan por **coherencia de capacidad** y por los seams reales del motor (`SqliteNative`, `Global`). 9 proveedores, no 34. Cada uno tiene al menos un seam que lo justifica. |
| **Verificación** | Revisión de diseño: cada interfaz debe mapear a ≥1 seam existente en el motor o a ≥1 API medida con un gap real. |

## R12 — La Fase 3 se ejecuta sin la evidencia de esta fase

| | |
|---|---|
| **Descripción** | Perder el corpus de 493 chunks, los 10.318 edges, los 565 contactos o el log vivo del servidor, y reconstruir el análisis "a ojo". |
| **Prob.** | Media | **Imp.** | Alto | **Sev.** | **Alto** |
| **Mitigación** | Todo el artefacto está versionado y verificado: `motor/tools/verify_integrity.py` (496 hashes, cobertura 493/493, reversibilidad 493/493). La Fase 3 arranca con `python3 motor/tools/verify_integrity.py` y exige `INTEGRIDAD OK`. |
| **Verificación** | El propio verificador, en CI, antes de cada commit de la Fase 3. |
