#!/usr/bin/env python3
"""
Fase 1 - emision del arbol (version eficiente: un solo paso de tokenizacion).
Renombrado INVERTIBLE y SIN COLISION con patron  <real>__<local>.
Un solo re.sub por chunk (regex alternativa de todos los locales) -> O(n).
"""
import json, os, re, sys
from collections import Counter

ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CHUNKS=os.path.join(ROOT,"bundle","chunks")
TREE=os.path.join(ROOT,"motor","modules","tree")
MAN=os.path.join(ROOT,"motor","modules","manifest.json")

HEADER = """// ============================================================================
// MODULO RECONSTRUIDO - Fase 1 (CreafMotorCode) - COPIA, NO EDITABLE EN ORIGEN
// ----------------------------------------------------------------------------
// chunk original : {chunk}
// ruta vfs       : {vfs}
// offset en .so  : {off}  (longitud {blen})
// tamano         : {size} bytes
// exports        : {nexp}
// categoria      : {cat}
// evidencia      : {ev}
// ----------------------------------------------------------------------------
// PROCEDENCIA: este archivo es una COPIA. El original permanece INTACTO en
//   bundle/chunks/{chunk}
// verificado por SHA-256 en motor/integrity/baseline.sha256
//
// Los simbolos locales minificados fueron renombrados con el patron
//   <nombre-real>__<nombre-minificado>
// solo cuando el binario aporta evidencia (export{{local as real}} o
// definicion textual). El sufijo hace la operacion INVERTIBLE y sin colision.
// Cada renombrado queda registrado en motor/symbols/renames.json con chunk y
// posicion de origen. Los simbolos sin evidencia conservan su nombre original.
// ============================================================================

"""

IDENT=re.compile(r'[A-Za-z_$][\w$]*')

def main():
    man=json.load(open(MAN))
    if os.path.isdir(TREE):
        for root,dirs,files in os.walk(TREE, topdown=False):
            for f in files: os.remove(os.path.join(root,f))
            for d in dirs: os.rmdir(os.path.join(root,d))
    os.makedirs(TREE,exist_ok=True)
    written=[]; renames_log=[]; all_skipped=[]
    for idx,(fn,info) in enumerate(man["modules"].items()):
        src=open(os.path.join(CHUNKS,fn),encoding="utf-8",errors="replace").read()
        tokens=set(IDENT.findall(src))
        applied={}; skipped=[]
        cand=info["renames"]
        for local,real in sorted(cand.items(), key=lambda kv:(-len(kv[0]),kv[0])):
            if not re.match(r'^[A-Za-z_$][\w$]*$',local) or not re.match(r'^[A-Za-z_$][\w$]*$',real):
                skipped.append((local,real,"identificador invalido")); continue
            if local==real:
                skipped.append((local,real,"sin cambio")); continue
            newname=f"{real}__{local}"
            if newname in tokens:
                skipped.append((local,real,"nombre compuesto ya existe")); continue
            applied[local]=newname
            tokens.add(newname); tokens.discard(local)
        # un solo re.sub con alternativa de todos los locales
        out=src
        if applied:
            alts="|".join(re.escape(k) for k in sorted(applied,key=len,reverse=True))
            rx=re.compile(r'(?<![\w$.])('+alts+r')(?![\w$])')
            out=rx.sub(lambda m: applied[m.group(1)], src)
        for local,newname in applied.items():
            m=re.search(r'(?<![\w$.])'+re.escape(local)+r'(?![\w$])', src)
            renames_log.append({"chunk":fn,"local":local,"real_name":newname.split("__",1)[0],
                "new_name":newname,"origin_pos":m.start() if m else None,
                "evidence":"export{local as real} / definicion textual"})
        for local,real,why in skipped:
            all_skipped.append({"chunk":fn,"local":local,"candidate":real,"reason":why})
        cat=info["category"] or "unclassified"
        d=os.path.join(TREE,cat); os.makedirs(d,exist_ok=True)
        base=(info["vfs_path"] or fn).replace("/","_").replace("$","")
        # sufijo con offset: garantiza unicidad (vfs_path puede repetirse)
        dst=os.path.join(d, f"{base}__{info['origin']['bin_offset']}.js")
        ev=info.get("category_evidence") or {}
        with open(dst,"w",encoding="utf-8") as f:
            f.write(HEADER.format(chunk=fn,vfs=info["vfs_path"],off=info["origin"]["bin_offset"],
                blen=info["origin"]["bin_len"],size=info["origin"]["bytes"],
                nexp=info["export_count"],cat=cat,ev=json.dumps(ev,ensure_ascii=False)[:220]))
            f.write(out)
        written.append({"tree_path":os.path.relpath(dst,ROOT),"chunk":fn,
            "vfs":info["vfs_path"],"category":cat,"bytes":info["origin"]["bytes"],
            "exports":info["export_count"],"renamed_symbols":len(applied)})
        if idx%50==0: print(f"  ... {idx}/{len(man['modules'])}", flush=True)
    json.dump(written,open(os.path.join(ROOT,"motor","modules","tree_manifest.json"),"w"),indent=1)
    json.dump({"applied":renames_log,"skipped":all_skipped},
              open(os.path.join(ROOT,"motor","symbols","renames.json"),"w"),indent=1)
    c=Counter(w["category"] for w in written)
    print("modulos escritos:",len(written))
    for k,v in c.most_common(): print(f"  {k:22} {v}")
    print("renombrados aplicados:",len(renames_log))
    print("renombrados omitidos:",len(all_skipped), dict(Counter(x["reason"].split("(")[0].strip() for x in all_skipped)))
    return 0

if __name__=="__main__":
    sys.exit(main())
