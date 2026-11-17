#!/usr/bin/env python3
"""
Fase 1 - reconstruccion del arbol de módulos navegable.
Lee edges.json + symbols.json. Escribe en motor/modules/.
NO modifica los chunks originales.
"""
import json, os, re, sys
from collections import defaultdict

ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CHUNKS=os.path.join(ROOT,"bundle","chunks")
GRAPH=os.path.join(ROOT,"motor","graph","edges.json")
ANA=os.path.join(ROOT,"motor","graph","analysis.json")
SYMS=os.path.join(ROOT,"motor","symbols","symbols.json")
OUT=os.path.join(ROOT,"motor","modules")

# Clasificacion por evidencia en el contenido (no por inferencia de nombres inventados)
PLATFORM_MARKERS={
 "bun:sqlite": r'bun:sqlite',
 "bun:ffi": r'bun:ffi',
 "Bun.file": r'Bun\.file',
 "Bun.write": r'Bun\.write',
 "Bun.spawn": r'Bun\.spawn',
 "Bun.serve": r'Bun\.serve',
 "Bun.env": r'Bun\.env',
 "node:child_process": r'node:child_process|from"child_process"',
 "node:worker_threads": r'node:worker_threads|from"worker_threads"',
 "node:fs": r'node:fs|from"fs"',
 "node:net": r'node:net|from"net"',
 "node:http": r'node:http|from"http"',
 "node:https": r'node:https|from"https"',
 "node:crypto": r'node:crypto|from"crypto"',
 "node:os": r'node:os|from"os"',
 "node:readline": r'node:readline|from"readline"',
 "node:tty": r'node:tty|from"tty"',
 "node:zlib": r'node:zlib|from"zlib"',
 "node:module": r'node:module|from"module"',
 "node:path": r'node:path|from"path"',
 "node:url": r'node:url|from"url"',
 "node:util": r'node:util|from"util"',
 "node:stream": r'node:stream|from"stream"',
 "node:events": r'node:events|from"events"',
 "node:process": r'node:process|from"process"',
 "node:buffer": r'node:buffer|from"buffer"',
 "node:async_hooks": r'node:async_hooks|from"async_hooks"',
 "node:inspector": r'node:inspector|from"inspector"',
 "node:perf_hooks": r'node:perf_hooks|from"perf_hooks"',
 "node:assert": r'node:assert|from"assert"',
 "node:timers": r'node:timers|from"timers',
 "node:stream/promises": r'from"stream/promises"',
 "node:fs/promises": r'from"fs/promises"',
 "node:stream/consumers": r'from"stream/consumers"',
}

def classify(src, exports, imports_ext):
    """Asigna categoria por EVIDENCIA observable. Sin inventar."""
    tags=[]
    joined="\n".join(exports)
    # por evidencia textual
    if re.search(r'Provider|provider', joined): tags.append("provider-layer")
    if re.search(r'Model|model', joined): tags.append("model-registry")
    if re.search(r'Tool|tool', joined): tags.append("tool")
    if re.search(r'Session|session', joined): tags.append("session")
    if re.search(r'Message|message', joined): tags.append("message")
    if re.search(r'Auth|auth|Credential|credential', joined): tags.append("auth")
    if re.search(r'Mcp|MCP|mcp', joined): tags.append("mcp")
    if re.search(r'Server|server', joined): tags.append("server")
    if re.search(r'Config|config', joined): tags.append("config")
    if re.search(r'Permission|permission', joined): tags.append("permissions")
    if re.search(r'Agent|agent', joined): tags.append("agent")
    if re.search(r'Plugin|plugin', joined): tags.append("plugin")
    if re.search(r'Lsp|LSP|lsp', joined): tags.append("lsp")
    if re.search(r'Event|event', joined): tags.append("event")
    if re.search(r'Command|command', joined): tags.append("command")
    if re.search(r'File|file', joined): tags.append("file")
    if re.search(r'Git|git', joined): tags.append("git")
    if re.search(r'Pty|pty|Pty|PTY', joined): tags.append("pty")
    if re.search(r'Snapshot|snapshot', joined): tags.append("snapshot")
    if re.search(r'Effect|effect|Schema', joined): tags.append("effect-runtime")
    if re.search(r'WebSocket|websocket|Ws', joined): tags.append("websocket")
    if re.search(r'Router|route', joined): tags.append("routing")
    if re.search(r'Cache|cache', joined): tags.append("cache")
    if re.search(r'Log|log', joined): tags.append("logging")
    return tags

def main():
    os.makedirs(OUT, exist_ok=True)
    g=json.load(open(GRAPH)); ana=json.load(open(ANA)); syms=json.load(open(SYMS))
    modules=g["modules"]; metrics=ana["metrics"]
    scc_of={}
    for i,comp in enumerate(ana["topological_order"]):
        for n in comp: scc_of[n]=i

    manifest={"modules":{}, "generated_from":{"chunks":len(modules)}}
    platform_inventory=defaultdict(list)

    for fn,m in modules.items():
        src=open(os.path.join(CHUNKS,fn),encoding="utf-8",errors="replace").read()
        pm=syms["per_module"].get(fn,{})
        # mapa local -> nombre real
        renames={local:info["name"] for local,info in pm.items() if info.get("name") and info["name"]!=local}
        exports_real=[]
        for ex in m["exports"]:
            exports_real.append({"name":ex["exported"],"local":ex["local"],"pos":ex["pos"],
                                 "origin":f"{fn}@{ex['pos']}"})
        # deps internas
        deps=[{"file":d,"vfs_path":modules[d]["vfs_path"]} for d in g["dependency"].get(fn,[])]
        rdeps=[{"file":d,"vfs_path":modules[d]["vfs_path"]} for d in g["reverse_dependency"].get(fn,[])]
        # platform markers
        plat=[]
        for name,pat in PLATFORM_MARKERS.items():
            if re.search(pat,src): plat.append(name)
        for e in plat: platform_inventory[e].append(fn)
        ext_imports=sorted({e["src"] for e in g["edges"] if e["from"]==fn and e["external"]})
        tags=classify(src,[e["exported"] for e in m["exports"]],ext_imports)
        mt=metrics[fn]
        manifest["modules"][fn]={
            "vfs_path":m["vfs_path"],
            "origin":{"file":fn,"bin_offset":m["bin_offset"],"bin_len":m["bin_len"],"bytes":m["bytes"]},
            "topo_rank":scc_of.get(fn),
            "in_cycle":mt["in_scc"]>1,
            "exports":exports_real,
            "export_count":len(exports_real),
            "renames":renames,
            "dependencies":deps,
            "dependents":rdeps,
            "external_imports":ext_imports,
            "platform_apis":plat,
            "tags":tags,
            "metrics":mt,
        }

    json.dump(manifest,open(os.path.join(OUT,"manifest.json"),"w"),indent=1)
    json.dump({k:sorted(set(v)) for k,v in platform_inventory.items()},
              open(os.path.join(OUT,"platform_inventory.json"),"w"),indent=1)
    print("modulos:",len(manifest["modules"]))
    print("platform apis detectadas:",len(platform_inventory))
    print("tags:",sorted({t for m in manifest['modules'].values() for t in m['tags']}))
    return 0

if __name__=="__main__":
    sys.exit(main())
