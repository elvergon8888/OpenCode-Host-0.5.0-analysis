# Fase 2.6 — Validación experimental de PTY y `node:worker_threads`

**APK:** `OpenCode-Host-0.5.0-7` (original, sin modificar)
**Motor real:** OpenCode **2.2.5** sobre **Bun 1.4.0** (JavaScriptCore), arm64-android
**Binario oráculo:** `/data/app/app.opencodehost-*/lib/arm64/libopencode.so` (340.063.904 B)
**Dispositivo:** Samsung SM-A516U · Android 10 (SDK 29) · 8 núcleos · `/proc` con `hidepid=2` · `/dev/pts` con `mode=600` · **sin `/dev/shm`**
**Fecha de ejecución:** 2026-11-18 (UTC)

> **Restricciones respetadas.** No se modificaron los 493 chunks originales, ni `libopencode.so`,
> ni el APK, ni la implementación de Bun. No se compiló ripgrep. No se instrumentó el Platform.
> No se implementaron sustitutos ni workarounds. Los workers se midieron con `node:worker_threads`
> real, **nunca** con fibers de Effect.

---

## 0. Resumen ejecutivo

| | PTY | `node:worker_threads` |
|---|---|---|
| Casos ejecutados | **9** (P1–P9) | **38** (W1–W9, batería canónica v6) |
| PASS | **8** | **36** |
| FAIL | **1** | **0** |
| PARTIAL | **0** | **2** (la misma limitación real) |
| NOT TESTED | **0** | **0** |

**Conclusiones de fondo:**

1. **La ruta FFI de PTY (`/api/pty`) es plenamente funcional en Android.** Crea un PTY real
   (`/dev/pts/N`), con `tty_nr` verificable en `/proc`, E/S por el mismo descriptor, señales,
   códigos de salida, redimensionado y cierre limpio. **8/9 PASS.**
2. **La ruta helper/daemon de PTY (`experimental/persistent-pty`) está rota en Android.**
   El daemon `opencode-pty` no arranca: `/dev/pts` está montado con `mode=600` (solo root) y
   `/dev/shm` **no existe**. La API responde **HTTP 503 `ServiceUnavailableError`**. **FAIL.**
   No es corregible sin tocar el motor o el SO.
3. **`node:worker_threads` es funcional de extremo a extremo en el runtime Android:**
   36 PASS / 0 FAIL. Paralelismo real medido (**ratio 3.99 con 4 workers**, **7.92 con 8**),
   aislamiento de estado demostrado, memoria compartida con `Atomics` verificada, y sin fugas
   de hilos.
4. **Única limitación real de workers:** `moveMessagePortToContext` está **declarada pero no
   implementada** en Bun 1.4.0 (`NotImplementedError` / `ERR_NOT_IMPLEMENTED`). No bloquea
   ninguna otra capacidad. **PARTIAL.**

### Veredicto por capacidad

| Capacidad | Estado | Evidencia |
|---|---|---|
| PTY vía FFI (`/api/pty`) | **FUNCIONAL** | P1–P9 · `ffi_pty_probe.json` 9/9 PASS |
| PTY vía helper/daemon | **ROTA en Android** | P2 → HTTP 503 `ENOENT … service.json` |
| `node:worker_threads` | **FUNCIONAL** (36 PASS / 0 FAIL) | `workers_battery6.json` |
| `moveMessagePortToContext` | **NO IMPLEMENTADA en Bun** | `NotImplementedError` (W4.8, W9.7) |

---

## 1. Método

### 1.1 Principio rector

> **El APK original es el oráculo.** Ninguna capacidad se da por buena por el hecho de que el
> código exista en el bundle: se ejecuta contra el binario que la app ejecuta y se registra
> lo que ocurre.

### 1.2 Vías de ejecución

| Vía | Comando | Uso |
|---|---|---|
| **Servidor HTTP vivo** | `http://127.0.0.1:4096` (proceso `libopencode.so serve`, PID 24587) | Pruebas PTY por API (`/api/pty`, `/api/shell`, `experimental/persistent-pty`) |
| **Bun del APK como intérprete** | `BUN_BE_BUN=1 <APK>/lib/arm64/libopencode.so run <script.js>` | Batería de workers, cliente WebSocket, probe FFI aislado |

**Hallazgo habilitante.** `BUN_BE_BUN=1` convierte `libopencode.so` en el CLI de **Bun 1.4.0
puro** (`--version` → `1.4.0`; `run fichero.js` ejecuta JS). Esto da acceso al **runtime exacto
del APK** para medir `node:worker_threads` y `bun:ffi` sin tocar el motor.

**Ejecución desde Termux.** Requiere `LD_LIBRARY_PATH=/data/app/app.opencodehost-*/lib/arm64`
para resolver `libopencode-crhandler.so`. Sin él, el binario aborta al arrancar.

### 1.3 Autenticación

HTTP **Basic** `opencode:<OPENCODE_PASSWORD>` (el bearer token devuelve **401**).
El WebSocket PTY exige además un **ticket de un solo uso**:

```
POST /api/pty/{id}/connect-token      header: x-opencode-ticket: 1
  -> {"data":{"ticket":"…","expires_in":60}}
GET  /api/pty/{id}/connect?ticket=…   (upgrade WebSocket)
```

`Sec-WebSocket-Key` debe ser base64 válido de 16 bytes. Constante localizada en el motor:
`Me = "x-opencode-ticket"`, `hn = "1"`.

### 1.4 Protocolo WebSocket PTY (medido)

- Frames de **texto**: salida del terminal.
- Frames **binarios**: metadatos, con prefijo `\x00` — p. ej. `\x00{"cursor":47}`.
- Cierre: **4404 `"session exited"`** cuando la sesión termina.

### 1.5 Oráculo diferencial Node v26

Para distinguir *limitación del runtime* de *artefacto del probe*, los casos ambiguos se
ejecutaron también con **Node v26.13.1** (Termux), que **no forma parte del APK** y solo se
usa como referencia de semántica estándar:

`motor/fase2.6/probes/workers_node_oracle.mjs` → `results/workers_node_oracle.json`

| Caso | Node v26 | Bun 1.4.0 (APK) | Conclusión |
|---|---|---|---|
| MessagePort sin `transferList` | `DataCloneError` code 25 | `DataCloneError` code 25 | **Equivalentes** |
| BroadcastChannel principal↔worker | PASS | PASS | **Equivalentes** |
| BroadcastChannel 2 instancias, mismo hilo | PASS | PASS | **Equivalentes** |
| `env: SHARE_ENV` + `get/setEnvironmentData` | PASS | PASS | **Equivalentes** |
| `moveMessagePortToContext` | `ERR_INVALID_ARG_TYPE` | `NotImplementedError` | **Bun no la implementa** |
| `isInternalThread` | `boolean` | `boolean` | **Equivalentes** |
| `terminate()` sobre worker ya terminado | `undefined` | `undefined` | **Equivalentes** |

---

## 2. Resultados — PTY

### 2.1 Arquitectura: dos rutas, una sola funcional

```
POST /api/pty  ──►  server.pty.create  ──►  import dinámico  /$bunfs/root/chunk-xq2yeq74.js
                                                        │
                                                        └─► bun:ffi  dlopen("librust_pty")
                                                            └─► 8 símbolos bun_pty_*
                                                            ══► FUNCIONAL en Android

POST /api/experimental/session/{sid}/terminal
              ──►  PersistentPty  ──►  daemon helper `opencode-pty` (OPENCODE_PTY_BIN)
                                        └─► protocolo 7, socket en OPENCODE_PTY_SOCKET_DIR
                                        ══► ROTO en Android (503)
```

La `.so` FFI **no está en disco**: está embebida en el binfs de `libopencode.so`.

| Artefacto | Valor |
|---|---|
| Offset en `libopencode.so` | `339368498` |
| Tamaño | `540368` B |
| SHA-256 | `b497705d270c55f36515f7427152ed50b84e07563f7682cfb96992107bdb8a8a` |
| Formato | ELF 64-bit LSB, `ET_DYN`, `EM_AARCH64` (machine `0xB7`) |
| Símbolos | `bun_pty_spawn`, `bun_pty_write`, `bun_pty_read`, `bun_pty_resize`, `bun_pty_kill`, `bun_pty_get_pid`, `bun_pty_get_exit_code`, `bun_pty_close` |

Extraída a `motor/fase2.6/raw/librust_pty_arm64-2resfh96.so` (**lectura del binario, sin modificarlo**).

### 2.2 Tabla de resultados PTY

| # | Prueba | Resultado | Evidencia literal |
|---|---|---|---|
| **P1** | Ruta FFI (`/api/pty`) | **PASS** | `POST /api/pty` → **HTTP 200**, `status:"running"`, `pid:7333` real; `exitCode:0` al terminar |
| **P2** | Ruta helper/daemon | **FAIL** | `POST /api/experimental/session/{sid}/terminal` → **HTTP 503** `ServiceUnavailableError`: `ENOENT … opencode/pty/{uuid}/service.json` |
| **P3** | Sesión interactiva | **PASS** | `sh -i` → prompt `:/data/data/…/work $ ` recibido; stdin enviado; marcador devuelto con eco |
| **P4** | Ejecutar comandos | **PASS** | Comandos encadenados (`echo CMD1; echo CMD2; pwd; uname -m`) → `status:"exited"`, `exitCode:0` |
| **P5** | stdin/stdout/stderr | **PASS** | `P5_STDOUT_MARKER` y `P5_STDERR_MARKER` por el **mismo descriptor** (semántica PTY); contraste con `/api/shell` (stdout+stderr combinados a fichero, `output`, `cursor`, `size`, `truncated`) |
| **P6** | Señales y terminación | **PASS** | `SIGTERM` → trap ejecutado → `exitCode:42`; `PUT /api/pty/{id}` (título + `size{rows,cols}`) → **200**; `DELETE` → **204**; `GET` posterior → **404 `PtyNotFoundError`** |
| **P7** | Cierre de sesión | **PASS** | 24 PTY creadas → **24 eliminadas → 0 restantes**; `DELETE` → 204 y desaparece de `GET /api/pty` |
| **P8** | Detección de errores | **PASS** | Comando inexistente → **HTTP 500**; PTY inexistente → **404 `PtyNotFoundError`**; `exit 7` → `exitCode:7`; body sin `command` → **200** (usa shell por defecto `/system/bin/sh -l`) — *observación: validación laxa* |
| **P9** | Proceso terminado inesperadamente | **PASS** | `SIGKILL` externo → `status:"exited"`, `exitCode:1`, y el WS cierra con **4404 `"session exited"`** |

### 2.3 Evidencia dura: es un PTY real

El proceso hijo creado por la ruta FFI tiene un terminal real asignado. Capturado del
`/proc` del propio hijo (mismo UID que el servidor):

```
pid=7476 comm=(sh) ppid=24587 tty_nr=34828 tpgid=7476

/proc/7476/fd:
0 -> /dev/pts/12
1 -> /dev/pts/12
2 -> /dev/pts/12
```

Los tres descriptores (stdin, stdout, stderr) apuntan al **mismo** `/dev/pts/12`: es la
semántica propia de una PTY (no de un pipe), y explica por qué P5 fusiona stdout y stderr.

### 2.4 Prueba FFI aislada — 9/9 PASS

`probes/ffi_pty_probe.js` reproduce el contrato exacto del módulo del APK (`bun:ffi` +
`librust_pty`, 8 símbolos) y lo ejecuta de forma aislada con la `.so` extraída:

| # | Función | Resultado | Evidencia |
|---|---|---|---|
| F1 | Resolución de la librería | **PASS** | encontrada vía `BUN_PTY_LIB`/rutas por defecto |
| F2 | `dlopen()` + 8 símbolos | **PASS** | `bun_pty_spawn/write/read/resize/kill/get_pid/get_exit_code/close` |
| F3 | `bun_pty_spawn()` | **PASS** | `handle: 1` (80×24) |
| F4 | `bun_pty_get_pid()` | **PASS** | `pid: 9060` |
| F5 | `bun_pty_read()` | **PASS** | 29 B; stdout **y** stderr en el mismo descriptor (`"FFI_FFI_MARKER\r\nFFI_FFI_ERR\r\n"`) |
| F6 | `bun_pty_write()` (stdin) | **PASS** | 21 B escritos; el hijo recibió y devolvió el eco (`FFI_STDIN_MARKER`) |
| F7 | `bun_pty_resize()` | **PASS** | retorno `0` a 120×40 |
| F8 | `bun_pty_get_exit_code()` | **PASS** | valor de salida del hijo |
| F9 | `bun_pty_kill()` + `bun_pty_close()` | **PASS** | ambos sin error |

### 2.5 Causa raíz del FAIL de la ruta helper

El binario `libopencode-pty.so` (**opencode-pty 0.4.0, protocolo 7**) exige:

- `OPENCODE_PTY_SOCKET_DIR` (directorio de sockets PTY),
- y un PTY master en `/dev/pts/`.

En este Android 10:

```
/proc/mounts:
  devpts /dev/pts devpts rw,seclabel,relatime,mode=600,ptmxmode=000 0 0
  → /dev/pts es modo 600, owner root: solo root puede crear pts
/dev/shm: no existe
```

Reproducción directa del fallo:

```console
$ libopencode-pty.so --version
opencode-pty 0.4.0 (protocol 7)

$ libopencode-pty.so daemon --name f26d --runtime-dir <dir escribible>
error: Read-only file system (os error 30)

$ libopencode-pty.so play --name f26p --runtime-dir <dir> -- echo X
error: opencode-pty daemon exited before ownership acquisition: exit status: 1
```

El daemon llega a crear el `service.lock` pero **nunca** el `service.json`: los **22
directorios** de `~/.local/state/opencode/pty/` del dispositivo contienen únicamente
`service.lock` vacío. Es decir, **el helper nunca completó un arranque en Android**.

**Conclusión:** la ruta helper no es reparable sin modificar el motor o el SO (cambiar el
montaje de `/dev/pts` o crear `/dev/shm` requiere privileges de root). Se reporta como
**FAIL**, no como PASS ni como limitación teórica.

### 2.6 Observación adicional (no concluyente)

`POST /api/pty` con un body **sin `command`** responde **HTTP 200** y crea una PTY con
`command:"/system/bin/sh"`, `args:["-l"]`. La validación de entrada es **laxa**: el motor
aplica un shell por defecto en lugar de rechazar el payload. No afecta a la corrección de
las demás pruebas, pero conviene conocerlo al integrar.

---

## 3. Resultados — `node:worker_threads`

### 3.1 Batería canónica v6

**Artefacto:** `probes/workers_battery6.js` → `results/workers_battery6.json` + `results/workers_battery6.log`
**Ejecución:** `BUN_BE_BUN=1 <APK>/lib/arm64/libopencode.so run motor/fase2.6/probes/workers_battery6.js`
**Runtime:** Bun **1.4.0** (el del APK), `android-arm64`, `process.versions.node=26.3.0`, 8 núcleos.

**Resultado: 36 PASS / 2 PARTIAL / 0 FAIL** (38 casos).

#### Protocolo de la batería (requisitos de robustez)

| Requisito | Implementación en la v6 |
|---|---|
| Handshake explícito | El worker emite `{__f26_ready:true, threadId, pid}` **antes** de aceptar comandos; el principal **espera** ese ready. Nada se envía antes. |
| Recepción por ACK | RPC con **id correlativo**: cada comando espera su `__f26_ack` con el mismo id. Sin ACK → FAIL. |
| Ejecución determinista | Comandos con resultado verificable (`sum`, `echo`, `clone`, `identity`…), nunca "solo que no crashee". |
| Timeouts explícitos | `ready=10 s`, `rpc=10 s`, `exit=10 s`, `cleanup=8 s`. Todo timeout → **FAIL** con `TIMEOUT_<caso>_<ms>ms`. Nunca falso positivo. |
| Errores capturados | El harness captura la excepción y la reenvía como `__f26_err` con id, mensaje, nombre y stack. |
| Terminación verificada | Se espera el evento **`exit`** (o el resultado de `terminate()`), no se infiere. |
| Limpieza comprobada | Se compara `/proc/self/task` antes/después y se cuentan los hilos `Worker`. |
| Aislamiento en concurrencia | Cada worker calcula un checksum propio; se verifica contra el esperado y que los `threadId` son distintos. |
| Logs y evidencias | Cada caso escribe su evidencia en JSON **y** en el log de consola (`.log` separado). |
| Clasificación | PASS / FAIL / PARTIAL / NOT TESTED, con `porRequisito` en el JSON. |

### 3.2 Tabla de resultados por requisito

| Requisito | Casos | PASS | FAIL | PARTIAL | Veredicto |
|---|---|---|---|---|---|
| **W1** Crear worker | 4 | 4 | 0 | 0 | **PASS** |
| **W2** Ejecutar código | 1 | 1 | 0 | 0 | **PASS** |
| **W3** Comunicación worker↔principal | 1 | 1 | 0 | 0 | **PASS** |
| **W4** Transferencia de mensajes | 8 | 7 | 0 | 1 | **PASS** (1 API no implementada) |
| **W5** Errores | 4 | 4 | 0 | 0 | **PASS** |
| **W6** Terminación | 4 | 4 | 0 | 0 | **PASS** |
| **W7** Limpieza de recursos | 4 | 4 | 0 | 0 | **PASS** |
| **W8** Concurrencia | 4 | 4 | 0 | 0 | **PASS** |
| **W9** Limitaciones Android | 9 | 7 | 0 | 2 | **PASS** (1 API no implementada) |

### 3.3 Detalle de los 38 casos

| # | Caso | Resultado | Evidencia |
|---|---|---|---|
| W1.1 | Crear worker (`eval:true`) con handshake | **PASS** | `handshakeReady:true`; `threadId` 1 vs 0 principal; mismo `pid`; RPC `hola` |
| W1.2 | Crear worker desde fichero (ruta absoluta) | **PASS** | `{"from":"fichero-worker"}` recibido |
| W1.3 | Crear worker desde `file://` URL (`new URL`) | **PASS** | mensaje recibido |
| W1.4 | Opciones del constructor (`workerData`, `resourceLimits`, `stackSizeMb`) | **PASS** | `workerData {k:42}`; límites aceptados (*no se verificó aplicación real del límite: V8-only*) |
| W2.1 | Ejecutar código (resultados deterministas vía ACK) | **PASS** | `echo:"hola-mundo"`, `suma:15`, `elementos:5` |
| W3.1 | Comunicación bidireccional (ACK correlativo) | **PASS** | respuestas en orden `["ida","idb","idc"]` + push espontáneo `pushVerificado:true` |
| W4.1 | Structured clone (objeto/array/Date) | **PASS** | `{"a":1,"b":[1,2,3],"d":"1970-01-01T00:00:00.000Z"}` |
| W4.2 | Transferencia de `ArrayBuffer` (`transferList`) | **PASS** | 64 B en el worker; **`byteLength` del emisor = 0** (detach, igual que Node) |
| W4.3 | `SharedArrayBuffer` entre hilos | **PASS** | 32 B |
| W4.4 | `MessagePort` transferido principal↔worker | **PASS** | worker→principal `"hola-desde-worker"`; principal→worker `"principal->worker"` |
| W4.5 | `MessagePort` **sin** `transferList` (debe rechazarse) | **PASS** | `DataCloneError` code 25 — **idéntico a Node v26** |
| W4.6 | `BroadcastChannel` principal→worker | **PASS** | suscripción confirmada; `"payload-bc"` recibido |
| W4.7 | `env: SHARE_ENV` | **PASS** | `valorCompartido:"valor-compartido"` |
| W4.8 | `moveMessagePortToContext` | **PARTIAL** | `NotImplementedError` / `ERR_NOT_IMPLEMENTED` — **limitación real del runtime** |
| W5.1 | Excepción no capturada → evento `error` | **PASS** | `BOOM_WORKER_UNCAUGHT`, stack presente, `exitCode:1` |
| W5.2 | Excepción asíncrona → evento `error` | **PASS** | `BOOM_ASYNC` |
| W5.3 | Error de sintaxis | **PASS** | error reportado al principal |
| W5.4 | Error capturado y reenviado | **PASS** | `{"__f26_err":true,"cmd":"throw","error":"error-controlado","stack":[…]}` |
| W6.1 | `terminate()` sobre worker en ejecución | **PASS** | `exitCode:1`, 409 ms; hilos 15 → 17 → 15 |
| W6.2 | Salida natural con código | **PASS** | `process.exit(7)` → `exitCode:7` |
| W6.3 | Evento `exit` por terminación natural | **PASS** | `exitCode:0` |
| W6.4 | `terminate()` sobre worker ya terminado | **PASS** | devuelve `undefined` — **idéntico a Node v26** (`w64_oracle.mjs`) |
| W7.1 | Recursos de hilo liberados | **PASS** | hilos 15 → 16 → 15 (`delta:0`); hilo `Worker` presente durante y ausente después |
| W7.2 | Sin fuga tras 6 workers secuenciales | **PASS** | hilos 15 → 15 (`delta:0`) |
| W7.3 | `worker.unref()` / `worker.ref()` | **PASS** | ambas disponibles y sin error |
| W7.4 | `resourceLimits` aceptado | **PASS** | constructor acepta la opción (*aplicación real no verificada*) |
| W8.1 | 4 workers CPU-bound (2000 ms c/u) | **PASS** | `wallMs:2006` vs `8000` serial → **ratio 3.99**, solapamiento confirmado |
| W8.2 | 8 workers CPU-bound (1500 ms c/u) | **PASS** | `wallMs:1516` vs `12000` serial → **ratio 7.92** |
| W8.3 | Aislamiento de estado por worker | **PASS** | checksums `[31000,31001,31002,31003]` = esperados; `threadId` `[43,44,45,46]` distintos |
| W8.4 | `Atomics` + `SharedArrayBuffer` (4 workers) | **PASS** | valor final leído **por el principal** = **4** (esperado 4); sin incrementos perdidos |
| W9.1 | El worker es un hilo real del mismo proceso | **PASS** | `pid` principal = `pid` worker; `ppid` 6110; `bun 1.4.0`; `argv0=…/libopencode.so` |
| W9.2 | Permisos de filesystem worker vs principal | **PASS** | principal `OK` / worker `OK`; mismo UID 10306 — **sin restricción adicional** |
| W9.3 | El worker puede crear procesos hijos | **PASS** | `child_process.spawnSync("/system/bin/echo")` → `status:0`, `"worker-child-ok"` |
| W9.4 | Coste de arranque (5 muestras) | **PASS** | `[47,35,81,75,88]` ms, media **65 ms** |
| W9.5 | 16 workers simultáneos | **PASS** | 16 creados en 927 ms; hilos 17 → 49 → 17 |
| W9.6 | Cobertura de la API exportada | **PASS** | 21 símbolos exportados, **0 divergencias de forma** frente a Node |
| W9.7 | APIs exportadas pero no implementadas | **PARTIAL** | `moveMessagePortToContext` → `NotImplementedError` (**misma causa que W4.8**) |
| W9.8 | Registro de señales (`process.on`) en el worker | **PASS** | `process.on` es función; handler registrado |

### 3.4 Por qué la batería v6 es la canónica

Las versiones `workers_battery.js` … `workers_battery5.js` **se conservan** (no se sobrescriben)
como registro del proceso de desambiguación. La v6 los consolida. Cinco casos que la v2–v4
marcaban como FAIL resultaron ser **artefactos del probe**, confirmados contra Node v26:

| Caso | FAIL original | Causa real | Veredicto final |
|---|---|---|---|
| BroadcastChannel principal↔worker | `TIMEOUT_bc` | El worker aún no se había suscrito cuando el principal emitía (carrera). Con handshake → **PASS** | **PASS** |
| `MessagePort` transferido | `TIMEOUT_mct` | El principal no transfería con `transferList` y esperaba un ACK inexistente. Con `transferList` → **PASS** | **PASS** |
| `env: SHARE_ENV` | `DataCloneError` | El probe posteaba el **Symbol** `SHARE_ENV`, que no es clonable **ni en Node**. Sin postear el símbolo → **PASS** | **PASS** |
| `terminate()` idempotente | `undefined` | Node v26 devuelve **exactamente** `undefined` → equivalencia | **PASS** |
| `isInternalThread` | `TypeError` | Es **boolean** en Bun **y** en Node (se llamaba como función) | **PASS** |

> Regla aplicada: un FAIL solo se acepta como **limitación del runtime** si el caso equivalente
> **pasa** en el oráculo Node v26. Si ambos fallan igual, es **equivalencia de comportamiento**.

---

## 4. Limitaciones y dependencias

### 4.1 Limitaciones del runtime (confirmadas)

| # | Limitación | Alcance | Evidencia |
|---|---|---|---|
| L1 | `moveMessagePortToContext` no implementada (`NotImplementedError`) | Solo esa API. **No** afecta a `MessageChannel`, `MessagePort` ni `BroadcastChannel` | W4.8, W9.7 |
| L2 | Ruta helper/daemon de PTY no arranca en Android | Toda la superficie `experimental/persistent-pty` | P2 (HTTP 503) + reproducción directa |
| L3 | `resourceLimits` se acepta pero su aplicación real no es verificable | Solo si el host usa V8 (Bun usa JavaScriptCore) | W1.4, W7.4 |
| L4 | `stackSizeMb` se acepta sin error, sin efecto verificable | Igual que L3 | W1.4 |

### 4.2 Dependencias del entorno

| Dependencia | Estado | Impacto |
|---|---|---|
| `/dev/pts` con `mode=600` (solo root) | **Estructural de Android 10** | Impide el daemon helper (L2) |
| `/dev/shm` inexistente | **Estructural de Android 10** | Impide el daemon helper (L2) |
| `/proc` con `hidepid=2` | Kernel | Termux (UID distinto) no ve los PIDs del servidor; las señales se enviaron desde el sandbox de la app (mismo UID) |
| `LD_LIBRARY_PATH` a `/data/app/app.opencodehost-*/lib/arm64` | **Requerido** para ejecutar el binario del APK desde Termux | Sin él: `libopencode-crhandler.so` no encontrado |
| Autenticación Basic `opencode:<password>` | Requerida | Bearer → 401 |
| Ticket `x-opencode-ticket: 1` | Requerido para WS y `connect-token` | Sin él → 403 |

### 4.3 Lo que NO se ha medido (y por qué)

| Prueba | Estado | Motivo |
|---|---|---|
| Turnos de LLM (`session.prompt`) | **NOT TESTED** | No hay modelo/API key de proveedor configurado |
| Compilación de ripgrep (`arm64-android`) | **NOT TESTED** | Fuera del alcance autorizado (Fase 3 opción (a)) |
| Instrumentación del PlatformProvider | **NOT TESTED** | Fuera del alcance autorizado (Fase 3 opción (b)) |
| Daemon helper en otro dispositivo/SO | **NOT TESTED** | Requiere un entorno con `/dev/shm` y `/dev/pts` utilizable |
| `resourceLimits` con aplicación real | **NOT TESTED** | Bun usa JavaScriptCore; el límite es una opción de V8 |

### 4.4 Advertencias de método

- Las medidas de **tiempo** (arranque 65 ms, ratios) son puntuales: un dispositivo de 8 núcleos
  con gestión de energía puede dar cifras distintas. Los **ratios de paralelismo** sí son
  concluyentes porque comparan contra la suma serial en la misma ejecución.
- El FAIL de P2 se midió **contra el servidor vivo**; la causa raíz se reprodujo **aislada**
  con el binario `libopencode-pty.so` del propio APK.
- La ruta FFI se validó **por dos vías independientes**: la API HTTP del servidor y el probe
  FFI aislado. Ambas coinciden.

---

## 5. Reproducibilidad

### 5.1 Requisitos

- Dispositivo Android 10 con la app OpenCode Host 0.5.0 instalada y el servidor escuchando.
- Termux con `allow-external-apps=true` en `~/.termux/termux.properties`.
- Node v26 (Termux) — **solo** como oráculo diferencial; no es necesario para el APK.
- `curl` y `python3`.

### 5.2 Comandos

```bash
L=/data/app/app.opencodehost-*/lib/arm64

# Batería de workers (runtime exacto del APK)
F26_OUT=motor/fase2.6/results/workers_battery6.json \
F26_LOG=motor/fase2.6/results/workers_battery6.log \
LD_LIBRARY_PATH=$L BUN_BE_BUN=1 $L/libopencode.so run motor/fase2.6/probes/workers_battery6.js

# Batería PTY sobre la API HTTP del servidor vivo
OPENCODE_PASSWORD='…' bash motor/fase2.6/probes/pty_battery.sh

# Probe FFI aislado
F26_FFI_OUT=motor/fase2.6/results/ffi_pty_probe.json \
LD_LIBRARY_PATH=$L BUN_BE_BUN=1 $L/libopencode.so run motor/fase2.6/probes/ffi_pty_probe.js \
  motor/fase2.6/raw/librust_pty_arm64-2resfh96.so

# Oráculo diferencial Node v26
node motor/fase2.6/probes/workers_node_oracle.mjs

# Integridad de los originales (DEBE terminar con "INTEGRIDAD OK")
python3 motor/tools/verify_integrity.py
```

### 5.3 Trazabilidad de los artefactos

| SHA-256 | Bytes | Artefacto |
|---|---|---|
| `b497705d270c55f36515f7427152ed50b84e07563f7682cfb96992107bdb8a8a` | 540368 | `raw/librust_pty_arm64-2resfh96.so` |
| `f5c4571bf7e9afc22a440875a746f593f988c4c31bf824f602601c04b20e6c8e` | 350880 | `raw/openapi.json` |
| `6b01e3ef0ed12727cbe52e3488ca89e657dc041863fb9834f0b38fc06b3e4411` | 3566 | `results/ffi_pty_probe.json` |
| `c7992f17e10c175817bf25be6a4ee93e1d6ba32e6309650aa8699e4c3c8d0ba2` | 12870 | `results/pty_battery_stdout.txt` |
| `ca9ca819ac40b2eb194095b6d8c0b57e818249db5617fd867c5cc4b3f0c00212` | 18818 | `results/workers_battery6.json` |
| `ec65b0f7d0554c6982e5e10b7d350e2e2a8cb236e5419a95427110fd6b35df1b` | 11390 | `results/workers_battery6.log` |
| `2bb21c379ea8ff3a94d2eb933596ea19e0ba81a2ce0bdb408274a682c18be80e` | 1783 | `results/workers_node_oracle.json` |

> Los hashes de `workers_battery6.*` corresponden a la ejecución final registrada en este
> informe. Reejecuciones pueden variar en los campos de tiempo.

### 5.4 Estructura de `motor/fase2.6/`

```
motor/fase2.6/
├── informe-fase2.6.md              <- este documento
├── probes/                          <- instrumentación reproducible
│   ├── pty_battery.sh               <- batería PTY por API HTTP
│   ├── ws_bun.js                    <- cliente WebSocket (Bun del APK)
│   ├── ws_client.mjs                <- cliente WebSocket Node (sin deps)
│   ├── ffi_pty_probe.js             <- probe FFI aislado (8 símbolos bun_pty_*)
│   ├── ffi_import_probe.js          <- sondeo del bunfs del APK
│   ├── workers_battery6.js          <- BATERÍA CANÓNICA de workers
│   ├── workers_battery.js .. _5.js  <- versiones parciales (conservadas)
│   ├── workers_battery_worker.js    <- worker auxiliar desde fichero
│   ├── workers_node_oracle.mjs      <- oráculo Node v26 (7 casos)
│   ├── w64_oracle.mjs               <- oráculo de terminate() idempotente
│   ├── sab_test.mjs                 <- oráculo de SharedArrayBuffer
│   └── rmop_test.mjs                <- oráculo de receiveMessageOnPort
├── raw/                             <- entradas brutas (no interpretadas)
│   ├── librust_pty_arm64-2resfh96.so
│   ├── openapi.json, info.json
│   └── http/                        <- evidencias HTTP/WS por prueba
└── results/                         <- resultados de las baterías
    ├── pty_battery_stdout.txt
    ├── ffi_pty_probe.json
    ├── workers_battery6.json + .log  <- resultado canónico
    ├── workers_battery.json .. _5.json
    └── workers_node_oracle.json
```

---

## 6. Conclusiones

1. **PTY está operativo en Android por la ruta FFI.** El APK original crea PTYs reales con
   terminal asignado (`/dev/pts/N`), E/S unificada, señales, códigos de salida, redimensionado
   y cierre limpio. **8/9 pruebas PASS.** La ruta FFI aislada confirma **9/9 PASS** sobre los
   8 símbolos `bun_pty_*`.

2. **La ruta helper/daemon de PTY no es utilizable en Android 10.** El daemon `opencode-pty`
   no arranca (`/dev/pts` modo 600, sin `/dev/shm`) y la API devuelve **HTTP 503**. Los 22
   directorios de daemon del dispositivo contienen solo `service.lock`, prueba de que el
   arranque nunca se completó. **No es reparable sin tocar el motor o el SO.**

3. **`node:worker_threads` es plenamente funcional en el runtime Android del APK.**
   **36 PASS / 0 FAIL / 2 PARTIAL.** Paralelismo real medido (ratio 3.99 con 4 workers y 7.92
   con 8 sobre 8 núcleos), aislamiento de estado demostrado por checksum, `SharedArrayBuffer`
   compartido con `Atomics` verificado por lectura independiente del principal, errores
   propagados con stack, terminación verificada por evento `exit`, y **cero fugas de hilos**
   (`delta:0` tras 6 y tras 16 workers).

4. **Una sola limitación real en workers:** `moveMessagePortToContext` está declarada pero no
   implementada en Bun 1.4.0. Es una API de Node para mover un `MessagePort` entre contextos
   `vm`; **no bloquea** ninguna capacidad usada por el motor.

5. **Regla metodológica aplicada:** todo FAIL se contrastó con Node v26 como oráculo. Cinco
   FAIL iniciales resultaron ser artefactos del probe (carreras de suscripción, `transferList`
   omitido, clonado de un `Symbol`,valor de retorno `undefined` idéntico a Node, `isInternalThread` que
   también es boolean en Node). **Solo se reporta como limitación lo que Bun hace distinto de
   Node.**

6. **Ningún original fue alterado.** `verify_integrity.py` → **INTEGRIDAD OK**: 496 hashes,
   cobertura 493/493, reversibilidad 493/493. El estado del servidor quedó limpio: **0 PTY**
   residuales.

### Recomendación para la Fase 3 (no ejecutada)

El contrato `PlatformProvider` propuesto en la Fase 2 puede dar por **verificadas** las
capacidades `Pty` (con dos backends: `ffi` operativo, `daemon` no disponible en Android) y
`Worker` (con `thread` operativo, sin necesidad de `process` ni de fibers). La única decisión
pendiente es **degradar explícitamente** el backend daemon de PTY en Android, en lugar de
dejarlo fallar con un 503 opaco.

---

**Fase 2.6 completada. Detenido a la espera de autorización para la siguiente fase.**
