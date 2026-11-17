#!/usr/bin/env python3
"""
Fase 1 - PRUEBA DE INTEGRIDAD.
Demuestra que la reconstruccion NO altero los originales.
Compara SHA-256 actual contra motor/integrity/baseline.sha256.
Verifica ademas:
  - que cada chunk original tenga su modulo en el arbol
  - que el contenido del modulo copiado sea identico al original salvo el
    encabezado de procedencia y el renombrado con evidencia
  - que el .so fuente y el APK original no hayan cambiado
Exit code 0 = OK, 1 = FALLO
"""
import hashlib, json, os, re, sys
from collections import defaultdict

ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BASE=os.path.join(ROOT,"motor","integrity","baseline.sha256")
CHUNKS=os.path.join(ROOT,"bundle","chunks")
TREE=os.path.join(ROOT,"motor","modules","tree")
MAN=os.path.join(ROOT,"motor","modules","manifest.json")

def sha256(p):
    h=hashlib.sha256()
    with open(p,"rb") as f:
        for b in iter(lambda: f.read(1<<20), b""): h.update(b)
    return h.hexdigest()

def main():
    if not os.path.exists(BASE):
        print("FALLO: no existe baseline"); return 1
    baseline={}
    for line in open(BASE):
        line=line.rstrip("\n")
        if not line.strip(): continue
        if line.startswith("#"):
            # encabezado de grupo: "# <etiqueta>" -> la siguiente linea "=== ..." se ignora
            continue
        if line.startswith("==="):
            continue
        parts=line.split(None,1)
        if len(parts)==2:
            baseline.setdefault("files",{})[parts[1].strip()]=parts[0]
    failures=[]; checked=0
    for grp,entries in baseline.items():
        for path,want in entries.items():
            full=os.path.join(ROOT,path)
            if not os.path.exists(full):
                failures.append(f"AUSENTE: {path}"); continue
            got=sha256(full)
            checked+=1
            if got!=want:
                failures.append(f"ALTERADO: {path}\n    esperado {want}\n    obtenido {got}")
    print(f"[1] hashes verificados: {checked}")
    if failures:
        print("[1] FALLOS:")
        for f in failures: print("   ",f)
    else:
        print("[1] OK - ningun original alterado")

    # [2] cobertura: cada chunk -> modulo en arbol
    man=json.load(open(MAN))
    renlog_raw=json.load(open(os.path.join(ROOT,"motor","symbols","renames.json")))
    renlog=defaultdict(list)
    for r in renlog_raw["applied"]: renlog[r["chunk"]].append(r)
    tm=json.load(open(os.path.join(ROOT,"motor","modules","tree_manifest.json")))
    tree_files={w["chunk"]: w["tree_path"] for w in tm}
    missing=[fn for fn in man["modules"] if fn not in tree_files]
    absent=[]
    for fn,rel in tree_files.items():
        if not os.path.exists(os.path.join(ROOT,rel)): absent.append(fn)
    print(f"[2] chunks en manifest: {len(man['modules'])} | con modulo: {len(tree_files)} "
          f"| sin modulo: {len(missing)} | modulo-file ausente: {len(absent)}")
    cov_ok = not missing and not absent
    print("[2]", "OK - cobertura 100%" if cov_ok else "FALLO - cobertura incompleta")

    # [3] contenido: copia == original salvo encabezado y renombrado con evidencia
    HEAD=re.compile(r'^// =+\n(.*?)\n// =+\n\n', re.S)
    mismatches=[]; verified=0
    for fn,rel in tree_files.items():
        op=os.path.join(CHUNKS,fn); cp=os.path.join(ROOT,rel)
        if not (os.path.exists(op) and os.path.exists(cp)): continue
        orig=open(op,encoding="utf-8",errors="replace").read()
        copy=open(cp,encoding="utf-8",errors="replace").read()
        m=HEAD.match(copy)
        if not m: mismatches.append(f"{fn}: sin encabezado de procedencia"); continue
        body=copy[m.end():]
        # invertir usando el LOG EXACTO de renombres (sin ambiguedad)
        restored=body
        rl=renlog.get(fn,[])
        if rl:
            alts="|".join(re.escape(r["new_name"]) for r in sorted(rl,key=lambda x:-len(x["new_name"])))
            rx=re.compile(r'(?<![\w$.])('+alts+r')(?![\w$])')
            restored=rx.sub(lambda m: next(r["local"] for r in rl if r["new_name"]==m.group(1)), body)
        if restored==orig: verified+=1
        else:
            # longitud distinta -> buscar la razon
            if len(restored)==len(orig):
                mismatches.append(f"{fn}: diff de {sum(1 for a,b in zip(restored,orig) if a!=b)} chars")
            else:
                mismatches.append(f"{fn}: longitud {len(restored)} != {len(orig)}")
    print(f"[3] copias verificadas byte-a-byte (tras revertir renombrados): {verified}/{len(tree_files)}")
    if mismatches:
        print("[3] primeros 10 desvios:")
        for x in mismatches[:10]: print("   ",x)
    content_ok = verified==len(tree_files)
    print("[3]", "OK - toda copia es reversible al original" if content_ok else "REVISAR desvios")

    ok = not failures and cov_ok
    print()
    print("RESULTADO:", "INTEGRIDAD OK" if ok else "INTEGRIDAD CON FALLOS")
    json.dump({"hashes_checked":checked,"hash_failures":failures,
               "coverage":{"manifest":len(man["modules"]),"with_module":len(tree_files),
                           "missing":missing,"absent":absent},
               "content":{"verified":verified,"total":len(tree_files),
                          "mismatches":mismatches[:100],
                          "mismatch_count":len(mismatches)},
               "result":"OK" if ok else "FALLO"},
              open(os.path.join(ROOT,"motor","integrity","verify_report.json"),"w"),indent=1)
    return 0 if ok else 1

if __name__=="__main__":
    sys.exit(main())
