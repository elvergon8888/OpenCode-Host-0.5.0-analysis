# 07 — Fase 1 completada: informe de reconstruccion del motor

**Objetivo:** reconstruir una representacion navegable, verificable y fiel del motor
original de OpenCode embebido en `libopencode.so`.

**Estado:** COMPLETADA. Trazabilidad 493/493 chunks.

## 1. Que se reconstruyo

### 1.1 Extraccion del codigo fuente

El motor esta empaquetado por Bun. Formato verificado empiricamente:

```
// @bun @bytecode
<contenido del chunk>              <- puede incluir BYTES BINARIOS (.so, .wasm)
\x00/$bunfs/root/NAME.js\x00       <- footer: ruta propia del chunk
```

El primer intento trunco los chunks en el primer byte no imprimible (25 MB, assets
binarios incompletos). La correccion usa el footer de Bun como delimitador exacto
-> **363.97 MB** recovered, assets binarios intactos.

| Metrica | Valor |
|---|---|
| Chunks con marcador `// @bun @bytecode` | 490 |
| Chunks huerfanos (referenciados, sin marcador propio) | 3 |
| **Total chunks** | **493** |
| Codigo extraido | **363.97 MB** |
| Assets binarios embebidos preservados | `libopentui-h6s9f175.so`, `librust_pty_arm64-*.so`, `parser.worker-*.js` |

### 1.2 Grafo de dependencias

| Metrica | Valor |
|---|---|
| Aristas totales | **10.318** |
| Aristas internas (chunk -> chunk) | 9.569 |
| Aristas externas (node:/bun:/npm) | 749 |
| **Imports sin resolver** | **0** |
| SCCs (componentes fuertemente conexas) | 493 |
| Ciclos detectados | 77 |

**Los 3 chunks huerfanos** (`chunk-qcpntc9z.js`, `chunk-ppj3qqtd.js`,
`chunk-k7raz5np.js`) son modulos sin exports, importados como side-effect
(`import"..."`). Se localizaron por su entrada en la tabla VFS del `.so`.

**Estructura del grafo:** casi-DAG. 77 ciclos, todos en el nucleo compartido.
Esto hace viable la reconstruccion en capas (topological order en
`motor/graph/analysis.json`).

### 1.3 Recuperacion de simbolos

| Metrica | Valor |
|---|---|
| Simbolos con nombre real | **5.612** |
| Imports resueltos a nombre real | **12.044** de 12.778 |
| Imports no resueltos | 734 (modulos externos no extraidos) |
| Simbolos compartidos (mismo nombre en >1 chunk) | 67 |
| Renombrados aplicados en el arbol | **6.015** |
| Renombrados omitidos | 0 |

**Metodo** (solo con evidencia, sin inferencia):
1. `export{LOCAL as NAME}` — confianza alta
2. `export{NAME}` — confianza alta
3. definicion textual `const/let/var/function/class NAME` — confianza media

**Renombrado invertible:** patron `<real>__<local>`. Evita colisiones (el nombre
destino suele existir ya en el chunk, p.ej. `Jba`) y permite reconstruir el original
byte a byte. Cada renombrado queda registrado con chunk, posicion y evidencia en
`motor/symbols/renames.json`.

### 1.4 Arbol de modulos

493 modulos reconstruidos en `motor/modules/tree/<categoria>/`.

Clasificacion **por evidencia directa** (exports/definiciones/imports con nombre
legible), no por patrones de contenido:

| Categoria | Modulos |
|---|---:|
| `provider-layer` | 33 |
| `auth` | 17 |
| `event` | 5 |
| `session` | 2 |
| `pty` | 2 |
| `agent` | 1 |
| `git` | 1 |
| `mcp` | 1 |
| `server` | 1 |
| `command` | 1 |
| `unclassified` | 429 |

**Los 429 `unclassified` no son un fallo del metodo:** sus exports y definiciones
estan minificados y no importan simbolos con nombre legible. Inventariar el motivo
por modulo en `motor/inventory/not_reconstructed.md`. **No se invento ninguna
categoria.**

> Nota: un clasificador por patrones de contenido (no por evidencia) asignaba
> 321/493 y producia 106 "file" + 80 "pty" — coincidencias de subcadena, no
> funcion real. Se descarto por ser inferencia.

### 1.5 Trazabilidad

`motor/graph/traceability.csv` y `.md`: **493 filas**, una por chunk, con:

```
chunk | vfs_path | offset .so | bytes | exports | renombrados | categoria | ruta_arbol
```

Criterio de finalizacion de la Fase 1: **493/493 chunks con modulo reconstruido**.

## 2. Inventario de dependencias de plataforma

34 APIs detectadas. Las que requieren rearmado para Android:

| API | Modulos | Estado en Android | Riesgo |
|---|---:|---|---|
| `bun:sqlite` | 2 | NO existe en node-mobile. Sesiones, credenciales, mensajes. | **alto** |
| `bun:ffi` | 3 | NO existe. Carga dinamica de `librust_pty`. | **alto** |
| `node:worker_threads` | 1 | NO soportado. El motor es Effect-based: usar fibers. | **alto** |
| `node:child_process` | 20 | Parcial. Preferir PTY. | medio |
| `Bun.file` | 9 | API Bun. Polyfill sobre `node:fs`. | medio |
| `node:readline` | 4 | Parcial | medio |
| `node:tty` | 3 | Parcial. Base del PTY. | medio |
| `node:perf_hooks` | 2 | No soportado | medio |
| `node:async_hooks` | 3 | Parcial | medio |
| `node:fs` | 68 | Soportado. Mapear paths sandbox. | bajo |
| `node:os` | 70 | Soportado | bajo |
| `node:path` | 204 | Soportado | bajo |
| resto (`crypto`, `url`, `util`, `stream`, `events`, `process`, `buffer`, `module`, `net`, `http`, `https`, `zlib`, `assert`, `timers`) | — | Soportado | bajo |

Detalle completo: `motor/inventory/platform_dependencies.md`.

## 3. Modulos criticos

| Chunk | Tamano | Exports | Dependientes | Rol |
|---|---:|---:|---:|---|
| `chunk-n21h4aaz.js` | — | 1.209 | **411** | Nucleo compartido. Punto de mayor fan-in. |
| `chunk-sm7shkgk.js` | — | 184 | 289 | Nucleo |
| `chunk-4gr6ykz6.js` | — | 460 | 284 | Nucleo |
| `chunk-sjfn3wze.js` | — | 460 | 283 | Nucleo |
| `chunk-7gtsct90.js` | 43.94 MB | 60 | — | Mayor chunk (node_modules) |
| `chunk-j3cfc320.js` | 32.64 MB | 2 | — | **Entry point** (`ServerProcess`, `start`) |
| `chunk-thb6qhb7.js` | 25.31 MB | 143 | — | Effect runtime |
| `chunk-5mbc8t5c.js` | 19.12 MB | 38 | — | Tools, hooks, `BUILTIN_TOOL_NAMES` |
| `chunk-sjfn3wze.js` | 12.77 MB | 460 | 283 | Tipos/schema |
| `chunk-4z9vkptb.js` | 10.13 MB | 52 | — | Model registry |

**`chunk-n21h4aaz.js` (411 dependientes) es el modulo mas critico** del motor: casi
todo el grafo cuelga de el. Cualquier modification debe empezar por ahi.

## 4. Elementos no reconstruidos

| Elemento | Cantidad | Registro |
|---|---:|---|
| Modulos sin clasificacion directa | 429 | `motor/inventory/not_reconstructed.md` (chunk + offset + motivo) |
| Imports no resueltos | 734 | idem (modulos externos no extraidos) |
| Simbolos compartidos | 67 | idem |
| Clasificador por contenido descartado | — | no usado en el entregable |

Los 429 modulos conservan su **codigo integro y su posicion de origen**. No se
modifico, simplifico ni reescribio ninguna funcionalidad.

## 5. Pruebas de integridad

`motor/tools/verify_integrity.py` — 3 comprobaciones:

```
[1] hashes verificados: 496        -> OK - ningun original alterado
[2] cobertura: 493/493 modulos     -> OK - cobertura 100%
[3] reversibilidad: 493/493        -> OK - toda copia es reversible al original
RESULTADO: INTEGRIDAD OK
```

- **Originales intactos:** `.so` `af51da7e...` y APK `c63685e1...` conservan los
  hashes del inicio de la fase.
- **Derivados** (`bundle/chunks/`) con baseline v2; el baseline v1 (extraccion
  truncada) se conserva como `baseline_v1_truncated.sha256` por trazabilidad.
- **Copias** (`motor/modules/tree/`) verificadas byte a byte tras invertir el
  renombrado.

## 6. Correcciones durante la fase

| # | Problema detectado | Correccion |
|---|---|---|
| 1 | Extraccion truncaba assets binarios (25 MB vs 364 MB) | Delimitacion por footer Bun |
| 2 | 3 chunks huerfanos no extraidos | Localizacion por tabla VFS del `.so` |
| 3 | Parser de imports marcaba `*as X` como invalido | Formato namespace reconocido |
| 4 | Resolucion de paths rota tras cambiar el esquema | Normalizacion a nombre base |
| 5 | Renombrado con colisiones (`Jba` ya existia) | Patron invertible `<real>__<local>` |
| 6 | 2 modulos perdidos por colision de nombre de archivo | Sufijo de offset en el nombre |
| 7 | Verificador de reversibilidad ambiguo | Usa el log exacto de renombrados |

## 7. Estado y siguiente paso

**Fase 1: COMPLETADA.**

Fase 2 (extraccion de PlatformProvider) **NO iniciada**, pendiente de autorizacion.

Puntos de entrada para la Fase 2:
- `motor/modules/tree/` — codigo navegable por leer
- `motor/modules/platform_inventory.json` — los 34 puntos de contacto con la plataforma
- `motor/graph/analysis.json` — `topological_order` para rearmar en capas
