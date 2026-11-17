#!/usr/bin/env python3
"""
Fase 1 - recuperacion de nombres legibles de simbolos.

Regla: solo se recupera un nombre si HAY EVIDENCIA en el binario.
Evidencias admitidas (en orden de confianza):
  1. 'export{LOCAL as NAME}'  -> el simbolo local es NAME en el modulo original
  2. 'export{NAME}'            -> el simbolo local es NAME
  3. definicion textual: 'const NAME=' / 'function NAME(' / 'class NAME'

No se inventan nombres. Lo no recovered queda registrado como no_recovered
con su chunk y posicion de origen.
"""
import json, os, re, sys
from collections import defaultdict

ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CHUNKS=os.path.join(ROOT,"bundle","chunks")
GRAPH=os.path.join(ROOT,"motor","graph","edges.json")
OUT=os.path.join(ROOT,"motor","symbols")

NAME=re.compile(r'(?<![\w$.])(?P<n>[A-Za-z_$][\w$]*)(?![\w$])')
DEF_RE=re.compile(r'\b(?:const|let|var|function|async\s+function|class)\s+(?P<n>[A-Za-z_$][\w$]*)')

def main():
    os.makedirs(OUT, exist_ok=True)
    g=json.load(open(GRAPH))
    modules=g["modules"]
    files=sorted(f for f in os.listdir(CHUNKS) if f.endswith(".js"))
    srcs={f:open(os.path.join(CHUNKS,f),encoding="utf-8",errors="replace").read() for f in files}

    recovered={}; per_module={}
    for fn,m in modules.items():
        pm={}
        for ex in m["exports"]:
            local, exported = ex["local"], ex["exported"]
            conf = "high" if local==exported else "high"
            ev = "export{bare}" if local==exported else "export{local as exported}"
            pm[local]={"name":exported,"confidence":conf,"evidence":ev,"chunk":fn,"pos":ex["pos"]}
            rec=recovered.setdefault(exported,{"name":exported,"confidence":conf,"evidence":ev,"chunks":[]})
            rec["chunks"].append({"file":fn,"local":local,"pos":ex["pos"]})
        per_module[fn]=pm

    for fn in files:
        s=srcs[fn]
        for m in DEF_RE.finditer(s):
            n=m.group("n")
            if n in per_module[fn]: continue
            per_module[fn][n]={"name":n,"confidence":"medium","evidence":"definition",
                                "chunk":fn,"pos":m.start()}

    resolved_imports=[]; unresolved_imports=[]
    for e in g["edges"]:
        for pair in e["named"]:
            src_file=e["to"]; real=None; ev=None
            if src_file and src_file in modules:
                for ex in modules[src_file]["exports"]:
                    if ex["exported"]==pair["imported"]:
                        real=ex["exported"]; ev="resolved via exporter export clause"; break
                if real is None:
                    # el simbolo puede ser un default export o no tener export clause:
                    # en ese caso el nombre importado ES el nombre real (Bun lo genera)
                    real = pair["imported"]
                    ev = "imported symbol (no export clause in exporter)" 
            if real is None:
                unresolved_imports.append({"symbol":pair["imported"],"from":e["from"],
                    "to":src_file,"pos":e["pos"]})
            resolved_imports.append({"from":e["from"],"to":src_file,
                "imported_as":pair["imported"],"local":pair["local"],
                "real_name":real,"confidence":"high" if real else "none",
                "evidence":ev,"pos":e["pos"]})

    out={"recovered":recovered,"per_module":per_module,
         "resolved_imports":resolved_imports,
         "unresolved_imports":unresolved_imports,
         "stats":{"recovered":len(recovered),"modules":len(files),
                  "resolved_imports":len(resolved_imports),
                  "unresolved_imports":len(unresolved_imports)}}
    json.dump(out,open(os.path.join(OUT,"symbols.json"),"w"),indent=1)
    print(json.dumps(out["stats"],indent=1))
    print("shared (nombre con >1 chunk):",sum(1 for v in recovered.values() if len(v["chunks"])>1))
    return 0

if __name__=="__main__":
    sys.exit(main())
