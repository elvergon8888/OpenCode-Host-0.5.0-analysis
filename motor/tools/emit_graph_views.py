#!/usr/bin/env python3
"""
Fase 1 - vistas del grafo: Mermaid, DOT, y tabla de trazabilidad chunk->modulo.
"""
import json, os, sys
from collections import defaultdict

ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
G=os.path.join(ROOT,"motor","graph"); OUT=os.path.join(ROOT,"motor","graph")

def main():
    g=json.load(open(os.path.join(G,"edges.json")))
    ana=json.load(open(os.path.join(G,"analysis.json")))
    man=json.load(open(os.path.join(ROOT,"motor","modules","manifest.json")))
    modules=g["modules"]
    short=lambda fn: (modules[fn]["vfs_path"] or fn).replace("/$bunfs/root/","").replace(".js","")

    # ---- 1. DOT completo ----
    with open(os.path.join(OUT,"graph.dot"),"w") as f:
        f.write("digraph opencode_motor {\n  rankdir=LR;\n  node [shape=box,fontsize=8];\n")
        for fn,m in modules.items():
            cat=(man["modules"][fn]["category"] or "unclassified").replace('"','')
            label=short(fn)
            f.write(f'  "{fn}" [label="{label}\\n({cat})"];\n')
        for e in g["edges"]:
            if e["to"]:
                f.write(f'  "{e["from"]}" -> "{e["to"]}";\n')
        f.write("}\n")

    # ---- 2. Mermaid: top por criticidad (rdeps) ----
    metrics=ana["metrics"]
    top=sorted(metrics, key=lambda fn:-metrics[fn]["rdeps"])[:45]
    tops=set(top)
    with open(os.path.join(OUT,"graph_top.mmd"),"w") as f:
        f.write("graph LR\n")
        for fn in top:
            cat=(man["modules"][fn]["category"] or "unclassified").replace('"','')
            f.write(f'  {fn.replace("-","_")}["{short(fn)}<br/>{cat}<br/>rdeps={metrics[fn]["rdeps"]}"]\n')
        for e in g["edges"]:
            if e["to"] and e["from"] in tops and e["to"] in tops:
                f.write(f'  {e["from"].replace("-","_")} --> {e["to"].replace("-","_")}\n')
    # aristas hacia/desde top (con nodos externos)
    with open(os.path.join(OUT,"graph_top_context.mmd"),"w") as f:
        f.write("graph LR\n")
        ctx=set(top)
        for e in g["edges"]:
            if e["to"]:
                if e["from"] in tops: ctx.add(e["to"])
                if e["to"] in tops: ctx.add(e["from"])
        for fn in sorted(ctx):
            if fn not in modules: continue
            cat=(man["modules"][fn]["category"] or "unclassified").replace('"','')
            f.write(f'  {fn.replace("-","_")}["{short(fn)}<br/>{cat}"]\n')
        for e in g["edges"]:
            if e["to"] and (e["from"] in tops or e["to"] in tops):
                f.write(f'  {e["from"].replace("-","_")} --> {e["to"].replace("-","_")}\n')

    # ---- 3. trazabilidad chunk -> modulo (TXT + CSV) ----
    tm=json.load(open(os.path.join(ROOT,"motor","modules","tree_manifest.json")))
    rows=[]
    for w in sorted(tm, key=lambda x:x["chunk"]):
        info=man["modules"][w["chunk"]]
        rows.append({
            "chunk":w["chunk"],"vfs_path":w["vfs"],"bin_offset":info["origin"]["bin_offset"],
            "bin_len":info["origin"]["bin_len"],"bytes":info["origin"]["bytes"],
            "exports":w["exports"],"renamed":w["renamed_symbols"],"category":w["category"],
            "tree_path":w["tree_path"],
            "deps":len(info["dependencies"]),"dependents":len(info["dependents"]),
            "platform_apis":"|".join(info["platform_apis"]),
            "in_cycle":info["in_cycle"],
        })
    with open(os.path.join(OUT,"traceability.csv"),"w") as f:
        f.write(",".join(rows[0].keys())+"\n")
        for r in rows:
            f.write(",".join(str(r[k]).replace(",",";") for k in r)+"\n")
    with open(os.path.join(OUT,"traceability.md"),"w") as f:
        f.write("# Trazabilidad chunk -> modulo reconstruido\n\n")
        f.write(f"Total: **{len(rows)}** chunks con modulo reconstruido.\n\n")
        f.write("| chunk | vfs_path | offset .so | bytes | exports | renombrados | categoria | ruta en arbol |\n")
        f.write("|---|---|---:|---:|---:|---:|---|---|\n")
        for r in rows:
            f.write(f"| `{r['chunk']}` | `{r['vfs_path']}` | {r['bin_offset']} | {r['bytes']} | "
                    f"{r['exports']} | {r['renamed']} | {r['category']} | `{r['tree_path']}` |\n")
    print("DOT:", os.path.getsize(os.path.join(OUT,"graph.dot")), "bytes")
    print("mermaid top:", os.path.getsize(os.path.join(OUT,"graph_top.mmd")), "bytes")
    print("trazabilidad:", len(rows), "filas")
    return 0

if __name__=="__main__":
    sys.exit(main())
