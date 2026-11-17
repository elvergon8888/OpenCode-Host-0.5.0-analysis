#!/usr/bin/env python3
"""
Fase 1 - inventarios: funcionalidades, plataforma, simbolos, no-reconstruido.
"""
import json, os, re, sys
from collections import defaultdict, Counter

ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CHUNKS=os.path.join(ROOT,"bundle","chunks")
G=os.path.join(ROOT,"motor","graph"); S=os.path.join(ROOT,"motor","symbols")
M=os.path.join(ROOT,"motor","modules"); I=os.path.join(ROOT,"motor","inventory")

PLATFORM_DOC={
 "bun:sqlite":("SQLite embebido de Bun","Motor: sesiones, credenciales, mensajes. NO existe en node-mobile. Requiere N-API bionic.","bajo"),
 "bun:ffi":("FFI de Bun","Motor: carga dinamica de librerias nativas (librust_pty). NO existe en node-mobile.","bajo"),
 "Bun.file":("API de archivo de Bun","Adjuntos, pty embebido, fileURLToPath. Polyfill sobre node:fs.","medio"),
 "Bun.write":("Escritura via Bun","Escribe archivos. Polyfill sobre node:fs/promises.","medio"),
 "Bun.spawn":("Spawn de Bun","Lanzamiento de procesos. Sustituir por libopencode-pty.so.","bajo"),
 "Bun.serve":("Servidor HTTP de Bun","Servidor HTTP. El motor ya usa node:http/http2.","bajo"),
 "node:child_process":("Processos hijo de Node","Funciona parcialmente en node-mobile. Preferir PTY.","medio"),
 "node:worker_threads":("Workers de Node","NO soportado en Android. El motor es Effect-based: usar fibers.","alto"),
 "node:fs":("Filesystem de Node","Soportado. Requiere mapear paths sandbox Android.","bajo"),
 "node:net":("Red de Node","Soportado. Servidor local 127.0.0.1 funciona.","bajo"),
 "node:http":("HTTP de Node","Soportado.","bajo"),
 "node:https":("HTTPS de Node","Soportado.","bajo"),
 "node:crypto":("Crypto de Node","Soportado.","bajo"),
 "node:os":("OS de Node","Soportado. report() da datos Android.","bajo"),
 "node:readline":("Readline de Node","Soportado parcialmente.","medio"),
 "node:tty":("TTY de Node","Soportado. Base del PTY.","medio"),
 "node:zlib":("Zlib de Node","Soportado.","bajo"),
 "node:module":("Module de Node","Soportado.","bajo"),
 "node:path":("Path de Node","Soportado.","bajo"),
 "node:url":("URL de Node","Soportado.","bajo"),
 "node:util":("Util de Node","Soportado.","bajo"),
 "node:stream":("Streams de Node","Soportado.","bajo"),
 "node:events":("Events de Node","Soportado.","bajo"),
 "node:process":("Process de Node","Soportado. env vars de Android.","bajo"),
 "node:buffer":("Buffer de Node","Soportado.","bajo"),
 "node:async_hooks":("Async hooks de Node","Soportado parcialmente.","medio"),
 "node:inspector":("Inspector de Node","No aplica en release.","bajo"),
 "node:perf_hooks":("Perf hooks de Node","No soportado en Android.","medio"),
 "node:assert":("Assert de Node","Soportado.","bajo"),
 "node:timers":("Timers de Node","Soportado.","bajo"),
}

def main():
    os.makedirs(I,exist_ok=True)
    g=json.load(open(os.path.join(G,"edges.json")))
    ana=json.load(open(os.path.join(G,"analysis.json")))
    syms=json.load(open(os.path.join(S,"symbols.json")))
    ren=json.load(open(os.path.join(S,"renames.json")))
    man=json.load(open(os.path.join(M,"manifest.json")))

    # ---------- 1. INVENTARIO DE PLATAFORMA ----------
    plat=defaultdict(list)
    for fn,info in man["modules"].items():
        for api in info["platform_apis"]:
            plat[api].append({"chunk":fn,"vfs":info["vfs_path"],"category":info["category"]})
    with open(os.path.join(I,"platform_dependencies.md"),"w") as f:
        f.write("# Inventario de dependencias de plataforma\n\n")
        f.write(f"Total de APIs de plataforma detectadas: **{len(plat)}**\n\n")
        f.write("| API | Modulos | Que es | Estado en Android | Riesgo |\n")
        f.write("|---|---:|---|---|---|\n")
        for api in sorted(plat, key=lambda a:-len(plat[a])):
            desc,note,risk=PLATFORM_DOC.get(api,(api,"","bajo"))
            f.write(f"| `{api}` | {len(plat[api])} | {desc} | {note} | {risk} |\n")
        f.write("\n## Modulos por API\n\n")
        for api in sorted(plat, key=lambda a:-len(plat[a])):
            f.write(f"### `{api}` ({len(plat[api])} modulos)\n\n")
            for m in plat[api][:40]:
                f.write(f"- `{m['vfs']}` (chunk `{m['chunk']}`, cat `{m['category']}`)\n")
            if len(plat[api])>40: f.write(f"- ... y {len(plat[api])-40} mas\n")
            f.write("\n")
    json.dump({k:v for k,v in plat.items()},open(os.path.join(I,"platform_dependencies.json"),"w"),indent=1)

    # ---------- 2. INVENTARIO DE FUNCIONALIDADES ----------
    # extraido de la evidencia: exports con nombre real por categoria
    func=defaultdict(lambda: {"modules":[],"symbols":Counter()})
    for fn,info in man["modules"].items():
        cat=info["category"] or "unclassified"
        for e in info["exports"]:
            func[cat]["modules"].append(fn)
            func[cat]["symbols"][e["name"]]+=1
    with open(os.path.join(I,"functionality.md"),"w") as f:
        f.write("# Inventario de funcionalidades\n\n")
        f.write("Clasificacion por EVIDENCIA DIRECTA (exports/definiciones con nombre legible).\n")
        f.write("Los modulos sin evidencia directa quedan como `unclassified` con el motivo registrado.\n\n")
        for cat in sorted(func, key=lambda c:-len(func[c]["modules"])):
            d=func[cat]
            f.write(f"## {cat} ({len(d['modules'])} modulos)\n\n")
            top=[s for s,_ in d["symbols"].most_common(40)]
            if top:
                f.write("**Simbolos recuperados:** "+", ".join(f"`{s}`" for s in top)+"\n\n")
            f.write("**Modulos:**\n\n")
            for fn in sorted(d["modules"])[:80]:
                f.write(f"- `{man['modules'][fn]['vfs_path']}` — {man['modules'][fn]['export_count']} exports\n")
            if len(d["modules"])>80: f.write(f"- ... y {len(d['modules'])-80} mas\n")
            f.write("\n")

    # ---------- 3. SIMBOLOS RECUPERADOS ----------
    with open(os.path.join(I,"symbols_recovered.md"),"w") as f:
        f.write("# Registro de simbolos recuperados\n\n")
        f.write(f"- Simbolos con nombre real: **{len(syms['recovered'])}**\n")
        f.write(f"- Imports resueltos a nombre real: **{len(syms['resolved_imports'])-len(syms['unresolved_imports'])}** de {len(syms['resolved_imports'])}\n")
        f.write(f"- Imports sin resolver (modulo externo no extraido): **{len(syms['unresolved_imports'])}**\n")
        f.write(f"- Renombrados aplicados en el arbol: **{len(ren['applied'])}**\n")
        f.write(f"- Renombrados omitidos: **{len(ren['skipped'])}**\n\n")
        f.write("## Metodo de recuperacion\n\n")
        f.write("1. `export{LOCAL as NAME}` — el simbolo local es NAME en el modulo original (confianza alta)\n")
        f.write("2. `export{NAME}` — el simbolo local es NAME (confianza alta)\n")
        f.write("3. definicion textual `const/let/var/function/class NAME` (confianza media)\n\n")
        f.write("**No se infieren nombres.** Sin evidencia, el simbolo conserva su forma minificada.\n\n")
        f.write("## Simbolos por nombre (top 250)\n\n")
        f.write("| Nombre | Chunks | Evidencia |\n|---|---:|---|\n")
        for name,v in sorted(syms["recovered"].items(), key=lambda kv:-len(kv[1]["chunks"]))[:250]:
            f.write(f"| `{name}` | {len(v['chunks'])} | {v['evidence']} |\n")

    # ---------- 4. NO RECONSTRUIDO ----------
    unclass=[fn for fn,i in man["modules"].items() if (i["category"] or "unclassified")=="unclassified"]
    with open(os.path.join(I,"not_reconstructed.md"),"w") as f:
        f.write("# Elementos no reconstruidos / reconstruccion incierta\n\n")
        f.write("## Modulos sin clasificacion directa: "+str(len(unclass))+"/"+str(len(man["modules"]))+"\n\n")
        f.write("**Motivo:** sus exports y definiciones estan minificados y no importan simbolos\n")
        f.write("con nombre legible. Se conserva su codigo integro y su posicion de origen.\n\n")
        f.write("**No se invento ninguna categoria para estos modulos.**\n\n")
        f.write("### Lista (chunk -> vfs_path, offset)\n\n")
        for fn in sorted(unclass):
            i=man["modules"][fn]
            f.write(f"- `{fn}` -> `{i['vfs_path']}` @ offset {i['origin']['bin_offset']} ({i['origin']['bytes']} bytes, {i['export_count']} exports)\n")
        f.write("\n## Imports no resueltos\n\n")
        f.write(f"Total: **{len(syms['unresolved_imports'])}**\n\n")
        f.write("Son imports cuyo modulo destino NO fue extraido (no esta en el .so con bytecode\n")
        f.write("propio o es un modulo nativo no empacotado). Se conservan con chunk y posicion.\n\n")
        ext=Counter()
        for u in syms["unresolved_imports"]:
            ext[u.get("to") or "chunk_externo"]+=1
        for k,v in ext.most_common(): f.write(f"- `{k}`: {v}\n")
        f.write("\n### Detalle (primeros 200)\n\n")
        for u in syms["unresolved_imports"][:200]:
            f.write(f"- `{u.get('symbol')}` desde `{u.get('from')}` @ pos {u.get('pos')} -> `{u.get('to')}`\n")
        f.write("\n## Simbolos compartidos (mismo nombre en varios chunks)\n\n")
        f.write(f"Total: **{len(ana['shared_exports'])}**\n\n")
        f.write("| Simbolo | Chunks |\n|---|---:|\n")
        for name,v in sorted(ana["shared_exports"].items(), key=lambda kv:-len(kv[1]))[:120]:
            f.write(f"| `{name}` | {len(v)} |\n")
    print("inventarios escritos en",I)
    print("apis plataforma:",len(plat))
    print("categorias:",len(func))
    return 0

if __name__=="__main__":
    sys.exit(main())
