#!/usr/bin/env python3
"""
Fase 2.1 - AUDITORIA DE LAS 34 APIs DE PLATAFORMA.

Para cada API:
  - localiza los puntos de contacto EXACTOS (chunk + posicion byte + simbolos)
  - distingue contactos REALES de occurencias dentro de comentarios/strings
  - agrega metricas de dependencia (directos, transitivos, rdeps, criticidad)
  - clasifica sustitucion vs conservacion

No modifica ningun chunk. Solo lectura + artefactos en motor/platform/.
"""
import json, os, re, sys
from collections import defaultdict, Counter

ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CHUNKS=os.path.join(ROOT,"bundle","chunks")
OUT=os.path.join(ROOT,"motor","platform")
os.makedirs(OUT,exist_ok=True)

# ---------------------------------------------------------------- mapeo canonico
# Los 34 identificadores canonicos de PLATFORM_MARKERS (build_tree.py).
CANON = {
 "bun:sqlite","bun:ffi","Bun.file","Bun.write","Bun.spawn","Bun.serve","Bun.env",
 "node:child_process","node:worker_threads","node:fs","node:net","node:http",
 "node:https","node:crypto","node:os","node:readline","node:tty","node:zlib",
 "node:module","node:path","node:url","node:util","node:stream","node:events",
 "node:process","node:buffer","node:async_hooks","node:inspector","node:perf_hooks",
 "node:assert","node:timers","node:stream/promises","node:fs/promises",
 "node:stream/consumers",
}
# specifier -> canonico
SPEC2CANON={
 "fs":"node:fs","fs/promises":"node:fs/promises","fs/promises.*":"node:fs/promises",
 "path":"node:path","path/posix":"node:path","os":"node:os","crypto":"node:crypto",
 "url":"node:url","util":"node:util","util/types":"node:util","buffer":"node:buffer",
 "stream":"node:stream","stream/promises":"node:stream/promises",
 "stream/consumers":"node:stream/consumers","stream/web":"node:stream",
 "child_process":"node:child_process","worker_threads":"node:worker_threads",
 "net":"node:net","http":"node:http","http2":"node:http","https":"node:https",
 "tls":"node:https","zlib":"node:zlib","module":"node:module","readline":"node:readline",
 "readline/promises":"node:readline","tty":"node:tty","events":"node:events",
 "process":"node:process","async_hooks":"node:async_hooks","inspector":"node:inspector",
 "inspector/promises":"node:inspector","perf_hooks":"node:perf_hooks",
 "assert":"node:assert","assert/strict":"node:assert","timers":"node:timers",
 "timers/promises":"node:timers","string_decoder":"node:util",
 "bun:sqlite":"bun:sqlite","bun:ffi":"bun:ffi",
}
# miembros del global Bun que son APIs de plataforma
BUN_MEMBERS=["file","write","spawn","serve","env","spawnSync","which","sleep","$",
             "nanoseconds","inspect","gc","hash","password","CryptoHasher","resolveSync",
             "fileURLToPath","pathToFileURL","main","argv","version","revision","buildInfo"]

def canon_spec(spec):
    s=spec.strip()
    if not s: return None
    if s.startswith("node:"):
        c="node:"+s[5:]
        return c if c in CANON else None
    if s.startswith("bun:"):
        return s if s in CANON else None
    return SPEC2CANON.get(s)

# ---------------------------------------------------------------- lexer: enmascarar comentarios
def mask_comments(src):
    """Devuelve src con los comentarios sustituidos por espacios (misma longitud).
    Conserva posiciones. No toca strings ni templates."""
    out=list(src)
    i=0; n=len(src)
    while i<n:
        c=src[i]
        if c=='/' and i+1<n and src[i+1]=='/':
            j=src.find('\n',i)
            if j<0: j=n
            for k in range(i,j): out[k]=' '
            i=j
        elif c=='/' and i+1<n and src[i+1]=='*':
            j=src.find('*/',i+2)
            j = n if j<0 else j+2
            for k in range(i,j):
                if src[k]!='\n': out[k]=' '
            i=j
        elif c in ('"',"'",'`'):
            # saltar string/template de forma simple (con escapes)
            q=c; i+=1
            while i<n:
                if src[i]=='\\': i+=2; continue
                if src[i]==q: i+=1; break
                i+=1
        else:
            i+=1
    return ''.join(out)

# ---------------------------------------------------------------- estados lexicales
# 0=codigo  1=comentario  2=string  3=template
def classify_states(src):
    """Clasifica cada caracter por su contexto lexical. Permite descartar
    coincidencias que viven dentro de comentarios, strings o templates
    (p.ej. documentacion de bun-types embebida en el bundle)."""
    n=len(src); st=bytearray(n); i=0
    while i<n:
        c=src[i]
        if c=='/' and i+1<n and src[i+1]=='/':
            j=src.find('\n',i); j=n if j<0 else j
            for k in range(i,j): st[k]=1
            i=j; continue
        if c=='/' and i+1<n and src[i+1]=='*':
            j=src.find('*/',i+2); j=n if j<0 else j+2
            for k in range(i,j):
                if src[k]!='\n': st[k]=1
            i=j; continue
        if c in ('"',"'"):
            q=c; st[i]=2; i+=1
            while i<n:
                if src[i]=='\\':
                    st[i]=2
                    if i+1<n: st[i+1]=2
                    i+=2; continue
                st[i]=2
                if src[i]==q: i+=1; break
                i+=1
            continue
        if c=='`':
            st[i]=3; i+=1; depth=0
            while i<n:
                ch=src[i]
                if ch=='\\':
                    st[i]=3
                    if i+1<n: st[i+1]=3
                    i+=2; continue
                if depth==0 and ch=='`':
                    st[i]=3; i+=1; break
                if depth==0 and ch=='$' and i+1<n and src[i+1]=='{':
                    st[i]=3; st[i+1]=3; i+=2; depth=1
                    while i<n and depth>0:
                        if src[i]=='`':
                            st[i]=3; i+=1
                            while i<n and src[i]!='`':
                                if src[i]=='\\': i+=2; continue
                                st[i]=3; i+=1
                            if i<n: st[i]=3; i+=1
                            continue
                        if src[i]=='{': depth+=1
                        elif src[i]=='}': depth-=1
                        else:
                            st[i]=0
                        i+=1
                    continue
                st[i]=3; i+=1
            continue
        i+=1
    return st

# ---------------------------------------------------------------- patrones
RE_ESM = re.compile(r"""(?<![.\w$])import\s*(?:type\s*)?(?P<clause>(?:[^;'"()]*?\bfrom\b)?)\s*(?P<q>["'])(?P<spec>[^"']+)(?P=q)""")
RE_REQUIRE = re.compile(r'(?<![.\w$])require\s*\(\s*(?P<q>["\'])(?P<spec>[^"\']+)(?P=q)\s*\)')
RE_DYNIMP = re.compile(r'(?<![.\w$])import\s*\(\s*(?P<q>["\'])(?P<spec>[^"\']+)(?P=q)\s*\)')
RE_BUN = re.compile(r'(?<![.\w$])Bun\s*\.\s*(?P<mem>'+'|'.join(sorted(map(re.escape,BUN_MEMBERS),key=len,reverse=True))+r')(?![$\w])')

def parse_clause(clause):
    """Extrae simbolos importados de la clausula ESM."""
    c=clause.strip()
    if not c: return {"named":[], "default":None, "namespace":None}
    named=[]; default=None; namespace=None
    # namespace: * as X
    m=re.search(r'\*\s+as\s+([A-Za-z_$][\w$]*)',c)
    if m: namespace=m.group(1)
    # default: identificador suelto o "X, { ... }"
    head=c.split('{',1)[0]
    head=re.sub(r'\*\s+as\s+[A-Za-z_$][\w$]*','',head)
    for part in head.split(','):
        part=part.strip()
        part=re.sub(r'^type\s+','',part)
        if not part: continue
        if re.match(r'^[A-Za-z_$][\w$]*$',part): default=part
    # named: { a as b, c }
    if '{' in c:
        inner=c[c.index('{')+1:c.rindex('}')]
        for part in inner.split(','):
            part=part.strip().rstrip(',').strip()
            if not part: continue
            part=re.sub(r'^type\s+','',part)
            mm=re.match(r'^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$',part)
            if mm: named.append({"imported":mm.group(1),"local":mm.group(2)})
            elif re.match(r'^[A-Za-z_$][\w$]*$',part):
                named.append({"imported":part,"local":part})
    return {"named":named,"default":default,"namespace":namespace}

def main():
    man=json.load(open(os.path.join(ROOT,"motor","modules","manifest.json")))
    ana=json.load(open(os.path.join(ROOT,"motor","graph","analysis.json")))
    edges=json.load(open(os.path.join(ROOT,"motor","graph","edges.json")))
    metrics=ana["metrics"]
    dep=edges["dependency"]; rdep=edges["reverse_dependency"]

    contacts=defaultdict(list)   # canon -> [contact]
    chunk_scan=defaultdict(set)  # canon -> {chunk}
    all_external=defaultdict(set)

    files=sorted(man["modules"].keys())
    for idx,fn in enumerate(files):
        src=open(os.path.join(CHUNKS,fn),encoding="utf-8",errors="replace").read()
        st=classify_states(src)

        # 1) ESM
        for m in RE_ESM.finditer(src):
            if st[m.start()]!=0: continue
            spec=m.group("spec"); canon=canon_spec(spec)
            if not canon: continue
            info=parse_clause(m.group("clause"))
            contacts[canon].append({
                "chunk":fn,"vfs":man["modules"][fn]["vfs_path"],"pos":m.start(),
                "kind":"esm","specifier":spec,"symbols":info,
                "snippet":src[m.start():m.start()+160]})
            chunk_scan[canon].add(fn); all_external[canon].add(spec)

        # 2) require
        for m in RE_REQUIRE.finditer(src):
            if st[m.start()]!=0: continue
            spec=m.group("spec"); canon=canon_spec(spec)
            if not canon: continue
            contacts[canon].append({
                "chunk":fn,"vfs":man["modules"][fn]["vfs_path"],"pos":m.start(),
                "kind":"require","specifier":spec,"symbols":{"named":[],"default":None,"namespace":None},
                "snippet":src[max(0,m.start()-40):m.start()+120]})
            chunk_scan[canon].add(fn); all_external[canon].add(spec)

        # 3) import dinamico
        for m in RE_DYNIMP.finditer(src):
            if st[m.start()]!=0: continue
            spec=m.group("spec"); canon=canon_spec(spec)
            if not canon: continue
            contacts[canon].append({
                "chunk":fn,"vfs":man["modules"][fn]["vfs_path"],"pos":m.start(),
                "kind":"dynamic-import","specifier":spec,"symbols":{"named":[],"default":None,"namespace":None},
                "snippet":src[max(0,m.start()-40):m.start()+120]})
            chunk_scan[canon].add(fn); all_external[canon].add(spec)

        # 4) global Bun
        for m in RE_BUN.finditer(src):
            if st[m.start()]!=0: continue
            mem=m.group("mem")
            canon="Bun."+mem
            if canon not in CANON: continue
            contacts[canon].append({
                "chunk":fn,"vfs":man["modules"][fn]["vfs_path"],"pos":m.start(),
                "kind":"bun-global","specifier":f"Bun.{mem}","symbols":{"named":[],"default":None,"namespace":None},
                "snippet":src[max(0,m.start()-60):m.start()+100]})
            chunk_scan[canon].add(fn)

        if idx%100==0: print(f"  escaneado {idx}/{len(files)}",flush=True)

    # ---------------------------------------------- metricas por chunk
    def crit(rdeps,deps,exports):
        # criticidad estructural (no semantica): fan-in relativo
        if rdeps>=100: return "critica"
        if rdeps>=30:  return "alta"
        if rdeps>=5:   return "media"
        if rdeps>=1:   return "baja"
        return "hoja"

    api_rows={}
    for api in sorted(CANON):
        cs=contacts.get(api,[])
        chunks=sorted(chunk_scan.get(api,[]))
        # metricas agregadas
        rdeps_total=set(); direct_total=set()
        per_chunk=[]
        for fn in chunks:
            info=man["modules"][fn]; mt=metrics[fn]
            rds=sorted(rdep.get(fn,[])); dps=sorted(dep.get(fn,[]))
            rdeps_total.update(rds); direct_total.update(dps)
            per_chunk.append({
                "chunk":fn,"vfs":info["vfs_path"],"bytes":info["origin"]["bytes"],
                "exports":info["export_count"],"category":info["category"] or "unclassified",
                "topo_rank":info["topo_rank"],"in_cycle":info["in_cycle"],
                "direct_dependents":len(rds),"transitive_dependents":mt["rdeps"],
                "dependencies":len(dps),
                "criticality":crit(mt["rdeps"],len(dps),info["export_count"]),
                "contact_count":sum(1 for c in cs if c["chunk"]==fn),
            })
        # symbols usados globalmente en esa api
        syms=Counter()
        for c in cs:
            s=c["symbols"]
            for n in s["named"]: syms[n["imported"]]+=1
            if s["default"]: syms["(default)"]+=1
            if s["namespace"]: syms["(namespace)"]+=1
        api_rows[api]={
            "api":api,
            "contact_count":len(cs),
            "chunk_count":len(chunks),
            "chunks":per_chunk,
            "symbols_used":dict(syms.most_common()),
            "specifiers_seen":sorted(all_external.get(api,set())),
            "kind_breakdown":dict(Counter(c["kind"] for c in cs)),
        }

    json.dump({"generated":"fase2.1","apis":api_rows,"contacts":{k:v for k,v in contacts.items()}},
              open(os.path.join(OUT,"api-audit.json"),"w"),indent=1)
    print("APIs auditadas:",len(api_rows))
    print("contactos totales:",sum(len(v) for v in contacts.values()))
    print("APIs con 0 contactos (deben conservarse o documentarse):",
          [a for a,r in api_rows.items() if r["contact_count"]==0])
    return 0

if __name__=="__main__":
    sys.exit(main())
