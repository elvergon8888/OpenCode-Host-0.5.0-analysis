# 09 — Fase 2.6: validación experimental de PTY y `node:worker_threads`

**Estado:** COMPLETADA — medición sobre el APK original, sin modificar el motor.
**Alcance:** 9 pruebas de PTY · 38 casos de workers · oráculo diferencial Node v26.
**Informe maestro con toda la evidencia:** [`motor/fase2.6/informe-fase2.6.md`](../motor/fase2.6/informe-fase2.6.md)

> Cierra los dos gaps que la Fase 2 dejó como *"Sin ejercitar → verificación pendiente"*:
> PTY (`bun:ffi` / helper `opencode-pty`) y `worker_threads`.

---

## 0. Resumen ejecutivo

| | PTY | `node:worker_threads` |
|---|---|---|
| Casos | 9 | 38 |
| **PASS** | **8** | **36** |
| **FAIL** | **1** | **0** |
| **PARTIAL** | **0** | **2** (misma causa) |
| **NOT TESTED** | **0** | **0** |

**Tres conclusiones:**

1. **PTY funciona en Android por la ruta FFI** (`/api/pty`). PTY real con terminal asignado,
   E/S unificada, señales, códigos de salida y cierre limpio. El probe FFI aislado da **9/9 PASS**.
2. **La ruta helper/daemon de PTY está rota en Android**: el daemon `opencode-pty` no arranca
   (`/dev/pts` con `mode=600`, sin `/dev/shm`) y la API devuelve **HTTP 503**. No reparable
   sin tocar el motor o el SO.
3. **`node:worker_threads` es funcional de extremo a extremo**: paralelismo real medido
   (ratio **3.99** con 4 workers, **7.92** con 8), aislamiento demostrado, `Atomics` sobre
   `SharedArrayBuffer` verificado, sin fugas de hilos. Única limitación real:
   `moveMessagePortToContext` no implementada en Bun.

### Veredicto por capacidad

| Capacidad | Estado |
|---|---|
| PTY vía FFI (`/api/pty`) | **FUNCIONAL** |
| PTY vía helper/daemon (`experimental/persistent-pty`) | **ROTA en Android** |
| `node:worker_threads` | **FUNCIONAL** |
| `moveMessagePortToContext` | **NO IMPLEMENTADA en Bun 1.4.0** |

---

## 1. Método

### Oráculo y entorno

- **Oráculo:** el binario original `/data/app/app.opencodehost-*/lib/arm64/libopencode.so`
  (OpenCode 2.2.5 sobre **Bun 1.4.0**, JavaScriptCore, arm64-android).
- **Servidor vivo:** `http://127.0.0.1:4096` para las pruebas PTY por API.
- **Bun del APK como intérprete:** `BUN_BE_BUN=1 <APK>/lib/arm64/libopencode.so run <script.js>`
  — da acceso al runtime **exacto** del APK para medir `node:worker_threads` y `bun:ffi`.
- **Oráculo diferencial:** Node **v26.13.1** (Termux), usado **solo** para distinguir
  *limitación del runtime* de *artefacto del probe*. No forma parte del APK.

### Regla de clasificación aplicada

> Un FAIL solo se acepta como **limitación del runtime** si el caso equivalente **pasa** en
> Node v26. Si ambos fallan igual, es **equivalencia de comportamiento**.

Cinco FAIL iniciales resultaron ser artefactos del probe (carrera de suscripción,
`transferList` omitido, clonado de un `Symbol`, `undefined` idéntico a Node,
`isInternalThread` que también es boolean en Node). **Solo se reporta como limitación lo que
Bun hace distinto de Node.**

### Endurecimiento de la batería de workers (v6, canónica)

| Requisito | Implementación |
|---|---|
| Handshake explícito | El worker emite `{__f26_ready:true,…}` antes de aceptar comandos; el principal espera ese ready |
| Recepción por ACK | RPC con **id correlativo**; sin ACK → FAIL |
| Ejecución determinista | Comandos con resultado verificable (`sum`, `clone`, `identity`…) |
| Timeouts explícitos | `ready/rpc/exit=10 s`, `cleanup=8 s`; timeout → **FAIL** con `TIMEOUT_<caso>` |
| Errores capturados | El harness reenvía la excepción como `__f26_err` (mensaje, nombre, stack) |
| Terminación verificada | Se espera el evento **`exit`**; no se infiere |
| Limpieza comprobada | `/proc/self/task` antes/después + recuento de hilos `Worker` |
| Aislamiento en concurrencia | Checksum propio por worker + `threadId` distintos |
| Logs y evidencias | JSON **y** log de consola, por caso |
| Clasificación | PASS / FAIL / PARTIAL / NOT TESTED + desglose `porRequisito` |

---

## 2. PTY

### 2.1 Arquitectura: dos rutas, una funcional

```
POST /api/pty  ──►  server.pty.create  ──►  import dinámico  /$bunfs/root/chunk-xq2yeq74.js
                                                        │
                                                        └─► bun:ffi  dlopen("librust_pty")
                                                            ══► FUNCIONAL en Android

POST /api/experimental/session/{sid}/terminal
              ──►  PersistentPty  ──►  daemon helper `opencode-pty` (OPENCODE_PTY_BIN)
                                        ══► ROTO en Android (503)
```

La `.so` FFI no está en disco: está embebida en el binfs de `libopencode.so`
(offset `339368498`, 540368 B, SHA-256 `b497705d…bdb8a8a`, ELF AArch64 `ET_DYN`),
extraída **en lectura** a `motor/fase2.6/raw/librust_pty_arm64-2resfh96.so`.

### 2.2 Resultados

| # | Prueba | Resultado | Evidencia |
|---|---|---|---|
| P1 | Ruta FFI | **PASS** | `POST /api/pty` → **200**, `pid` real; `exitCode:0` |
| P2 | Ruta helper | **FAIL** | **503** `ServiceUnavailableError` — `ENOENT … service.json` |
| P3 | Sesión interactiva | **PASS** | prompt recibido, stdin enviado, marcador devuelto con eco |
| P4 | Ejecutar comandos | **PASS** | comandos encadenados → `exitCode:0` |
| P5 | stdin/stdout/stderr | **PASS** | ambos por el **mismo descriptor** (semántica PTY) |
| P6 | Señales y terminación | **PASS** | `SIGTERM` → trap → `exitCode:42`; `PUT`→200; `DELETE`→204; `GET`→404 |
| P7 | Cierre de sesión | **PASS** | 24 creadas → 24 eliminadas → **0 restantes** |
| P8 | Detección de errores | **PASS** | binario inexistente→**500**; PTY inexistente→**404**; `exit 7`→`exitCode:7` |
| P9 | Terminación inesperada | **PASS** | `SIGKILL` → `exited`, `exitCode:1`, WS cierra **4404 `"session exited"`** |

**Evidencia dura de PTY real** (`/proc` del propio hijo):

```
pid=7476 comm=(sh) ppid=24587 tty_nr=34828 tpgid=7476
0 -> /dev/pts/12    1 -> /dev/pts/12    2 -> /dev/pts/12
```

**Probe FFI aislado: 9/9 PASS** sobre los 8 símbolos `bun_pty_*`
(spawn, get_pid, read, write, resize, get_exit_code, kill, close) —
`motor/fase2.6/results/ffi_pty_probe.json`.

### 2.3 Causa raíz del FAIL (P2)

```
/proc/mounts: devpts /dev/pts devpts rw,seclabel,relatime,mode=600,ptmxmode=000
/dev/shm: no existe

$ libopencode-pty.so daemon --name f26d --runtime-dir <dir escribible>
error: Read-only file system (os error 30)
```

Los **22 directorios** de `~/.local/state/opencode/pty/` del dispositivo contienen solo
`service.lock` vacío (sin `service.json`): **el daemon nunca completó un arranque en Android**.
Requiere privilegios de root para corregirlo → se reporta como **FAIL**.

---

## 3. `node:worker_threads`

Batería canónica v6 (`motor/fase2.6/probes/workers_battery6.js`) ejecutada con
**Bun 1.4.0 del APK**: **36 PASS / 2 PARTIAL / 0 FAIL**.

| Requisito | Casos | PASS | FAIL | PARTIAL | Veredicto |
|---|---|---|---|---|---|
| W1 Crear worker | 4 | 4 | 0 | 0 | **PASS** |
| W2 Ejecutar código | 1 | 1 | 0 | 0 | **PASS** |
| W3 Comunicación | 1 | 1 | 0 | 0 | **PASS** |
| W4 Transferencia | 8 | 7 | 0 | 1 | **PASS** |
| W5 Errores | 4 | 4 | 0 | 0 | **PASS** |
| W6 Terminación | 4 | 4 | 0 | 0 | **PASS** |
| W7 Limpieza | 4 | 4 | 0 | 0 | **PASS** |
| W8 Concurrencia | 4 | 4 | 0 | 0 | **PASS** |
| W9 Limitaciones Android | 9 | 7 | 0 | 2 | **PASS** |

### Cifras clave

| Métrica | Valor |
|---|---|
| Paralelismo 4 workers CPU-bound | `wall 2006 ms` vs `8000 ms` serial → **ratio 3.99** |
| Paralelismo 8 workers CPU-bound | `wall 1516 ms` vs `12000 ms` serial → **ratio 7.92** |
| Aislamiento | checksums `[31000,31001,31002,31003]` = esperados; `threadId` distintos |
| `Atomics` + `SharedArrayBuffer` | valor final leído **por el principal** = **4** (sin incrementos perdidos) |
| Sin fuga de hilos | 15 → 15 tras 6 workers; 17 → 49 → 17 tras 16 workers |
| Coste de arranque | media **65 ms** (5 muestras: 47, 35, 81, 75, 88) |
| `MessagePort` transferido | funciona **en ambos sentidos** con `transferList` |
| `BroadcastChannel` | funciona principal↔worker **y** entre instancias del mismo hilo |
| `SharedArrayBuffer` con `transferList` | detach del emisor idéntico a Node (`byteLength:0`) |
| Errores | no capturada, asíncrona, de sintaxis y capturada → propagadas con stack |
| Terminación | `terminate()`, `process.exit(7)`→7, `exit` natural, `terminate()` idempotente |
| Worker = hilo real | `pid` del worker == `pid` del principal; `bun 1.4.0`; `argv0=…/libopencode.so` |
| Permisos de filesystem | principal `OK` / worker `OK` (mismo UID) — **sin restricción adicional** |
| Procesos hijos desde el worker | `child_process.spawnSync` → `status:0` |
| Cobertura de API | 21 símbolos exportados, **0 divergencias de forma** frente a Node |

### La única limitación real

`moveMessagePortToContext` → **`NotImplementedError` / `ERR_NOT_IMPLEMENTED`**
("not yet implemented in Bun"). Es una API de Node para mover un `MessagePort` entre
contextos `vm`. **No bloquea** `MessageChannel`, `MessagePort` ni `BroadcastChannel`.

### Desambiguación con oráculo Node v26

| Caso | Node v26 | Bun 1.4.0 | Conclusión |
|---|---|---|---|
| MessagePort sin `transferList` | `DataCloneError` 25 | `DataCloneError` 25 | Equivalentes |
| BroadcastChannel principal↔worker | PASS | PASS | Equivalentes |
| BroadcastChannel mismo hilo | PASS | PASS | Equivalentes |
| `env: SHARE_ENV` | PASS | PASS | Equivalentes |
| `terminate()` idempotente | `undefined` | `undefined` | Equivalentes |
| `isInternalThread` | `boolean` | `boolean` | Equivalentes |
| `moveMessagePortToContext` | error distinto | `NotImplementedError` | **Bun no la implementa** |

---

## 4. Limitaciones y dependencias

### Limitaciones del runtime (confirmadas)

| # | Limitación | Alcance |
|---|---|---|
| L1 | `moveMessagePortToContext` no implementada (`NotImplementedError`) | Solo esa API |
| L2 | Ruta helper/daemon de PTY no arranca en Android | Toda `experimental/persistent-pty` |
| L3 | `resourceLimits` se acepta pero su aplicación real no es verificable | V8-only; Bun usa JavaScriptCore |
| L4 | `stackSizeMb` se acepta sin error, sin efecto verificable | Igual que L3 |

### Dependencias del entorno

| Dependencia | Estado | Impacto |
|---|---|---|
| `/dev/pts` con `mode=600` (solo root) | Estructural de Android 10 | Impide el daemon helper (L2) |
| `/dev/shm` inexistente | Estructural de Android 10 | Impide el daemon helper (L2) |
| `/proc` con `hidepid=2` | Kernel | Termux no ve los PIDs del servidor; las señales se enviaron desde el sandbox de la app (mismo UID) |
| `LD_LIBRARY_PATH` a `/data/app/app.opencodehost-*/lib/arm64` | **Requerido** para ejecutar el binario del APK desde Termux | Sin él: `libopencode-crhandler.so` no encontrado |
| Auth Basic `opencode:<password>` | Requerida | Bearer → 401 |
| Ticket `x-opencode-ticket: 1` | Requerido para WS y `connect-token` | Sin él → 403 |

### NOT TESTED

| Prueba | Motivo |
|---|---|
| Turnos de LLM (`session.prompt`) | Sin modelo/API key de proveedor configurado |
| Compilación de ripgrep (`arm64-android`) | Fuera del alcance autorizado |
| Instrumentación del PlatformProvider | Fuera del alcance autorizado |
| Daemon helper en otro SO | Requiere `/dev/shm` y `/dev/pts` utilizable |
| `resourceLimits` con aplicación real | Opción de V8; Bun usa JavaScriptCore |

---

## 5. Reproducibilidad

```bash
L=/data/app/app.opencodehost-*/lib/arm64

# Workers (runtime exacto del APK)
F26_OUT=motor/fase2.6/results/workers_battery6.json \
F26_LOG=motor/fase2.6/results/workers_battery6.log \
LD_LIBRARY_PATH=$L BUN_BE_BUN=1 $L/libopencode.so run motor/fase2.6/probes/workers_battery6.js

# PTY (API HTTP del servidor vivo)
OPENCODE_PASSWORD='…' bash motor/fase2.6/probes/pty_battery.sh

# Probe FFI aislado
F26_FFI_OUT=motor/fase2.6/results/ffi_pty_probe.json \
LD_LIBRARY_PATH=$L BUN_BE_BUN=1 $L/libopencode.so run motor/fase2.6/probes/ffi_pty_probe.js \
  motor/fase2.6/raw/librust_pty_arm64-2resfh96.so

# Oráculo diferencial
node motor/fase2.6/probes/workers_node_oracle.mjs

# Integridad (DEBE terminar con "INTEGRIDAD OK")
python3 motor/tools/verify_integrity.py
```

**Artefactos:** `motor/fase2.6/probes/` (instrumentación), `motor/fase2.6/raw/` (entradas
brutas, incluida la `.so` extraída en lectura), `motor/fase2.6/results/` (resultados).
Los hashes SHA-256 de cada artefacto están en el informe maestro (§5.3).

---

## 6. Integridad

```
[1] hashes verificados: 496        -> OK - ningun original alterado
[2] cobertura: 493/493 modulos     -> OK - cobertura 100%
[3] reversibilidad: 493/493        -> OK - toda copia es reversible al original

RESULTADO: INTEGRIDAD OK
```

Los 493 chunks, el APK y las `.so` originales conservan sus hashes. Ningún original fue
modificado. El estado del servidor quedó limpio: **0 PTY residuales**.

---

## 7. Conclusiones

1. **PTY operativo en Android por la ruta FFI** — PTY real (`/dev/pts/N`), E/S unificada,
   señales, códigos de salida, redimensionado y cierre limpio. **8/9 PASS** por API y
   **9/9 PASS** en el probe FFI aislado.
2. **Ruta helper de PTY no utilizable en Android 10** — daemon `opencode-pty` no arranca;
   la API responde **503**. No reparable sin tocar el motor o el SO.
3. **`node:worker_threads` plenamente funcional** — **36 PASS / 0 FAIL / 2 PARTIAL**,
   con paralelismo real medido, aislamiento demostrado, `Atomics` verificado y cero fugas.
4. **Una sola limitación real en workers:** `moveMessagePortToContext` no implementada en Bun.
5. **Ningún original alterado** — `INTEGRIDAD OK` (496 hashes, 493/493, 493/493).

**Impacto en la Fase 3 (no ejecutada):** el contrato `PlatformProvider` puede declarar
`Pty` como capacidad **verificada** con dos backends (`ffi` operativo, `daemon` no
disponible en Android) y `Worker` con backend **`thread`** operativo — sin necesidad de
`process` ni de fibers. Queda por decidir la degradación explícita del backend daemon
de PTY en Android, en lugar de un 503 opaco.

---

**Fase 2.6 completada. Detenido a la espera de autorización para la siguiente fase.**
