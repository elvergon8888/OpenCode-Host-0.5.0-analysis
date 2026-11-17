#!/usr/bin/env python3
"""
Fase 1 - clasificacion ESTRICTA.
Regla del brief: no presentar inferencias como hechos.
Solo se clasifica un modulo cuando existe EVIDENCIA DIRECTA:
  E1: el modulo EXPORTA simbolos con nombre legible (no minificado) -> usa esos nombres
  E2: el modulo DECLARA (const/let/var/function/class) entidades con nombre legible
  E3: el modulo importa un simbolo con nombre legible de otro chunk -> se anota el dominio
Si no hay ninguna, queda 'unclassified' con la razon.
"""
import json, os, re, sys
from collections import defaultdict

ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CHUNKS=os.path.join(ROOT,"bundle","chunks")
GRAPH=os.path.join(ROOT,"motor","graph","edges.json")
MAN=os.path.join(ROOT,"motor","modules","manifest.json")

READABLE=re.compile(r'^[A-Za-z_$][\w$]*$')
MINIFIED=re.compile(r'^[A-Za-z_$][\w$]{0,3}$')

DOMAIN=[
 ("provider-layer", r'provider|Provider'),
 ("model-registry", r'\bModel\w*|modelID|modelId'),
 ("tool", r'\bTool\w*|toolCall|toolResult'),
 ("session", r'\bSession\w*'),
 ("message", r'\bMessage\w*'),
 ("agent", r'\bAgent\w*|subagent'),
 ("permissions", r'[Pp]ermission'),
 ("auth", r'[Aa]uth|[Cc]redential|apiKey|OAuth'),
 ("mcp", r'\bMcp\w*|\bMCP\b'),
 ("server", r'\bServer\w*|createServer|listen'),
 ("routing", r'\bRoute\w*|\bRouter\b'),
 ("config", r'\bConfig\w*'),
 ("event", r'\bEvent\w*|EventBus'),
 ("pty", r'\bPty\w*|\bPTY\b|[Tt]erminal'),
 ("git", r'\bGit\w*'),
 ("lsp", r'\bLSP\w*|LanguageServer'),
 ("plugin", r'\bPlugin\w*'),
 ("file", r'\bFile\w*'),
 ("logging", r'\bLogger\b|logLevel'),
 ("cache", r'\bCache\w*'),
 ("websocket", r'WebSocket|websocket'),
 ("snapshot", r'\bSnapshot\w*'),
 ("diff", r'\bDiff\w*|applyPatch'),
 ("schema", r'\bSchema\w*|Schema$'),
 ("effect", r'\bEffect\w*|\bLayer\b|ServiceMap'),
 ("command", r'\bCommand\w*'),
 ("state", r'\bState\w*|StateMap'),
]

def is_readable(n):
    if not n or not READABLE.match(n): return False
    if MINIFIED.match(n) and n.islower() and len(n)<=2: return False
    # nombres de 1-3 chars en minúscula son minificados; 1-3 con mayúscula o $ son del bundler ($foo)
    if len(n)<=3 and n[0].islower() and n.isalpha(): return False
    return True

def main():
    man=json.load(open(MAN)); g=json.load(open(GRAPH))
    modules=g["modules"]
    # nombres legibles que CADA chunk exporta
    readable_exports={fn:[e["name"] for e in man["modules"][fn]["exports"] if is_readable(e["name"])]
                      for fn in modules}
    # definiciones textuales legibles
    DEF=re.compile(r'\b(?:const|let|var|function|async\s+function|class)\s+([A-Za-z_$][\w$]*)')
    readable_defs={}
    for fn in modules:
        src=open(os.path.join(CHUNKS,fn),encoding="utf-8",errors="replace").read()
        seen=[]
        for m in DEF.finditer(src):
            n=m.group(1)
            if is_readable(n) and n not in seen: seen.append(n)
        readable_defs[fn]=seen

    # simbolos importados con nombre legible (dominio referenciado)
    imported_readable=defaultdict(list)
    for e in g["edges"]:
        for pair in e["named"]:
            if is_readable(pair["imported"]):
                imported_readable[e["from"]].append(pair["imported"])

    classified=0
    for fn,info in man["modules"].items():
        ev=[]
        names=list(readable_exports[fn])+list(readable_defs[fn])
        if names:
            for cat,pat in DOMAIN:
                if any(re.search(pat,n) for n in names):
                    ev.append((cat,"E1/E2-symbol-name",[n for n in names if re.search(pat,n)][:6]))
            if imported_readable.get(fn):
                for cat,pat in DOMAIN:
                    if any(re.search(pat,n) for n in imported_readable[fn]):
                        ev.append((cat,"E3-imported-name",[n for n in imported_readable[fn] if re.search(pat,n)][:6]))
        if ev:
            # desempate: el de mayor peso E1/E2 sobre E3, luegoorden alfabetico estable
            ev.sort(key=lambda x: (0 if x[1].startswith("E1") else 1 if x[1].startswith("E2") else 2, x[0]))
            cat=ev[0][0]
            info["category"]=cat
            info["category_evidence"]={"kind":ev[0][1],"symbols":ev[0][2]}
            info["category_alternatives"]=[{"category":c,"kind":k,"symbols":s} for c,k,s in ev[1:4]]
            classified+=1
        else:
            info["category"]="unclassified"
            info["category_evidence"]={"kind":"none",
                "reason":"sin evidencia directa (exports y definiciones minificados, sin imports con nombre legible)",
                "readable_exports":readable_exports[fn][:8],
                "readable_defs":readable_defs[fn][:8]}
    json.dump(man,open(MAN,"w"),indent=1)
    from collections import Counter
    c=Counter(i["category"] for i in man["modules"].values())
    print(f"clasificados con EVIDENCIA DIRECTA: {classified}/{len(man['modules'])}")
    for k,v in c.most_common(): print(f"  {k:22} {v}")
    return 0

if __name__=="__main__":
    sys.exit(main())
