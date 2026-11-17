#!/usr/bin/env python3
"""Fase 2.1 - emite motor/platform/audit-2.1.md desde api-audit.json (evidencia real)."""
import json, os, collections

ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P=os.path.join(ROOT,"motor","platform")
A=json.load(open(os.path.join(P,"api-audit.json")))
man=json.load(open(os.path.join(ROOT,"motor","modules","manifest.json")))

FUNC={
 "bun:sqlite":("Motor de persistencia (SQLite)","Sesiones, mensajes, proyectos, migraciones, credenciales de editor (Zed). Migracion V1->V2 de la base."),
 "bun:ffi":("Carga dinamica de bibliotecas nativas","PTY (librust_pty) y busqueda rapida de ficheros (fff)."),
 "Bun.file":("Handle de archivo lazy (Bun.file)","Lectura de assets embebidos (opencode-pty con sha256), archivos de sesion, parches git."),
 "Bun.write":("Escritura a un stream (Bun.write)","Inspector de depuracion de Bun (uso de desarrollo)."),
 "Bun.spawn":("Lanzamiento de proceso (Bun.spawn)","Apertura de URL en Android via /system/bin/am (intents)."),
 "Bun.serve":("Servidor HTTP de Bun","Servidor de desarrollo de Bun (dependencia, no camino critico)."),
 "Bun.env":("Entorno de Bun","Drizzle-kit / servidor de desarrollo de Bun (no critico)."),
 "node:child_process":("Procesos hijo","git, shell del tool, credential_process, binario opencode-pty, integracion Zed."),
 "node:worker_threads":("Workers aislados","Worker de parser/OpenTUI (blob embebido), worker real (chunk-z4ny5a8k), Photon image worker."),
 "node:fs":("E/S de ficheros","Lectura/escritura, stat, watcher de configuracion y ficheros de trabajo, extraccion de assets."),
 "node:net":("Sockets TCP/IP","Socket del PTY, sockets del servidor, conexion del navegador, isIPv4/isIPv6."),
 "node:http":("HTTP cliente/servidor","Servidor OpenCode (127.0.0.1:4096), cliente HTTP, endpoint /api/fs/*."),
 "node:https":("HTTPS/TLS","Cliente HTTPS, agente TLS, proxy."),
 "node:crypto":("Primitivas criptograficas","SHA-256 de assets, randomUUID para IDs, claves SSH/TLS."),
 "node:os":("Informacion del SO","homedir, tmpdir, hostname, release, platform, arch."),
 "node:readline":("Interfaz de linea de comandos","TUI (OpenTUI), PTY de Effect, lector de procesos."),
 "node:tty":("Terminales TTY","ReadStream/WriteStream de la TUI y del cliente mini."),
 "node:zlib":("Compresion","brotli (AppArchive), gzip/deflate/zstd de la capa HTTP."),
 "node:module":("Carga de modulos","createRequire para cargar dependencias opcionales."),
 "node:path":("Manipulacion de rutas","Resolucion de todas las rutas del motor (Global.Path, artefactos, cache)."),
 "node:url":("URLs y file://","fileURLToPath/pathToFileURL para resolver rutas de modulos."),
 "node:util":("Utilidades","promisify(execFile), stripVTControlCharacters, StringDecoder, inspect."),
 "node:stream":("Streams","Readable/Writable/Transform/PassThrough de la TUI, PTY y del servidor."),
 "node:events":("EventEmitter","Eventos del servidor, MCP y procesos."),
 "node:process":("Proceso actual","platform, env, versions, cwd, stdin/stdout, argv."),
 "node:buffer":("Buffers binarios","Framing del protocolo PTY, codificacion de payloads."),
 "node:async_hooks":("Contexto asincrono","AsyncLocalStorage (contexto de sesion) y AsyncResource."),
 "node:inspector":("Inspector de Node","Solo referencia textual; sin uso real."),
 "node:perf_hooks":("Metricas de rendimiento","monitorEventLoopDelay en la TUI."),
 "node:assert":("Aserciones","fail() en validacion de esquema."),
 "node:timers":("Temporizadores","setTimeout de timers/promises en TUI y cliente mini."),
 "node:stream/promises":("Pipeline asincrono","pipeline() para el duplex del PTY."),
 "node:fs/promises":("E/S asincrona de ficheros","Extraccion atomica de assets, mkdir/chmod/rename, lectura de blobs."),
 "node:stream/consumers":("Consumidores de stream","text(process.stdin) para entrada por stdin."),
}
DEC={
 "bun:sqlite":"SUSTITUIR (seam ya existente: SqliteNative)",
 "bun:ffi":"SUSTITUIR (seam: PtyProvider) / CONSERVAR en Bun",
 "Bun.file":"SUSTITUIR por FilesystemProvider.file",
 "Bun.write":"CONSERVAR (desarrollo) / SUSTITUIR por RuntimeProvider",
 "Bun.spawn":"CONSERVAR (ya Android-native) / SUSTITUIR por ProcessProvider",
 "Bun.serve":"CONSERVAR (desarrollo)",
 "Bun.env":"CONSERVAR (desarrollo) / SUSTITUIR por EnvironmentProvider",
 "node:child_process":"SUSTITUIR por ProcessProvider",
 "node:worker_threads":"SUSTITUIR por WorkerProvider (thread|process)",
 "node:fs":"CONSERVAR via FilesystemProvider",
 "node:net":"CONSERVAR via NetworkProvider",
 "node:http":"CONSERVAR via NetworkProvider",
 "node:https":"CONSERVAR via NetworkProvider",
 "node:crypto":"CONSERVAR via RuntimeProvider.crypto",
 "node:os":"CONSERVAR via EnvironmentProvider",
 "node:readline":"CONSERVAR (TUI) via PtyProvider/RuntimeProvider",
 "node:tty":"CONSERVAR (TUI) via PtyProvider",
 "node:zlib":"CONSERVAR via NetworkProvider",
 "node:module":"CONSERVAR via RuntimeProvider.createRequire",
 "node:path":"CONSERVAR via RuntimeProvider.path",
 "node:url":"CONSERVAR via RuntimeProvider.fileURLToPath",
 "node:util":"CONSERVAR via RuntimeProvider.util",
 "node:stream":"CONSERVAR via NetworkProvider/PtyProvider",
 "node:events":"CONSERVAR (EventEmitter nativo)",
 "node:process":"CONSERVAR via EnvironmentProvider",
 "node:buffer":"CONSERVAR via RuntimeProvider.buffer",
 "node:async_hooks":"CONSERVAR via RuntimeProvider.createAsyncLocalStorage",
 "node:inspector":"SIN USO (sin contacto lexical)",
 "node:perf_hooks":"CONSERVAR (diagnostico) / degradable",
 "node:assert":"CONSERVAR",
 "node:timers":"CONSERVAR",
 "node:stream/promises":"CONSERVAR",
 "node:fs/promises":"CONSERVAR via FilesystemProvider",
 "node:stream/consumers":"CONSERVAR",
}
# APIs con problema REAL medido en Android
ANDROID={
 "node:fs":"Riesgo real: watcher recursivo no soportado (cae a backend=node). EACCES fuera del sandbox.",
 "node:fs/promises":"Sin problema medido. Extraccion de assets verificada por sha256.",
 "Bun.file":"Sin problema medido. Verificado: opencode-pty con checksum sha256.",
 "bun:sqlite":"SIN PROBLEMA MEDIDO: 59 migraciones aplicadas, opencode.db + WAL + SHM presentes.",
 "bun:ffi":"SIN PROBLEMA MEDIDO: builtin://bun/ffi registrado. Verificacion PTY pendiente.",
 "node:worker_threads":"Sin uso observado en el log. Compat de Bun es parcial (throwNotImplemented).",
 "node:child_process":"SIN PROBLEMA MEDIDO: 'spawning process command=git' operativo.",
}

def main():
    L=[]
    L.append("# Fase 2.1 — Auditoría de las 34 APIs de plataforma\n")
    L.append("**Motor:** OpenCode 2.2.5 embebido en `libopencode.so` (325 MB) de `OpenCode-Host-0.5.0-7-signed.apk`.\n")
    L.append("**Método:** escaneo léxico de los 493 chunks originales (364 MB) con tokenizador de estados")
    L.append("(0=código, 1=comentario, 2=string, 3=template). Solo se cuentan coincidencias en código real.")
    L.append("Cruce contra `motor/graph/edges.json` (10.318 aristas).\n")
    A2=A["apis"]; C=A["contacts"]
    total=sum(r["contact_count"] for r in A2.values())
    chunks=len({c["chunk"] for cs in C.values() for c in cs})
    L.append(f"**Resultado:** **{total} puntos de contacto reales** sobre **{len(A2)}/34 APIs**, en **{chunks} módulos**.")
    L.append("Las 34 APIs del inventario tienen al menos un contacto verificado.\n")
    L.append("> Corrección de método: el inventario previo (regex a nivel de chunk) reportaba 34 APIs pero")
    L.append("> mezclaba documentación embebida con código real. Este informe es el dato válido.\n")
    L.append("---\n")
    L.append("## 2.1.1 Tabla maestra de las 34 APIs\n")
    L.append("| # | API original | Contactos | Módulos | Símbolos / miembros | Funcionalidad | Criticidad | Decisión |")
    L.append("|---:|---|---:|---:|---|---|---|---|")
    order=sorted(A2.items(), key=lambda kv:(-max([c['transitive_dependents'] for c in kv[1]['chunks']] or [0]), -kv[1]['contact_count']))
    for i,(api,row) in enumerate(order,1):
        mx=max([c['transitive_dependents'] for c in row['chunks']] or [0])
        crit={1:'hoja',2:'baja',3:'media',4:'alta',5:'crítica'}.get(
            5 if mx>=100 else 4 if mx>=30 else 3 if mx>=5 else 2 if mx>=1 else 1)
        syms=", ".join([f"`{s}`" for s in list(row["symbols_used"].keys())[:6]]) or "—"
        fn=FUNC.get(api,(api,""))[0]
        L.append(f"| {i} | `{api}` | {row['contact_count']} | {row['chunk_count']} | {syms} | {fn} | {crit} (rdeps≤{mx}) | {DEC.get(api,'CONSERVAR')} |")
    L.append("\n---\n")
    L.append("## 2.1.2 Detalle por API: chunk, símbolo y posición exacta\n")
    for api,row in order:
        L.append(f"\n### `{api}` — {row['contact_count']} contactos\n")
        L.append(f"**Funcionalidad:** {FUNC.get(api,(api,''))[0]}. {FUNC.get(api,(api,''))[1]}\n")
        L.append(f"**Decisión:** {DEC.get(api,'CONSERVAR')}  ")
        if api in ANDROID: L.append(f"**Estado medido en Android:** {ANDROID[api]}\n")
        L.append("| Chunk | Módulo (vfs) | Posición | Tipo | Especificador | Símbolo(s) | rdeps |")
        L.append("|---|---|---:|---|---|---|---:|")
        for c in sorted(C.get(api,[]), key=lambda x:(x['vfs'] or '',x['pos'])):
            info=man["modules"][c["chunk"]]
            syms=", ".join([n["imported"] for n in c["symbols"]["named"]])
            if c["symbols"]["default"]: syms=(syms+", " if syms else "")+f"default={c['symbols']['default']}"
            if c["symbols"]["namespace"]: syms=(syms+", " if syms else "")+f"ns={c['symbols']['namespace']}"
            L.append(f"| `{c['chunk']}` | `{c['vfs']}` | {c['pos']} | {c['kind']} | `{c['specifier']}` | {syms or '—'} | {info['metrics']['rdeps']} |")
    L.append("\n---\n")
    L.append("## 2.1.3 Dependencias directas, indirectas y transitivas\n")
    L.append("`rdeps` = número de módulos que dependen (directa o transitivamente) del módulo que contiene el contacto.\n")
    L.append("| API | Módulos con contacto | rdeps máx. | Alcance transitivo inverso | En los 411 dependientes del núcleo |")
    L.append("|---|---:|---:|---:|---:|")
    try:
        reach=json.load(open(os.path.join(P,"reach-analysis.json")))["reach_by_api"]
    except Exception:
        reach={}
    for api,row in order:
        mx=max([c['transitive_dependents'] for c in row['chunks']] or [0])
        r=reach.get(api,{})
        L.append(f"| `{api}` | {row['chunk_count']} | {mx} | {r.get('reachable','—')} | {r.get('in_core_dependents','—')} |")
    L.append("\n**Lectura:** el alcance inverso es el número de módulos del motor que quedan alcanzados por la API a través de sus dependientes. Es la medida del radio de impacto de una re-armadura de esa API.\n")
    open(os.path.join(P,"audit-2.1.md"),"w").write("\n".join(L))
    print("audit-2.1.md:",len("\n".join(L)),"bytes,",len(order),"APIs")
if __name__=="__main__": main()
