# CreafMotorCode — motor OpenCode reconstruido + diseño de la plataforma

Reconstruccion navegable, verificable y fiel del motor de OpenCode embebido en
`libopencode.so` (325 MB) de `OpenCode-Host-0.5.0-7-signed.apk`.

- **Fase 1** — extraccion, grafo, simbolos, arbol navegable. COMPLETADA.
- **Fase 2 (opcion a)** — auditoria de las 34 APIs de plataforma + diseño del contrato
  `PlatformProvider`. COMPLETADA (diseño y documentacion; **sin modificar el motor**).
- **Fase 2.6** — validacion EXPERIMENTAL de las capacidades no medidas: PTY y
  `node:worker_threads`. COMPLETADA (sobre el APK original; **sin modificar el motor**).

> **Fase 3 NO iniciada.** Requiere autorizacion expresa.
>
> **Correccion de version:** el motor real es **OpenCode 2.2.5** (medido en `opencode.log`:
> `version=2.2.5 channel=latest`), no v1. El rotulo "v1" de la entrega de Fase 1 era erroneo
> y queda corregido aqui.
>
> **Correccion de runtime:** `libopencode.so` es **Bun compilado para Android** (JavaScriptCore),
> **no** node-mobile. Evidencia: `builtin://bun/ffi`, `builtin://bun/sqlite`,
> `builtin://internal/sql/sqlite`, `builtin://node/worker_threads`, `"node-v26.3.0"`,
> plataformas de Bun `linux macos windows wsl android arm`.
> Los simbolos `node::Handle` / `node::MakeCallback` / `node_api_module` que originaron la
> conclusion contraria son la **capa Node-API de Bun** (para cargar `libopencode-pty.so`).

## Estructura

```
motor/
├── tools/                       # scripts de extraccion y verificacion
│   ├── reextract_chunks.py      # extraccion precisa de chunks Bun
│   ├── extract_graph.py         # grafo de imports/exports
│   ├── analyze_graph.py         # ciclos, criticidad, simbolos compartidos
│   ├── recover_symbols.py       # recuperacion de nombres legibles
│   ├── build_tree.py            # manifest de modulos + inventario de plataforma
│   ├── classify_strict.py       # clasificacion por evidencia directa
│   ├── emit_tree_fast.py        # emision del arbol (copias)
│   ├── emit_graph_views.py      # DOT, Mermaid, trazabilidad
│   ├── inventories.py           # inventarios finales
│   ├── verify_integrity.py      # PRUEBA de integridad
│   ├── audit_platform.py        # F2.1 escaner lexico con tokenizador de estados
│   ├── emit_platform_audit.py   # F2.1 genera audit-2.1.md desde api-audit.json
│   └── validate_platform_design.py  # F2.5 validacion arquitectonica
│   ├── typecheck_platform.sh     # F2.6 type-check del contrato (tsc --noEmit, strict)
├── graph/
│   ├── edges.json               # 10.318 aristas con posicion de origen
│   ├── analysis.json            # SCCs, ciclos, criticidad, compartidos
│   ├── graph.dot                # grafo completo (Graphviz)
│   ├── graph_top.mmd            # top 45 por criticidad (Mermaid)
│   ├── traceability.csv/md      # chunk -> modulo (493 filas)
│   └── meta.json
├── symbols/
│   ├── symbols.json             # 5.612 simbolos + 12.778 imports resueltos
│   └── renames.json             # 6.015 renombrados aplicados (chunk+pos+evidencia)
├── modules/
│   ├── manifest.json            # manifest de 493 modulos
│   ├── tree_manifest.json       # ruta del arbol por chunk
│   ├── platform_inventory.json
│   └── tree/<categoria>/         # 493 copias navegables
├── inventory/
│   ├── functionality.md
│   ├── platform_dependencies.md
│   ├── symbols_recovered.md
│   └── not_reconstructed.md
├── fase2.6/                    # FASE 2.6 — validacion experimental PTY + workers
│   ├── informe-fase2.6.md      # informe maestro (metodo, evidencia, limitaciones)
│   ├── probes/                 # instrumentacion reproducible (baterias + oraculos)
│   ├── raw/                    # entradas brutas: .so extraida en lectura, HTTP/WS
│   └── results/                # resultados de las baterías (JSON + logs)
├── platform/                   # FASE 2 (opcion a) — diseño del PlatformProvider
│   ├── Platform.ts              # contrato agregado (9 providers + capacidades)
│   ├── tsconfig.json            # config del type-check (strict, noEmit)
│   ├── contracts/              # 10 contratos TypeScript completos
│   │   ├── filesystem.ts  database.ts  process.ts  pty.ts  worker.ts
│   │   └── environment.ts network.ts  credential.ts  runtime.ts  index.ts
│   ├── api-audit.json           # 565 contactos + metricas por API (maquina)
│   ├── audit-2.1.md             # F2.1 auditoria completa (chunk/simbolo/posicion)
│   ├── android-compat-2.3.md    # F2.3 compatibilidad Android (6 temas exigidos)
│   ├── compatibility-matrix.md  # F2.4 API -> interfaz -> implementacion Android
│   ├── risks.md                 # F2.4 riesgos R1-R12 con mitigacion y prueba
│   ├── migration-strategy.md    # F2.4 4 capas de instrumentacion + pasos M0-M10
│   ├── equivalence-tests.md     # F2.4 9 suites, 60+ pruebas diferenciales
│   ├── reach-analysis.json      # alcance inverso transitivo por API
│   ├── validation-2.5.md        # F2.5 validacion arquitectonica (V1-V5)
│   └── validation-2.5.json      # F2.5 resultados en maquina
└── integrity/
    ├── baseline.sha256          # SHA-256 de originales + derivados
    ├── baseline_v1_truncated.sha256  # baseline historico (extraccion truncada)
    └── verify_report.json
```

## Resultados — Fase 1

| Metrica | Valor |
|---|---|
| Chunks originales | **493** (490 con marcador `// @bun @bytecode` + 3 huerfanos) |
| Codigo extraido | **363.97 MB** |
| Aristas del grafo | **10.318** (9.569 internas, 749 externas) |
| Imports sin resolver | **0** |
| SCCs / ciclos | 493 / 77 |
| Simbolos con nombre real | **5.612** |
| Imports resueltos a nombre real | **12.044** de 12.778 |
| Renombrados aplicados | **6.015** (patron `<real>__<local>`, invertible) |
| Modulos con categoria (evidencia directa) | **64** de 493 |
| Modulos sin evidencia | **429** (registrados, NO inventados) |

## Resultados — Fase 2 (opcion a)

| Metrica | Valor |
|---|---|
| APIs de plataforma auditadas | **34 / 34** con contacto verificado |
| Puntos de contacto reales | **565** (tokenizador lexico, 114 modulos) |
| Interfaces propuestas | **9** (Filesystem, Database, Process, Pty, Worker, Environment, Network, Credential, Runtime) |
| Contrato TypeScript | **1.119 lineas** (`motor/platform/`) |
| Type-check del contrato | **0 errores** (`tsc --noEmit`, strict) en los 11 ficheros TS |
| Contactos mapeados a una interfaz | **565 / 565 (100 %)** |
| Dependientes del nucleo `chunk-n21h4aaz.js` cubiertos | **411 / 411** (92 frontera + 319 indirectos) |
| Modulos que NO requieren cambio | **379 / 493 (76,9 %)** |
| Dependencias no sustituibles directamente | **7** (documentadas, con ruta real) |
| Gaps medidos abiertos en Android | **2 criticos** (ripgrep `arm64-android`; watcher recursivo) |

## Resultados — Fase 2.6 (validacion experimental PTY + workers)

| Metrica | Valor |
|---|---|
| Pruebas PTY | **8 PASS / 1 FAIL / 0 PARTIAL** (9 casos) |
| Probe FFI aislado (`bun_pty_*`) | **9 / 9 PASS** |
| Casos `node:worker_threads` | **36 PASS / 0 FAIL / 2 PARTIAL** (38 casos) |
| Paralelismo real medido | ratio **3.99** (4 workers) y **7.92** (8 workers) |
| Fugas de hilos | **0** (delta 0 tras 6 y tras 16 workers) |
| Limitaciones del runtime confirmadas | **2** (`moveMessagePortToContext` no implementada; daemon helper de PTY roto en Android) |
| Oraculo diferencial | Node v26.13.1 (para separar limitacion de artefacto de probe) |

**Veredicto:** PTY **FUNCIONAL** por la ruta FFI (`/api/pty`); la ruta helper/daemon
(`experimental/persistent-pty`) esta **ROTA en Android** (HTTP 503: `/dev/pts` con `mode=600`
y sin `/dev/shm`). `node:worker_threads` **FUNCIONAL** de extremo a extremo.

Informe maestro: `motor/fase2.6/informe-fase2.6.md` · Entrega: `docs/09-fase2.6-pty-workers.md`

## Integridad

```
[1] hashes verificados: 496        -> OK - ningun original alterado
[2] cobertura: 493/493 modulos     -> OK - cobertura 100%
[3] reversibilidad: 493/493        -> OK - toda copia es reversible al original
```

El `.so` fuente (`af51da7e...`) y el APK (`c63685e1...`) conservan los hashes
del inicio de la fase. Los chunks en `bundle/chunks/` son DERIVADOS; el arbol en
`motor/modules/tree/` son COPIAS. Ningun original fue modificado.

## Metodo de recuperacion de nombres

Solo con evidencia en el binario:

1. `export{LOCAL as NAME}` — el simbolo local es NAME en el modulo original
2. `export{NAME}` — el simbolo local es NAME
3. definicion textual `const/let/var/function/class NAME`

Sin evidencia, el simbolo conserva su forma minificada. **No se infieren nombres.**

## Reproducir

```bash
python3 motor/tools/reextract_chunks.py    # desde unpacked/lib/arm64-v8a/libopencode.so
python3 motor/tools/extract_graph.py
python3 motor/tools/analyze_graph.py
python3 motor/tools/recover_symbols.py
python3 motor/tools/build_tree.py
python3 motor/tools/classify_strict.py
python3 motor/tools/emit_tree_fast.py
python3 motor/tools/emit_graph_views.py
python3 motor/tools/inventories.py
python3 motor/tools/verify_integrity.py    # DEBE terminar con "INTEGRIDAD OK"

# Fase 2 (opcion a)
python3 motor/tools/audit_platform.py           # 565 contactos -> motor/platform/api-audit.json
python3 motor/tools/emit_platform_audit.py      # -> motor/platform/audit-2.1.md
python3 motor/tools/validate_platform_design.py # -> motor/platform/validation-2.5.md + .json
bash    motor/tools/typecheck_platform.sh       # tsc --noEmit sobre el contrato

# Fase 2.6 (validacion experimental; requiere el APK instalado y el servidor vivo)
L=/data/app/app.opencodehost-*/lib/arm64
F26_OUT=motor/fase2.6/results/workers_battery6.json \
F26_LOG=motor/fase2.6/results/workers_battery6.log \
LD_LIBRARY_PATH=$L BUN_BE_BUN=1 $L/libopencode.so run motor/fase2.6/probes/workers_battery6.js
OPENCODE_PASSWORD='...' bash motor/fase2.6/probes/pty_battery.sh
node motor/fase2.6/probes/workers_node_oracle.mjs   # oraculo diferencial Node v26
```

---

## Fase 2 (opcion a) — resumen

Auditoria de las 34 APIs de plataforma con **evidencia real** (tokenizador de estados que
descarta comentarios, strings y templates; los contactos se cruzan contra
`motor/graph/edges.json`), diseño de un contrato `Platform` de 9 interfaces con
**capacidades declaradas** (el motor pregunta, no deduce del nombre del sistema), y
validacion arquitectonica mecanica.

**Regla que gobierna el diseno:**

> OpenCode conserva sus capacidades originales. Android se adapta al motor,
> no el motor degradarse para adaptarse a Android.

**Puntos clave:**

- `bun:sqlite`, `bun:ffi`, `Bun.file`, `Bun.spawn` **ya funcionan** en el APK vivo (Bun para
  Android). 59 migraciones de BD aplicadas; `opencode.db` + WAL + SHM presentes; spawn de
  `git` operativo; MCP conectado con 31 herramientas.
- El motor **ya define seams** (`SqliteNative`, `Global`, `Image.Photon`): el contrato se
  enchufa en ellos, no los crea.
- `WorkerProvider` **prohibe** usar fibers de Effect como workers: sin paralelismo real,
  sin `postMessage`/`terminate`, sin aislamiento de contexto. Backends: `none | thread | process`.
- La instrumentacion propuesta **no edita ningun chunk**: capa 1 (`globalThis.Bun` extendido),
  capa 2 (plugin de *resolucion* de Bun), capa 3 (seams existentes), capa 4 (addons N-API,
  solo para un host sin Bun).

Informe maestro: `docs/08-fase2-plataforma.md`.

**Fase 2.6 completada:** los gaps no medidos (PTY, `worker_threads`) ya estan verificados.
Ver `docs/09-fase2.6-pty-workers.md`.

**Detenido.** La Fase 3 requiere autorizacion expresa.
Orden recomendado: **(a) cerrar el gap de `ripgrep`** (`arm64-android`) ->
**(b) instrumentar el contrato**.
