import json, os, sys
from collections import defaultdict
ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GRAPH=os.path.join(ROOT,"motor","graph","edges.json"); OUT=os.path.join(ROOT,"motor","graph")
def tarjan_scc(nodes, adj):
    index={};low={};on_stack={};stack=[];result=[];counter=0
    for root in nodes:
        if root in index: continue
        work=[(root,0)]
        while work:
            v,pi=work[-1]
            if pi==0:
                index[v]=low[v]=counter;counter+=1;stack.append(v);on_stack[v]=True
            recurse=False
            for i in range(pi,len(adj.get(v,()))):
                w=adj[v][i]
                if w not in index:
                    work[-1]=(v,i+1);work.append((w,0));recurse=True;break
                elif on_stack.get(w): low[v]=min(low[v],index[w])
            if recurse: continue
            if low[v]==index[v]:
                comp=[]
                while True:
                    w=stack.pop();on_stack[w]=False;comp.append(w)
                    if w==v: break
                result.append(comp)
            work.pop()
            if work:
                pv=work[-1][0];low[pv]=min(low[pv],low[v])
    return result
g=json.load(open(GRAPH)); modules=g["modules"]; edges=g["edges"]
adj=defaultdict(list)
for e in edges:
    if e["to"]: adj[e["from"]].append(e["to"])
nodes=sorted(modules.keys()); sccs=tarjan_scc(nodes,adj)
cycles=[]
for comp in sccs:
    if len(comp)>1: cycles.append({"size":len(comp),"members":sorted(comp)})
    else:
        n=comp[0]
        if n in adj and n in adj[n]: cycles.append({"size":1,"self_loop":True,"members":[n]})
cycles.sort(key=lambda c:-c["size"])
scc_id={}
for i,comp in enumerate(sccs):
    for n in comp: scc_id[n]=i
comp_edges=defaultdict(set)
for e in edges:
    if e["to"] and scc_id[e["from"]]!=scc_id[e["to"]]: comp_edges[scc_id[e["from"]]].add(scc_id[e["to"]])
indeg=defaultdict(int)
for a,bs in comp_edges.items():
    for b in bs: indeg[b]+=1
ready=sorted([i for i in range(len(sccs)) if indeg[i]==0]); topo=[]
while ready:
    i=ready.pop(0);topo.append(i)
    for j in sorted(comp_edges.get(i,())):
        indeg[j]-=1
        if indeg[j]==0: ready.append(j);ready.sort()
export_owner=defaultdict(list)
for fn,m in modules.items():
    for ex in m["exports"]: export_owner[ex["exported"]].append({"file":fn,"local":ex["local"],"pos":ex["pos"]})
shared={k:v for k,v in export_owner.items() if len(v)>1}
import_owner=defaultdict(list)
for e in edges:
    for pair in e["named"]: import_owner[pair["imported"]].append({"file":e["from"],"local":pair["local"],"pos":e["pos"]})
shared_import={k:v for k,v in import_owner.items() if len(v)>1}
rdep=g["reverse_dependency"]; metrics={}
for fn in nodes:
    m=modules[fn]
    metrics[fn]={"vfs_path":m["vfs_path"],"bytes":m["bytes"],"exports":len(m["exports"]),
        "imports":len(m["imports"]),"deps":len(set(g["dependency"].get(fn,[]))),
        "rdeps":len(set(rdep.get(fn,[]))),
        "external_imports":sum(1 for e in edges if e["from"]==fn and e["external"]),
        "in_scc":next((c["size"] for c in cycles if fn in c["members"]),1)}
out={"meta":g["meta"],"scc_count":len(sccs),"cycles":cycles,
     "topological_order":[sccs[i] for i in topo],"shared_exports":shared,
     "shared_imports":shared_import,"metrics":metrics}
json.dump(out,open(os.path.join(OUT,"analysis.json"),"w"),indent=1)
print(f"SCCs: {len(sccs)}  ciclos: {len(cycles)}")
print(f"shared_exports: {len(shared)}  shared_imports: {len(shared_import)}")
print("\nTop 15 criticidad (rdeps):")
for fn,mt in sorted(metrics.items(),key=lambda x:-x[1]["rdeps"])[:15]:
    print(f"  rdeps={mt['rdeps']:<4} deps={mt['deps']:<4} exp={mt['exports']:<4} {mt['vfs_path']}")
print("\nTop 12 ciclos:")
for c in cycles[:12]:
    print(f"  size={c['size']}: {', '.join((modules[m]['vfs_path'] or m) for m in c['members'][:5])}")
