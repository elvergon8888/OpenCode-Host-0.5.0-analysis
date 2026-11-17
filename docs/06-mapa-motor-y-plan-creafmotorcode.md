# 06 — Mapa del motor OpenCode v1 embebido + Plan CreafMotorCode

## Extracción del motor

El motor NO está obfuscado: es **código fuente legible** empaquetado por Bun.

| Artefacto | Detalle |
|---|---|
| Bundle principal | `chunk-j3cfc320.js` — 9.11 MB — exporta `ServerProcess` y `start` |
| Chunks totales | **488** (490 marcadores `// @bun @bytecode`) |
| Código extraído | **25 MB** en `bundle/chunks/` |
| Corpus indexado | `bundle/corpus.js` (25 MB, grep-able) |
| Tabla VFS | 472 rutas `file:///$bunfs/root/*.js` mapeadas |
| Runtime | **node-mobile** (`node::Handle`, `node::MakeCallback`, `NODE_MODULE`, `node_api_module`) |
| Bundler | Bun (`// @bun @bytecode`, `$bunfs`, `Bun.file`, `Bun.spawn`) |

### Estructura de chunks principales

| Chunk | Tamaño | Exports destacados | Módulo probable |
|---|---|---|---|
| `chunk-j3cfc320.js` | 9.11 MB | `ServerProcess`, `start` | **Entry point del server** |
| `chunk-thb6qhb7.js` | 2.19 MB | 143 exports | Core / Effect runtime |
| `chunk-5mbc8t5c.js` | 1.27 MB | `BUILTIN_TOOL_NAMES`, `HOOK_EVENTS`, `LEGACY_TOOL_NAME_ALIASES`, `FileIndex`, `CommandMatcher` | **Tools + hooks** |
| `chunk-578ptxwj.js` | 1.06 MB | 9 exports | Effect schema / runtime |
| `chunk-yq5qw44s.js` | 932 KB | 248 exports | Provider layer / AI SDK |
| `chunk-4z9vkptb.js` | 533 KB | 57 exports | Model registry |
| `chunk-qr0cxw0t.js` | 418 KB | 261 exports | Session / message types |
| `chunk-scqvzhyy.js` | 408 KB | `AGENT_PRIVILEGES`, `DEFAULT_AI_GATEWAY_URL`, `GITLAB_COM_URL`, `CLIENT_CAPABILITIES` | **Config / agent registry** |
| `chunk-2nw5waa2.js` | 342 KB | `DEFAULT_NEGOTIATED_PROTOCOL_VERSION`, `InMemoryServerEventBus` | **MCP protocol** |
| `chunk-1jgc1qk1.js` | 333 KB | `builtins` | MCP builtins |

---

## Contrato de compatibilidad (LO QUE NO SE PIERDE)

### 1. Catálogo de providers — se conserva 100%

```js
xf = "https://models.opencode.ai"
xx = `/experimental/v2.0/api.json?type=${_x.join(",")}`
```

El motor consulta el catálogo remoto **models.dev v2** con filtro por tipo, cachea por
`Lo.sha256(baseURL)` y etiqueta `models-dev:v2:catalog`.

- El bundle trae un **snapshot embebido** de 224 hosts de proveedor + ~8.901 modelos
  con `price:0`.
- El catálogo remoto es la fuente de verdad → **no hay que hardcodear providers**.
- La UI Kotlin de la APK es lo que limita a 7. **Eso se elimina, no el motor.**

### 2. Proveedor oficial `opencode` (OpenCode Zen / Go)

```js
ol = { provider: "opencode",
       baseURL: "https://opencode.ai/inference/openai/v1" }
// y 171 rutas más:
https://opencode.ai/inference/go/openai/v1
https://opencode.ai/inference/go/anthropic/v1
https://opencode.ai/inference/anthropic/v1
```

- `opencode` → 52 modelos free
- `opencode-go` → 9 modelos free
- Auth: `OPENCODE_API_KEY` (env var), más `cli.auth.login` con OAuth por provider.

### 3. Superficie de tools nativas — 14 tools

```js
bDt = new Set(["shell","glob","read","grep","webfetch","websearch",
                "write","edit","subagent","execute","patch",
                "todowrite","question","skill"])
```

**Estas 14 tools son el 90% de la capacidad que el bridge MCP no te da.**
El bridge solo expone ~50 tools de superficie Android; el motor tiene 14 tools
de trabajo real, con permisos, aliases (`bash`→`shell`, `task`→`subagent`,
`write`/`patch`/`apply_patch`→`edit`) y hooks.

---

## Lo que NO es compatible con Android (a rear natively)

### A. PTY — `bun:ffi` + `librust_pty`

```js
import{FFIType,JSCallback}from"bun:ffi";
import{CString,dlopen,FFIType,ptr,read}from"bun:ffi";
// chunk embebido:
exports = "/$bunfs/root/librust_pty_arm64-2resfh96.so"
```

**Problema**: el resolver de plataforma (`c(T,R,D)`) cubre `darwin` / `win32` /
`linux+musl` / `linux+glibc` — **NO tiene rama `android`**. En Android, Bun reporta
`linux` pero las librerías son **bionic**, no glibc ni musl → la resolución
selecciona `librust_pty.so` (glibc) y falla.

**Rear nativo**: `libopencode-pty.so` (2.9 MB) que **ya tienes** en la APK es
exactamente el reemplazo Android. El trabajo es:
1. Exponer el mismo ABI FFI que espera el cliente (`bun_pty_spawn` con
   `[cstring,cstring,cstring,i32,i32]`).
2. Reimplementar `c()` con rama `android` → `librust_pty.so` (bionic).
3. O mejor: sustituir el módulo `bun-pty` por un binding nativo que use
   `libopencode-pty.so` vía N-API (ya hay `node_api_module` en el runtime).

### B. SQLite — `bun:sqlite`

```js
import{Database as m}from"bun:sqlite";
// con fallback:
new (await import("bun:sqlite")).Database(e,{readonly:!0,strict:!0})
```

**Problema**: `bun:sqlite` no existe en node-mobile. El motor usa SQLite para
sesiones, credenciales y el store de mensajes.

**Rear nativo**: usar el `libsqlite3.so` del sistema Android vía N-API, o
embeber SQLite compilado para bionic (el CI que ya tienes
`android-cross-build.yml` compila crates a `aarch64-linux-android`; añadir
`rusqlite` con feature `bundled` es directo).

### C. `Bun.file` / `Bun.write` / `Bun.spawn` / `Bun.serve`

```js
Bun.file(r).arrayBuffer()   // adjuntos, pty embebido
Bun.fileURLToPath(import.meta.url)
```

**Problema**: APIs de Bun, no de Node.

**Rear nativo**: polyfill sobre `node:fs` — `Bun.file()` → `fs.promises.open()`
con `.arrayBuffer()`, `.text()`, `.exists()`, `.size`. Es trabajo de pocas horas y
**no requiere tocar el runtime**.

### D. `node:child_process` / `node:worker_threads` / `node:readline`

```js
import{spawn as Q}from"child_process";
import y from"path"; import p from"path";
```

**Problema**: node-mobile soporta `child_process` parcialmente, pero **no**
`worker_threads` en Android (threads nativos están restringidos) ni PTY real.

**Rear nativo**:
- `child_process` → usar el `libopencode-pty.so` (spawn + PTY) en vez de pipes.
- `worker_threads` → single-thread con `Effect` fibers (el motor ya es
  Effect-based: `T.fn(...)`, `t.gen(function*(){...})`) — **el motor ya está
  diseñado para concurrencia sin threads**.

### E. Rutas y permisos del filesystem

El motor espera POSIX: `/tmp`, `$HOME/.local/share/opencode`, `/bin/sh`.
En Android bionic: paths de app sandbox, sin `/bin/sh` (hay `/system/bin/sh`),
sin `/tmp` (hay `$TMPDIR`).

**Rear nativo**: capa de path mapping + un shell Android-compatible.

---

## Arquitectura propuesta: CreafMotorCode

```
┌─────────────────────────────────────────────────────────────────┐
│  CreafMotorCode (núcleo)                                        │
│  ─────────────────────────────────────────────────────────────  │
│  • Núcleo OpenCode v1 (25 MB extraídos, código legible)         │
│  • Re-armado de la capa de plataforma:                          │
│      PlatformProvider (interface propia, no Bun globals)         │
│      ├─ Fs      → node:fs (ya funciona)                         │
│      ├─ Process → libopencode-pty.so  (N-API)                   │
│      ├─ Sqlite  → libsqlite3 bionic (N-API)                     │
│      ├─ FFI     → dlopen bionic (N-API)                          │
│      ├─ Net     → node:net (localhost OK)                        │
│      └─ Env     → Android env + config del motor                 │
│  • Proveedores: SIN CAMBIOS (catálogo models.dev v2 remoto)     │
│  • Tools: las 14 nativas, permissions, aliases, hooks            │
│  • MCP: el cliente MCP nativo (chunk-2nw5waa2) sin cambios      │
└─────────────────────────────────────────────────────────────────┘
            ▲                          ▲
   ┌────────┴────────┐      ┌──────────┴──────────┐
   │  app.opencodehost│      │  CreafMobile (UI)   │
   │  (activity/pty)  │      │  (nueva, o reusar  │
   │                 │      │   el WebView actual)│
   └─────────────────┘      └─────────────────────┘
```

### Principio rector

> **Separar el motor de su plataforma.**

OpenCode v1 mezcla `bun:sqlite`, `bun:ffi` y `Bun.file` directamente en la lógica.
CreafMotorCode introduce un `PlatformProvider` (una interfaz) que el motor consume,
y una implementación Android nativa. Así:

- El motor queda **agnóstico de plataforma** (testeable en Node/Termux).
- Android se implementa con N-API contra `.so` bionic.
- Los providers, el catálogo, el protocolo MCP y las tools **no se tocan** → la
  compatibilidad con OpenCode es total, no aproximada.

---

## Fases de trabajo

### Fase 0 — Extracción y lectura (✅ hecha)
- [x] 25 MB de código fuente del motor extraídos
- [x] Corpus indexado y grep-able (`bundle/corpus.js`)
- [x] Mapa de chunks → módulos
- [x] Contrato de providers documentado
- [x] Lista de APIs incompatibles identificada

### Fase 1 — Harness de lectura (nueva, inmediata)
Convertir los 488 chunks en un árbol de módulos navegable:
- Reconstruir imports/exports entre chunks → grafo de módulos.
- Renombrar los símbolos minificados a sus nombres reales (vienen en los
  `export{X as Name}`).
- Generar un índice `motor/` con un archivo por módulo, con nombres legibles.
- **Resultado:** se puede leer y modificar el motor como código normal.

### Fase 2 — Extracción del PlatformProvider
- Identificar los ~15 puntos de contacto con Bun (grep `Bun\.`, `bun:`).
- Introducir la interfaz `Platform` con: `fs`, `process`, `sqlite`, `ffi`, `net`,
  `env`, `tempdir`, `shell`.
- Inyectar un shim que sustituya los globales de Bun.

### Fase 3 — Backend Android nativo (N-API)
- `libcreaf_sqlite.so` — SQLite bionic.
- `libcreaf_pty.so` — PTY sobre `libopencode-pty.so` (ya existe en la APK).
- `libcreaf_ffi.so` — `dlopen`/`dlsym`/`CString` para Bun FFI.
- `libcreaf_shell.so` — shell Android (`/system/bin/sh`).

### Fase 4 — Preservación de compatibilidad
- Test de contrato: el motor debe listar los mismos providers y las mismas tools.
- Verificar contra `models.opencode.ai/experimental/v2.0/api.json`.
- Verificar inferencia real con `opencode` / `opencode-go` / `zai` / `nvidia`.
- Snapshot del catálogo embebido → fallback offline.

### Fase 5 — Empaquetado
- APK con `libopencode.so` re-armado (reemplazar el Bun runtime por node-mobile
  + las `.so` nuevas).
- `CreafMobile` UI o reusar el WebView actual del server.
- El bridge MCP queda reducido a lo Android-específico (WebView, intents, cámara).

---

## Qué se mantiene compatible

| Elemento | Estado | Nota |
|---|---|---|
| Catálogo de providers (models.dev v2) | ✅ 100% | Remoto, sin cambios |
| `opencode` / `opencode-go` (Zen) | ✅ 100% | 61 modelos free |
| `OPENCODE_API_KEY` + OAuth por provider | ✅ 100% | Sin cambios |
| Las 14 tools nativas | ✅ 100% | Con permissions, aliases, hooks |
| Protocolo MCP | ✅ 100% | `chunk-2nw5waa2` sin cambios |
| HTTP API del server | ✅ 100% | `ServerProcess` / `start` |
| `bun:sqlite` | 🔧 Rear | → N-API bionic |
| `bun:ffi` | 🔧 Rear | → N-API bionic |
| `Bun.file` / `Bun.write` | 🔧 Rear | → polyfill `node:fs` |
| PTY (`librust_pty`) | 🔧 Rear | → `libopencode-pty.so` ya existente |
| `worker_threads` | 🔧 Rear | → fibers de Effect (el motor ya lo hace) |
| Paths POSIX (`/tmp`, `/bin/sh`) | 🔧 Rear | → mapping Android |
