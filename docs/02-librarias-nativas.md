# 02 — Librerías nativas (lib/arm64-v8a/)

Todas las `.so` son para **arm64-v8a** únicamente.

---

## libopencode.so — 325 MB (la mayor)

**Runtime Node.js embebido.** Es el núcleo de la app.

### Símbolos V8 (motor JavaScript)
```
_ZN2v811ArrayBuffer3NewEPNS_7IsolateEmNS_30BackingStoreInitializationModeE
_ZN2v816FunctionTemplate12SetClassNameENS_5LocalINS_6StringEEE
_ZN2v811HandleScope10InitializeEPNS_7IsolateE
_ZN2v87Isolate36AutomaticallyRestoreInitialHeapLimitEd
_ZN4node13EmitAsyncInitEPN2v87IsolateENS0_5LocalINS0_6ObjectEEENS3_INS0_6StringEEEd
_ZN2v812api_internal12ToLocalEmptyEv
_ZN2v812api_internal13DisposeGlobalEPm
_ZN2v812api_internal19MoveGlobalReferenceEPPmS2_
_ZN2v812api_internal23GetFunctionTemplateDataEPNS_7IsolateENS_5LocalINS_4DataEEE
```

### Node-API (napi_*) — interfaz C completa
```
napi_create_function      napi_define_properties     napi_module_register
napi_set_named_property   napi_get_named_property    napi_create_reference
napi_create_arraybuffer   napi_is_buffer              napi_is_typedarray
napi_wrap / napi_unwrap   napi_add_finalizer         napi_create_external_string_utf16
napi_throw / napi_throw_type_error / napi_throw_syntax_error
napi_adjust_external_memory   napi_fatal_exception
```

### Enlazado
```
/system/bin/linker64
__libc_init
```

**Conclusión:** la app no implementa un runtime propio; incrusta Node.js completo con V8
y expone una interfaz N-API para que el código JavaScript del bundle se ejecute dentro
del proceso Android. El servidor OpenCode local corre sobre este runtime.

---

## libopencode-pty.so — 2.9 MB

**Pseudo-terminal (PTY).** Permite abrir una terminal real y ejecutar comandos de shell
dentro del proceso Android. Las strings son mayormente ofuscadas/empacadas, lo que es
normal para código de bajo nivel.

Expone las funciones estándar de PTY:
- `forkpty` / `openpty` / `grantpt` / `unlockpt` / `ptsname`
- Lectura/escritura del master y del slave
- Manejo de `SIGWINCH` para redimensionado

Se usa para el modo terminal interactivo del agente.

---

## libgit.so — 3.4 MB

**Librería Git completa** (libgit2). Strings confirmadas:

```
git [-v | --version] [-h | --help] [-C <path>] [-c <name>=<value>]
    [--git-dir=<path>] [--work-tree=<path>] [--namespace=<name>]
'%s^{commit}'    '@{push}'    core.gitproxy    remote.<name>.proxy
--is-shallow-repository    --is-bare-repository    --worktree
--blob    --stdin requires a git repository
Push objects over Git protocol to another repository
Receive missing objects and refs in local repository
Download objects and refs from remote repository
```

Soporta: `clone`, `push`, `pull`, `commit`, `remote`, `worktree`, `shallow`, `bare`,
protocolo Git nativo, proxies, y refs `^{commit}` / `@{push}`.

---

## libaihub.so — 121 KB

**AI Connection Hub** — hub de conexión multiagente. Es la pieza que expone MCP.

### Identidad del servidor
```json
{"name":"ai-connection-hub","version":"0.1.0",
 "endpoints":["/health","/tools","/agents","/tasks","/tasks/:id",
              "/events","/sessions","/mcp","/ws","/obscura"]}
```

### Protocolo
- **JSON-RPC 2.0** — `{"jsonrpc":"2.0","id":%s,"result":%s}`
- **WebSocket** — handshake con `Sec-WebSocket-Key`, frame `\u%04x` / `%02x`
- **MCP** — endpoint `/mcp`, capability `tools.listChanged`

### Endpoints
| Ruta | Función |
|------|---------|
| `/health` | estado del hub |
| `/tools` | listado de herramientas MCP |
| `/agents` | agentes registrados |
| `/tasks`, `/tasks/:id` | cola y estado de tareas |
| `/events` | stream de eventos (`task.created`, `hello`, `error`) |
| `/sessions` | sesiones activas |
| `/mcp` | transporte MCP |
| `/ws` | WebSocket |
| `/obscura` | integración con Obscura (browser headless) |

### Herramientas MCP declaradas
```json
{"type":"object","properties":{"proveedor":{"type":"string"},
 "prompt":{"type":"string"},"timeout_ms":{"type":"integer"}},
 "required":["proveedor","prompt"]}
```
- `asesor.consultar` — consulta a un proveedor (`{proveedor, prompt, timeout_ms}`)
- `asesor.listar` — lista proveedores
- acción `{action:list|status|refresh, proveedor?}` — estado/refresh de un proveedor

### Instrucciones embebidas
> "Hub de conexion multiagente. Usa asesor.consultar para consultar a un proveedor."

### Proveedor detectado
```
chatgpt
```
Mencionado también: `localhost`, `prompt`, `timeout`.

### Trazas de eventos
```json
{"type":"hello","last_id":%lld,"version":"%s"}
{"type":"task.created","task_id":"%s"}
{"via":"mcp"}
{"status":"running"}   {"status":"queued"}   {"error":"unknown tool"}
{"pong":true}
```

---

## libopencode-crhandler.so — 8 KB

**Crash handler** para Android, enfocado en `SIGSYS` (seccomp).

```
CRHANDLER: SIGSYS handler installed
CRHANDLER: sigaction(SIGSYS) failed
CRHANDLER: dlsym(RTLD_NEXT, "syscall") failed
CRHANDLER: SIGSYS(SYS_SECCOMP) -> -ENOSYS
CRHANDLER: syscall(436) -> -ENOSYS
CRHANDLER: close_range() -> -ENOSYS
OPENCODE_CRSHANDLER_DEBUG
```

Usa `dlsym(RTLD_NEXT, "syscall")` para interceptar llamadas al sistema, y `close_range()`
para liberar descriptores de forma masiva tras un crash. Interesante: referencia a
`/data/data/com.termux/files/usr/lib`, es decir, funciona **en conjunto con Termux**.

Compilado con clang 21.0.0, LLD 21.1.8, target `aarch64` con `+pgo +bolt +lto +mlgo`.
