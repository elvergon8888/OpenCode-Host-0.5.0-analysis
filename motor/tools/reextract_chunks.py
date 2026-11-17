#!/usr/bin/env python3
"""
Fase 1 - re-extraccion precisa de los chunks de Bun.

Formato verificado empiricamente en libopencode.so:
  // @bun @bytecode
  <contenido>            <- puede incluir BYTES BINARIOS (assets .so/.wasm)
  \x00/$bunfs/root/NAME.js\x00   <- footer: ruta propia del chunk

Regla: el contenido termina en la ULTIMA aparicion del footer dentro de la
region delimitada por el siguiente marcador. Se preservan los bytes binarios.
Solo se regeneran DERIVADOS (bundle/chunks). Los originales (.so, APK) intactos.
"""
import json, os, re, sys

ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SO=os.path.join(ROOT,"unpacked","lib","arm64-v8a","libopencode.so")
OUTD=os.path.join(ROOT,"bundle","chunks")
MARK=b"// @bun @bytecode"
FOOTER=re.compile(rb'/\$bunfs/root/([\w.-]+\.js)\x00')

def extract(body):
    ms=list(FOOTER.finditer(body))
    if not ms: return body, None
    m=ms[-1]
    return body[:m.start()], m.group(1).decode()

def main():
    data=open(SO,"rb").read()
    offs=[m.start() for m in re.finditer(re.escape(MARK), data)]
    os.makedirs(OUTD,exist_ok=True)
    index=[]
    for i,o in enumerate(offs):
        end=offs[i+1] if i+1<len(offs) else min(o+5_000_000,len(data))
        content,src=extract(data[o+len(MARK):end])
        fn=f"chunk_{i:04d}_{o}.js"
        open(os.path.join(OUTD,fn),"wb").write(content)
        index.append({"i":i,"path":src,"off":o,"len":len(content)})
    orph=json.load(open(os.path.join(ROOT,"bundle","orphan_resolved.json")))
    for t,(i,o,cut) in orph.items():
        nxt=[x for x in offs if x>o]
        end=nxt[0] if nxt else min(o+5_000_000,len(data))
        content,src=extract(data[o+len(MARK):end])
        fn=f"chunk_orphan_{t.replace('chunk-','').replace('.js','')}.js"
        open(os.path.join(OUTD,fn),"wb").write(content)
        index.append({"i":i,"path":t,"off":o,"len":len(content),"orphan":True})
    json.dump(index,open(os.path.join(ROOT,"bundle","index.json"),"w"),indent=1)
    tot=sum(e["len"] for e in index)
    named=sum(1 for e in index if e["path"])
    dup={}
    for e in index:
        if e["path"]: dup[e["path"]]=dup.get(e["path"],0)+1
    dups={k:v for k,v in dup.items() if v>1}
    print(f"chunks: {len(index)}  bytes: {tot/1e6:.2f} MB  con ruta: {named}")
    print(f"rutas duplicadas: {len(dups)}")
    for k,v in list(dups.items())[:8]: print("   ",k,v)
    return 0

if __name__=="__main__":
    sys.exit(main())
