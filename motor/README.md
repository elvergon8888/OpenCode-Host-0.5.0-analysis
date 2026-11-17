# CreafMotorCode — Fase 1: reconstrucción del motor OpenCode v1

Reconstruccion navegable, verificable y fiel del motor de OpenCode embebido en
`libopencode.so` (325 MB) de `OpenCode-Host-0.5.0-7-signed.apk`.

> **Fase 2 (extraccion de PlatformProvider) NO iniciada.** Requiere autorizacion.

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
│   └── verify_integrity.py      # PRUEBA de integridad
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
└── integrity/
    ├── baseline.sha256          # SHA-256 de originales + derivados
    ├── baseline_v1_truncated.sha256  # baseline historico (extraccion truncada)
    └── verify_report.json
```

## Resultados

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
```
