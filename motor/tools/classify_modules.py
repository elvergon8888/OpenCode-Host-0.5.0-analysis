#!/usr/bin/env python3
"""
Fase 1 - clasificacion funcional por EVIDENCIA MULTIPLE:
  (a) nombres de export (si existen),
  (b) nombres de los simbolos que el chunk EXPORTA (evidencia directa),
  (c) contenido textual: patrones de dominio,
  (d) plataforma usada (node:fs -> file, bun:ffi -> ffi, etc),
  (e) dependencias: si depende de un chunk tagged X, hereda parte de esa señal.
Prioridad: (a)+(b) > (c) > (d) > (e)
"""
import json, os, re, sys
from collections import defaultdict

ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CHUNKS=os.path.join(ROOT,"bundle","chunks")
GRAPH=os.path.join(ROOT,"motor","graph","edges.json")
MAN=os.path.join(ROOT,"motor","modules","manifest.json")

# (c) patrones de dominio en el contenido -> categoria
DOMAIN=[
 ("provider-layer", r'createOpenaiCompatible|provider\.configure|loadModels|Provider\b.*baseURL|models\.dev|models-dev'),
 ("model-registry", r'\bModel\b.*id:|modelID|modelId|contextWindow|maxOutputTokens|ModelInfo'),
 ("tool", r'toolName|"arguments"|toolCall|ToolPart|toolResult|tool_call'),
 ("session", r'\bSession\b|sessionID|sessionId|session_state'),
 ("message", r'\bMessage\b|messageID|messageId|userMessage|assistantMessage'),
 ("agent", r'AGENT_PRIVILEGES|AgentConfig|subagent|agentName|"build"|"plan"'),
 ("permissions", r'permission|Permission|allow.*deny|ask.*permission'),
 ("auth", r'credential|Credential|OAuth|oauth|apiKey|api_key|AuthMethod'),
 ("mcp", r'Mcp|MCP|mcpServer|mcp\.tool|listTools|tools/list'),
 ("server", r'createServer|listen\(|http\.createServer|ServerProcess|serve\('),
 ("routing", r'route\(|Router|routes\b|matchRoute|pathname'),
 ("config", r'Config|config\.json|opencode\.json|loadConfig'),
 ("event", r'EventBus|publish\(|subscribe\(|EventEmitter'),
 ("pty", r'pty|PTY|terminal|Terminal'),
 ("git", r'git\b|Git\b|commit|checkout'),
 ("lsp", r'LSP|lsp|LanguageServer'),
 ("plugin", r'Plugin|plugin'),
 ("file", r'readFile|writeFile|readdir|glob|ripgrep|\bfs\b'),
 ("logging", r'\blog\b|logger|console\.log'),
 ("cache", r'\bcache\b|Cache'),
 ("websocket", r'WebSocket|websocket|ws\.'),
 ("effect-runtime", r'Effect\b|\bgen\(function\*|ServiceMap|Layer\.'),
 ("snapshot", r'snapshot|Snapshot'),
 ("diff", r'\bdiff\b|unifiedDiff|applyPatch|patch\('),
 ("auth-aws", r'@aws-sdk|CredentialProvider|fromInstanceMetadata'),
]

PLATFORM_CAT=[
 ("ffi", r'bun:ffi'),
 ("sqlite", r'bun:sqlite'),
 ("file", r'node:fs|from"fs"'),
 ("process", r'node:child_process|from"child_process"'),
 ("network", r'node:net|from"net"|node:http|from"http"'),
 ("crypto", r'node:crypto|from"crypto"'),
 ("terminal", r'node:tty|from"tty"|node:readline'),
 ("worker", r'node:worker_threads|from"worker_threads"'),
]

def main():
    man=json.load(open(MAN)); g=json.load(open(GRAPH))
    modules=g["modules"]
    scores=defaultdict(lambda: defaultdict(int))
    evidence=defaultdict(dict)

    for fn,m in modules.items():
        src=open(os.path.join(CHUNKS,fn),encoding="utf-8",errors="replace").read()
        info=man["modules"][fn]
        names=" ".join([e["name"] for e in info["exports"]]+list(info["renames"].values()))
        # (a)+(b) nombres de export -> peso alto
        for cat,pat in DOMAIN:
            if re.search(pat,names):
                scores[fn][cat]+=10
                evidence[fn].setdefault(cat,[]).append("export-nombre")
        # (c) contenido -> peso medio
        for cat,pat in DOMAIN:
            hits=len(re.findall(pat,src))
            if hits:
                scores[fn][cat]+=min(hits,5)*2
                evidence[fn].setdefault(cat,[]).append(f"contenido x{hits}")
        # (d) plataforma
        for cat,pat in PLATFORM_CAT:
            if re.search(pat,src):
                scores[fn][cat]+=4
                evidence[fn].setdefault(cat,[]).append("platform-api")

    # (e) propagacion por dependencias (1 iteracion, peso bajo)
    for fn in list(scores.keys()):
        for d in g["dependency"].get(fn,[]):
            for cat,v in scores.get(d,{}).items():
                scores[fn][cat]+=v*0.25
                evidence[fn].setdefault(cat,[]).append(f"dep:{d}")

    changed=0
    for fn,info in man["modules"].items():
        sc=scores.get(fn,{})
        if not sc:
            info["category"]="unclassified"; info["category_score"]=0; info["category_evidence"]=[]
            continue
        best=max(sc.items(), key=lambda kv: kv[1])
        info["category"]=best[0]
        info["category_score"]=round(best[1],2)
        info["category_evidence"]=sorted(set(evidence[fn].get(best[0],[])))
        info["all_categories"]={k:round(v,2) for k,v in sorted(sc.items(),key=lambda kv:-kv[1])[:5]}
        if info["tags"] and best[0] not in info["tags"]: changed+=1
    json.dump(man,open(MAN,"w"),indent=1)
    from collections import Counter
    c=Counter(i["category"] for i in man["modules"].values())
    print("clasificados con categoria:",sum(1 for i in man["modules"].values() if i["category"]!="unclassified"),"/",len(man["modules"]))
    for k,v in c.most_common(): print(f"  {k:22} {v}")
    return 0

if __name__=="__main__":
    sys.exit(main())
