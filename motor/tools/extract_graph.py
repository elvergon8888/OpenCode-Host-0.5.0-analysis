#!/usr/bin/env python3
"""
Fase 1 - extractor del grafo de imports/exports de los chunks de OpenCode.
Solo LEE los chunks. No modifica nada.
Salida: motor/graph/edges.json, motor/graph/meta.json
"""
import json, os, re, sys
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CHUNKS_DIR = os.path.join(ROOT, "bundle", "chunks")
INDEX_JSON = os.path.join(ROOT, "bundle", "index.json")
OUT_DIR = os.path.join(ROOT, "motor", "graph")

IMPORT_RE = re.compile(r'import\s*(?P<clause>[^;]*?)\s*from\s*["\'](?P<src>[^"\']+)["\']\s*;')
BARE_IMPORT_RE = re.compile(r'import\s*(?P<clause>[^;]*?)\s*["\'](?P<src>[^"\']+)["\']\s*;')
EXPORT_FROM_RE = re.compile(r'export\s*(?P<star>\*)?\s*(?P<clause>\{[^}]*\})?\s*from\s*["\'](?P<src>[^"\']+)["\']\s*;')
EXPORT_LIST_RE = re.compile(r'export\s*\{(?P<body>[^}]*)\}\s*;')
EXPORT_DECL_RE = re.compile(r'\bexport\s+(?P<kw>const|let|var|function|async\s+function|class)\s+')
EXPORT_PAIR_RE = re.compile(r'(?P<local>[A-Za-z_$][\w$]*)\s+as\s+(?P<exported>[A-Za-z_$][\w$]*)')
NAME_RE = re.compile(r'(?<![\w$.])(?P<name>[A-Za-z_$][\w$]*)(?![\w$])')


def parse_pairs(clause):
    out = []
    for part in clause.split(","):
        part = part.strip()
        if not part: continue
        m = EXPORT_PAIR_RE.fullmatch(part)
        if m:
            out.append((m.group("local"), m.group("exported"))); continue
        m = NAME_RE.fullmatch(part)
        if m:
            out.append((m.group("name"), m.group("name")))
    return out


def parse_import_clause(clause):
    clause = clause.strip()
    if not clause: return [], None, None
    m = re.fullmatch(r'\*\s+as\s+([A-Za-z_$][\w$]*)', clause)
    if m: return [], m.group(1), None
    m = re.fullmatch(r'([A-Za-z_$][\w$]*)(?:\s*,\s*\{(?P<named>[^}]*)\})?', clause)
    if m and not clause.startswith("{"):
        pairs = parse_pairs(m.group("named") or "")
        return pairs, None, m.group(1)
    if clause.startswith("{"):
        return parse_pairs(clause[1:-1]), None, None
    return [], None, None


def main():
    if not os.path.isdir(CHUNKS_DIR):
        print("ERROR: no existe", CHUNKS_DIR); return 1
    os.makedirs(OUT_DIR, exist_ok=True)
    index = json.load(open(INDEX_JSON))
    by_name = {f"chunk_{e['i']:04d}_{e['off']}.js": e for e in index}

    modules, edges = {}, []
    unparsed_imports, unparsed_exports = [], []

    files = sorted(f for f in os.listdir(CHUNKS_DIR) if f.endswith(".js"))
    for fn in files:
        src = open(os.path.join(CHUNKS_DIR, fn), encoding="utf-8", errors="replace").read()
        meta = by_name.get(fn, {})
        node = {"file": fn, "vfs_path": meta.get("path"), "bin_offset": meta.get("off"),
                "bin_len": meta.get("len"), "bytes": len(src.encode("utf-8", errors="replace")),
                "imports": [], "exports": [], "export_decls": [], "re_export_from": []}

        for m in EXPORT_LIST_RE.finditer(src):
            pairs = parse_pairs(m.group("body"))
            if not pairs:
                unparsed_exports.append({"file": fn, "pos": m.start(), "body": m.group("body")[:120]})
            for local, exported in pairs:
                node["exports"].append({"exported": exported, "local": local, "pos": m.start(), "kind": "list"})

        for m in EXPORT_DECL_RE.finditer(src):
            nm = re.match(r'(?:const|let|var|function|async\s+function|class)\s+([A-Za-z_$][\w$]*)', src[m.start():])
            if nm:
                node["export_decls"].append({"name": nm.group(1), "kw": m.group("kw").strip(), "pos": m.start()})

        for m in EXPORT_FROM_RE.finditer(src):
            pairs = parse_pairs(m.group("clause") or "")
            node["re_export_from"].append({"src": m.group("src"), "star": bool(m.group("star")),
                "symbols": [{"local": l, "exported": e} for l, e in pairs], "pos": m.start()})

        seen = set()
        for m in IMPORT_RE.finditer(src):
            seen.add(m.start())
            pairs, ns, default = parse_import_clause(m.group("clause"))
            clause_txt = m.group("clause").strip()
            # "import *as X" es valido (namespace). Solo es unparsed si no encaja
            # con ninguna forma conocida de import.
            known = bool(pairs or ns or default)
            if not known and clause_txt and not re.fullmatch(r'\*\s*as\s*[A-Za-z_$][\w$]*', clause_txt):
                unparsed_imports.append({"file": fn, "pos": m.start(), "clause": clause_txt[:120]})
            node["imports"].append({"src": m.group("src"), "pos": m.start(),
                "named": [{"imported": a, "local": b} for a, b in pairs],
                "namespace": ns, "default": default, "kind": "from"})
        for m in BARE_IMPORT_RE.finditer(src):
            if m.start() in seen: continue
            pre = src[max(0, m.start()-1):m.start()]
            if pre in ('"', "'", "`"): continue
            pairs, ns, default = parse_import_clause(m.group("clause"))
            node["imports"].append({"src": m.group("src"), "pos": m.start(),
                "named": [{"imported": a, "local": b} for a, b in pairs],
                "namespace": ns, "default": default, "kind": "bare"})

        modules[fn] = node

    vfs_to_file = {}
    for fn, meta in by_name.items():
        p = meta.get("path")
        if not p: continue
        # el path puede venir como 'NAME.js' o como '/$bunfs/root/NAME.js'
        base = p.rsplit("/", 1)[-1]
        vfs_to_file.setdefault(p, fn)
        vfs_to_file.setdefault(base, fn)
        vfs_to_file.setdefault("/$bunfs/root/" + base, fn)

    unresolved = []
    for fn, node in modules.items():
        for imp in node["imports"]:
            s = imp["src"]
            if s.startswith("/$bunfs/root/"):
                tgt = s[len("/$bunfs/root/"):]
                if tgt in vfs_to_file:
                    imp["resolved_file"] = vfs_to_file[tgt]
                else:
                    imp["resolved_file"] = None
                    unresolved.append({"from": fn, "src": s, "pos": imp["pos"]}); continue
            elif s.startswith("/$bunfs/"):
                imp["resolved_file"] = None
                unresolved.append({"from": fn, "src": s, "pos": imp["pos"]}); continue
            else:
                imp["resolved_file"] = None; imp["external"] = True
            edges.append({"from": fn, "to": imp.get("resolved_file"), "src": s, "pos": imp["pos"],
                "named": imp["named"], "namespace": imp["namespace"], "default": imp["default"],
                "external": imp.get("external", False)})

    dep, rdep = defaultdict(set), defaultdict(set)
    for e in edges:
        if e["to"]:
            dep[e["from"]].add(e["to"]); rdep[e["to"]].add(e["from"])

    out = {"meta": {"chunks": len(modules), "edges": len(edges),
        "internal_edges": sum(1 for e in edges if e["to"]),
        "external_edges": sum(1 for e in edges if e["external"]),
        "unresolved": len(unresolved)},
        "modules": modules, "edges": edges, "unresolved": unresolved,
        "unparsed_imports": unparsed_imports, "unparsed_exports": unparsed_exports,
        "dependency": {k: sorted(v) for k, v in dep.items()},
        "reverse_dependency": {k: sorted(v) for k, v in rdep.items()}}
    json.dump(out, open(os.path.join(OUT_DIR, "edges.json"), "w"), indent=1)
    json.dump(out["meta"], open(os.path.join(OUT_DIR, "meta.json"), "w"), indent=1)
    print(json.dumps(out["meta"], indent=1))
    print("unparsed_imports:", len(unparsed_imports), "unparsed_exports:", len(unparsed_exports))
    return 0

if __name__ == "__main__":
    sys.exit(main())
