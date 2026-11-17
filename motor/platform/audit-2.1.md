# Fase 2.1 — Auditoría de las 34 APIs de plataforma

**Motor:** OpenCode 2.2.5 embebido en `libopencode.so` (325 MB) de `OpenCode-Host-0.5.0-7-signed.apk`.

**Método:** escaneo léxico de los 493 chunks originales (364 MB) con tokenizador de estados
(0=código, 1=comentario, 2=string, 3=template). Solo se cuentan coincidencias en código real.
Cruce contra `motor/graph/edges.json` (10.318 aristas).

**Resultado:** **565 puntos de contacto reales** sobre **34/34 APIs**, en **114 módulos**.
Las 34 APIs del inventario tienen al menos un contacto verificado.

> Corrección de método: el inventario previo (regex a nivel de chunk) reportaba 34 APIs pero
> mezclaba documentación embebida con código real. Este informe es el dato válido.

---

## 2.1.1 Tabla maestra de las 34 APIs

| # | API original | Contactos | Módulos | Símbolos / miembros | Funcionalidad | Criticidad | Decisión |
|---:|---|---:|---:|---|---|---|---|
| 1 | `node:path` | 171 | 61 | `join`, `dirname`, `isAbsolute`, `basename`, `resolve`, `sep` | Manipulacion de rutas | crítica (rdeps≤102) | CONSERVAR via RuntimeProvider.path |
| 2 | `node:os` | 67 | 50 | `EOL`, `homedir`, `tmpdir`, `release`, `userInfo` | Informacion del SO | crítica (rdeps≤102) | CONSERVAR via EnvironmentProvider |
| 3 | `node:fs` | 61 | 28 | `existsSync`, `constants`, `readFileSync`, `realpathSync`, `statSync`, `lstatSync` | E/S de ficheros | crítica (rdeps≤102) | CONSERVAR via FilesystemProvider |
| 4 | `node:crypto` | 35 | 21 | `createHash`, `randomUUID`, `randomBytes`, `createPrivateKey`, `createPublicKey`, `sign` | Primitivas criptograficas | crítica (rdeps≤102) | CONSERVAR via RuntimeProvider.crypto |
| 5 | `node:url` | 27 | 19 | `fileURLToPath`, `pathToFileURL` | URLs y file:// | crítica (rdeps≤102) | CONSERVAR via RuntimeProvider.fileURLToPath |
| 6 | `node:buffer` | 9 | 9 | `Buffer`, `isUtf8` | Buffers binarios | alta (rdeps≤95) | CONSERVAR via RuntimeProvider.buffer |
| 7 | `node:stream` | 12 | 7 | `Readable`, `Writable`, `finished`, `PassThrough`, `Transform`, `pipeline` | Streams | alta (rdeps≤63) | CONSERVAR via NetworkProvider/PtyProvider |
| 8 | `node:worker_threads` | 3 | 3 | `parentPort` | Workers aislados | alta (rdeps≤63) | SUSTITUIR por WorkerProvider (thread|process) |
| 9 | `node:net` | 6 | 6 | `isIPv4`, `isIPv6` | Sockets TCP/IP | alta (rdeps≤55) | CONSERVAR via NetworkProvider |
| 10 | `node:https` | 3 | 2 | — | HTTPS/TLS | alta (rdeps≤55) | CONSERVAR via NetworkProvider |
| 11 | `node:fs/promises` | 64 | 30 | `readFile`, `open`, `mkdir`, `writeFile`, `stat`, `rename` | E/S asincrona de ficheros | alta (rdeps≤52) | CONSERVAR via FilesystemProvider |
| 12 | `node:util` | 13 | 9 | `promisify`, `isDeepStrictEqual`, `stripVTControlCharacters`, `StringDecoder` | Utilidades | alta (rdeps≤52) | CONSERVAR via RuntimeProvider.util |
| 13 | `node:events` | 6 | 4 | `EventEmitter`, `once`, `setMaxListeners` | EventEmitter | alta (rdeps≤52) | CONSERVAR (EventEmitter nativo) |
| 14 | `node:async_hooks` | 3 | 3 | `AsyncLocalStorage`, `AsyncResource` | Contexto asincrono | media (rdeps≤23) | CONSERVAR via RuntimeProvider.createAsyncLocalStorage |
| 15 | `node:process` | 7 | 3 | `stdin`, `stdout`, `cwd` | Proceso actual | media (rdeps≤9) | CONSERVAR via EnvironmentProvider |
| 16 | `node:readline` | 4 | 3 | `createInterface` | Interfaz de linea de comandos | media (rdeps≤9) | CONSERVAR (TUI) via PtyProvider/RuntimeProvider |
| 17 | `node:tty` | 3 | 2 | `ReadStream`, `WriteStream` | Terminales TTY | media (rdeps≤9) | CONSERVAR (TUI) via PtyProvider |
| 18 | `node:module` | 7 | 6 | `createRequire` | Carga de modulos | media (rdeps≤8) | CONSERVAR via RuntimeProvider.createRequire |
| 19 | `node:child_process` | 14 | 8 | `spawn`, `execFile`, `exec`, `execFileSync` | Procesos hijo | media (rdeps≤7) | SUSTITUIR por ProcessProvider |
| 20 | `node:stream/promises` | 3 | 2 | `pipeline`, `finished` | Pipeline asincrono | media (rdeps≤7) | CONSERVAR |
| 21 | `node:zlib` | 2 | 2 | `brotliDecompressSync` | Compresion | media (rdeps≤7) | CONSERVAR via NetworkProvider |
| 22 | `bun:ffi` | 3 | 2 | `FFIType`, `dlopen`, `ptr`, `JSCallback`, `CString`, `read` | Carga dinamica de bibliotecas nativas | media (rdeps≤6) | SUSTITUIR (seam: PtyProvider) / CONSERVAR en Bun |
| 23 | `bun:sqlite` | 2 | 2 | `Database` | Motor de persistencia (SQLite) | media (rdeps≤6) | SUSTITUIR (seam ya existente: SqliteNative) |
| 24 | `node:assert` | 1 | 1 | — | Aserciones | media (rdeps≤6) | CONSERVAR |
| 25 | `Bun.file` | 13 | 5 | — | Handle de archivo lazy (Bun.file) | baja (rdeps≤4) | SUSTITUIR por FilesystemProvider.file |
| 26 | `node:http` | 4 | 3 | — | HTTP cliente/servidor | baja (rdeps≤3) | CONSERVAR via NetworkProvider |
| 27 | `Bun.serve` | 8 | 1 | — | Servidor HTTP de Bun | baja (rdeps≤2) | CONSERVAR (desarrollo) |
| 28 | `Bun.write` | 7 | 1 | — | Escritura a un stream (Bun.write) | baja (rdeps≤2) | CONSERVAR (desarrollo) / SUSTITUIR por RuntimeProvider |
| 29 | `Bun.env` | 2 | 1 | — | Entorno de Bun | baja (rdeps≤2) | CONSERVAR (desarrollo) / SUSTITUIR por EnvironmentProvider |
| 30 | `Bun.spawn` | 1 | 1 | — | Lanzamiento de proceso (Bun.spawn) | baja (rdeps≤2) | CONSERVAR (ya Android-native) / SUSTITUIR por ProcessProvider |
| 31 | `node:stream/consumers` | 1 | 1 | `text` | Consumidores de stream | baja (rdeps≤2) | CONSERVAR |
| 32 | `node:timers` | 2 | 2 | `setTimeout` | Temporizadores | hoja (rdeps≤0) | CONSERVAR |
| 33 | `node:perf_hooks` | 1 | 1 | `monitorEventLoopDelay` | Metricas de rendimiento | hoja (rdeps≤0) | CONSERVAR (diagnostico) / degradable |
| 34 | `node:inspector` | 0 | 0 | — | Inspector de Node | hoja (rdeps≤0) | SIN USO (sin contacto lexical) |

---

## 2.1.2 Detalle por API: chunk, símbolo y posición exacta


### `node:path` — 171 contactos

**Funcionalidad:** Manipulacion de rutas. Resolucion de todas las rutas del motor (Global.Path, artefactos, cache).

**Decisión:** CONSERVAR via RuntimeProvider.path  
| Chunk | Módulo (vfs) | Posición | Tipo | Especificador | Símbolo(s) | rdeps |
|---|---|---:|---|---|---|---:|
| `chunk_orphan_k7raz5np.js` | `None` | 2181 | esm | `path` | — | 0 |
| `chunk_0275_272410430.js` | `chunk-09yx2ges.js` | 22217 | esm | `path` | join | 0 |
| `chunk_0275_272410430.js` | `chunk-09yx2ges.js` | 22440 | esm | `path` | isAbsolute, join | 0 |
| `chunk_0275_272410430.js` | `chunk-09yx2ges.js` | 153525 | esm | `path` | — | 0 |
| `chunk_0275_272410430.js` | `chunk-09yx2ges.js` | 305406 | esm | `path` | — | 0 |
| `chunk_0275_272410430.js` | `chunk-09yx2ges.js` | 305452 | esm | `path` | — | 0 |
| `chunk_0275_272410430.js` | `chunk-09yx2ges.js` | 305546 | esm | `path` | — | 0 |
| `chunk_0275_272410430.js` | `chunk-09yx2ges.js` | 305614 | esm | `path` | — | 0 |
| `chunk_0131_123734518.js` | `chunk-0hfmf8xt.js` | 320 | esm | `path` | — | 2 |
| `chunk_0131_123734518.js` | `chunk-0hfmf8xt.js` | 507 | esm | `path` | — | 2 |
| `chunk_0422_280427249.js` | `chunk-0kzp4zq9.js` | 1779 | esm | `path` | — | 0 |
| `chunk_0421_280391868.js` | `chunk-0sx5r3nk.js` | 2200 | esm | `path` | — | 0 |
| `chunk_0141_124114100.js` | `chunk-0w16pvg0.js` | 2568 | esm | `path` | — | 33 |
| `chunk_0209_179311894.js` | `chunk-0wk6f84s.js` | 9705 | esm | `path` | basename, dirname, join | 49 |
| `chunk_0399_276904401.js` | `chunk-1etnrgwc.js` | 2354 | esm | `path` | — | 0 |
| `chunk_0445_283263947.js` | `chunk-1jgc1qk1.js` | 1972 | esm | `path` | — | 0 |
| `chunk_0445_283263947.js` | `chunk-1jgc1qk1.js` | 2079 | esm | `path` | — | 0 |
| `chunk_0143_124152677.js` | `chunk-1pedmecm.js` | 1 | esm | `path` | — | 44 |
| `chunk_0448_287913187.js` | `chunk-210v0c6c.js` | 9883 | esm | `path` | — | 0 |
| `chunk_0155_145459483.js` | `chunk-2kb25nvv.js` | 1788 | esm | `path` | — | 6 |
| `chunk_0155_145459483.js` | `chunk-2kb25nvv.js` | 3062 | esm | `path` | — | 6 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 153 | esm | `path` | basename, dirname | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 420 | esm | `path` | basename, dirname, isAbsolute, join, parse, relative, resolve, sep | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 551 | esm | `path` | — | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 668 | esm | `path` | dirname, join, relative, sep | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 841 | esm | `path` | dirname, isAbsolute, join, resolve | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 945 | esm | `path` | basename, dirname, join, resolve | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 1287 | esm | `path` | — | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 1495 | esm | `path` | delimiter, join, resolve | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 1639 | esm | `path` | — | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 1908 | esm | `path` | basename, dirname, isAbsolute, join | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 2144 | esm | `path` | join | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 2174 | esm | `path` | basename, dirname, isAbsolute, join, relative, sep | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 2348 | esm | `path` | isAbsolute, sep | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 2445 | esm | `path` | basename, dirname, join | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 2506 | esm | `path` | basename, join | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 2592 | esm | `path` | dirname, join | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 2637 | esm | `path` | basename, dirname | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 2766 | esm | `path` | dirname, join | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 2848 | esm | `path` | basename, join | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 3500 | esm | `path` | basename, join | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 3601 | esm | `path` | isAbsolute, join, relative, sep | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 3710 | esm | `path` | join | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 3739 | esm | `path` | resolve | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 3772 | esm | `path` | join | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 3801 | esm | `path` | dirname | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 4030 | esm | `path` | basename, dirname, join, resolve | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 4140 | esm | `path` | join | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 4201 | esm | `path` | basename, dirname, join, resolve | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 4274 | esm | `path` | join | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 4513 | esm | `path` | isAbsolute | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 4548 | esm | `path` | posix, win32 | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 4590 | esm | `path` | posix, win32 | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 4981 | esm | `path` | dirname, isAbsolute, join, posix, resolve, sep, win32 | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 5485 | esm | `path` | join | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 5635 | esm | `path` | isAbsolute, relative, resolve, sep | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 5854 | esm | `path` | join | 0 |
| `chunk_0005_101349743.js` | `chunk-2s7rxcdz.js` | 5240 | esm | `path` | — | 6 |
| `chunk_0005_101349743.js` | `chunk-2s7rxcdz.js` | 5391 | esm | `path` | dirname, join | 6 |
| `chunk_0005_101349743.js` | `chunk-2s7rxcdz.js` | 25886 | esm | `path` | — | 6 |
| `chunk_0005_101349743.js` | `chunk-2s7rxcdz.js` | 32771 | esm | `path` | — | 6 |
| `chunk_0005_101349743.js` | `chunk-2s7rxcdz.js` | 36804 | esm | `path` | — | 6 |
| `chunk_0067_108811803.js` | `chunk-37zemjkn.js` | 410 | esm | `path` | dirname, join | 3 |
| `chunk_0414_279324085.js` | `chunk-3pvznm75.js` | 49016 | esm | `path` | — | 0 |
| `chunk_0203_174448085.js` | `chunk-4kcbhaah.js` | 407 | esm | `path` | — | 11 |
| `chunk_0184_159152165.js` | `chunk-4vhm3wje.js` | 882 | esm | `path` | — | 52 |
| `chunk_0184_159152165.js` | `chunk-4vhm3wje.js` | 2579 | esm | `path` | — | 52 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 6124 | esm | `path` | — | 4 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 8404 | esm | `path` | — | 4 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 45028 | esm | `path` | — | 4 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 82477 | esm | `path` | — | 4 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 85404 | esm | `path` | — | 4 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 97058 | esm | `path` | — | 4 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 100348 | esm | `path` | — | 4 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 107698 | esm | `path` | — | 4 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 146360 | esm | `path` | — | 4 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 146492 | esm | `path` | — | 4 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 151589 | esm | `path` | — | 4 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 156486 | esm | `path` | — | 4 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 162347 | esm | `path` | — | 4 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 162582 | esm | `path` | — | 4 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 198751 | esm | `path` | — | 4 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 198920 | esm | `path` | — | 4 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 211045 | esm | `path` | — | 4 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 224144 | esm | `path` | — | 4 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 232363 | esm | `path` | — | 4 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 232698 | esm | `path` | — | 4 |
| `chunk_0117_122736465.js` | `chunk-5dvx5qt8.js` | 255 | esm | `path` | — | 2 |
| `chunk_0152_145359137.js` | `chunk-68qvjkq9.js` | 169 | esm | `path` | — | 8 |
| `chunk_0001_54753417.js` | `chunk-7gtsct90.js` | 823602 | esm | `node:path` | — | 2 |
| `chunk_0001_54753417.js` | `chunk-7gtsct90.js` | 968290 | esm | `node:path` | — | 2 |
| `chunk_0282_273232788.js` | `chunk-7q2shk67.js` | 2519 | esm | `path` | — | 0 |
| `chunk_0029_106192038.js` | `chunk-82masma7.js` | 901 | dynamic-import | `path` | — | 4 |
| `chunk_0126_123538032.js` | `chunk-8g8r3vrh.js` | 576 | esm | `path` | isAbsolute, join | 8 |
| `chunk_0266_240181111.js` | `chunk-9f4f8etn.js` | 173056 | esm | `path` | — | 0 |
| `chunk_0266_240181111.js` | `chunk-9f4f8etn.js` | 183887 | esm | `path` | — | 0 |
| `chunk_0266_240181111.js` | `chunk-9f4f8etn.js` | 188177 | esm | `path` | — | 0 |
| `chunk_0266_240181111.js` | `chunk-9f4f8etn.js` | 188304 | esm | `path` | — | 0 |
| `chunk_0266_240181111.js` | `chunk-9f4f8etn.js` | 188462 | esm | `path` | — | 0 |
| `chunk_0266_240181111.js` | `chunk-9f4f8etn.js` | 192428 | esm | `path` | — | 0 |
| `chunk_0266_240181111.js` | `chunk-9f4f8etn.js` | 231599 | esm | `path` | dirname, join, default=ru | 0 |
| `chunk_0266_240181111.js` | `chunk-9f4f8etn.js` | 261102 | esm | `path` | — | 0 |
| `chunk_0266_240181111.js` | `chunk-9f4f8etn.js` | 8506153 | esm | `path` | — | 0 |
| `chunk_0266_240181111.js` | `chunk-9f4f8etn.js` | 8508810 | esm | `path` | — | 0 |
| `chunk_0266_240181111.js` | `chunk-9f4f8etn.js` | 8512364 | esm | `path` | — | 0 |
| `chunk_0266_240181111.js` | `chunk-9f4f8etn.js` | 8697929 | dynamic-import | `path` | — | 0 |
| `chunk_0266_240181111.js` | `chunk-9f4f8etn.js` | 8699457 | dynamic-import | `path` | — | 0 |
| `chunk_0266_240181111.js` | `chunk-9f4f8etn.js` | 8944034 | esm | `path` | — | 0 |
| `chunk_0266_240181111.js` | `chunk-9f4f8etn.js` | 8951535 | esm | `path` | — | 0 |
| `chunk_0151_145327003.js` | `chunk-9ykqvmfb.js` | 157 | esm | `path` | — | 4 |
| `chunk_0151_145327003.js` | `chunk-9ykqvmfb.js` | 806 | esm | `path` | — | 4 |
| `chunk_0180_158232507.js` | `chunk-ardh484r.js` | 3487 | esm | `path` | — | 2 |
| `chunk_0194_162637971.js` | `chunk-b2jd3xca.js` | 72373 | esm | `path` | — | 50 |
| `chunk_0196_162807342.js` | `chunk-bj997enm.js` | 53 | esm | `path` | — | 5 |
| `chunk_0082_114609660.js` | `chunk-cczztrvs.js` | 282 | esm | `path` | — | 16 |
| `chunk_0186_159452129.js` | `chunk-ctfvsqfc.js` | 418 | esm | `path` | — | 58 |
| `chunk_0449_293706614.js` | `chunk-cwfnnp1q.js` | 7143 | esm | `path` | — | 0 |
| `chunk_0449_293706614.js` | `chunk-cwfnnp1q.js` | 20693 | esm | `path` | — | 0 |
| `chunk_0449_293706614.js` | `chunk-cwfnnp1q.js` | 63494 | esm | `path` | — | 0 |
| `chunk_0449_293706614.js` | `chunk-cwfnnp1q.js` | 69468 | esm | `path` | — | 0 |
| `chunk_0449_293706614.js` | `chunk-cwfnnp1q.js` | 78971 | esm | `path` | — | 0 |
| `chunk_0449_293706614.js` | `chunk-cwfnnp1q.js` | 79650 | esm | `path` | — | 0 |
| `chunk_0449_293706614.js` | `chunk-cwfnnp1q.js` | 82054 | esm | `path` | — | 0 |
| `chunk_0449_293706614.js` | `chunk-cwfnnp1q.js` | 82085 | esm | `path` | — | 0 |
| `chunk_0449_293706614.js` | `chunk-cwfnnp1q.js` | 83285 | esm | `path` | — | 0 |
| `chunk_0449_293706614.js` | `chunk-cwfnnp1q.js` | 182350 | esm | `path` | — | 0 |
| `chunk_0449_293706614.js` | `chunk-cwfnnp1q.js` | 235330 | esm | `path` | win32 | 0 |
| `chunk_0415_279578417.js` | `chunk-d8vsw18n.js` | 355 | esm | `path` | — | 0 |
| `chunk_0191_161918564.js` | `chunk-dpsr58v2.js` | 377 | esm | `path` | — | 68 |
| `chunk_0191_161918564.js` | `chunk-dpsr58v2.js` | 451 | esm | `path` | — | 68 |
| `chunk_0153_145377358.js` | `chunk-gx66ket5.js` | 1 | esm | `path` | — | 7 |
| `chunk_0010_101934621.js` | `chunk-hergse29.js` | 10823 | esm | `path` | — | 3 |
| `chunk_0010_101934621.js` | `chunk-hergse29.js` | 12386 | esm | `path` | — | 3 |
| `chunk_0218_188656639.js` | `chunk-hn275w5h.js` | 777 | esm | `path` | — | 102 |
| `chunk_0218_188656639.js` | `chunk-hn275w5h.js` | 8981 | esm | `path` | — | 102 |
| `chunk_0211_185839942.js` | `chunk-j5dn57yp.js` | 218 | esm | `path` | dirname, isAbsolute, resolve | 8 |
| `chunk_0211_185839942.js` | `chunk-j5dn57yp.js` | 349 | esm | `path` | isAbsolute, join | 8 |
| `chunk_0211_185839942.js` | `chunk-j5dn57yp.js` | 485 | esm | `path` | basename, join | 8 |
| `chunk_0405_277227410.js` | `chunk-k7raz5np.js` | 2181 | esm | `path` | — | 3 |
| `chunk_0263_213351226.js` | `chunk-kb1j967y.js` | 853 | esm | `path` | join, dirname, basename | 0 |
| `chunk_0132_123829620.js` | `chunk-kfqh5r0n.js` | 137 | esm | `path` | — | 3 |
| `chunk_0187_161308469.js` | `chunk-mes56ye5.js` | 150809 | esm | `path` | dirname, isAbsolute, join, relative, sep, default=Ei | 52 |
| `chunk_0187_161308469.js` | `chunk-mes56ye5.js` | 152082 | esm | `path` | posix, win32 | 52 |
| `chunk_0107_118257543.js` | `chunk-mwgp5jzm.js` | 53 | esm | `path` | — | 3 |
| `chunk_0403_277022637.js` | `chunk-myg6fkx3.js` | 1095 | esm | `path` | — | 0 |
| `chunk_0223_188934803.js` | `chunk-n6tj7rny.js` | 187 | esm | `path` | — | 4 |
| `chunk_0108_118284793.js` | `chunk-n7kh9ry5.js` | 360 | esm | `path` | — | 2 |
| `chunk_0181_158268415.js` | `chunk-p7np38cq.js` | 283 | esm | `path` | — | 46 |
| `chunk_0431_280633797.js` | `chunk-qqwf27h4.js` | 1976 | esm | `path` | — | 0 |
| `chunk_0080_114439853.js` | `chunk-s95j0csq.js` | 30853 | esm | `path` | isAbsolute, join | 6 |
| `chunk_0080_114439853.js` | `chunk-s95j0csq.js` | 63063 | esm | `path` | — | 6 |
| `chunk_0182_158519933.js` | `chunk-t6qpsd35.js` | 872 | esm | `path` | — | 50 |
| `chunk_0182_158519933.js` | `chunk-t6qpsd35.js` | 23243 | esm | `path` | — | 50 |
| `chunk_0436_280777742.js` | `chunk-tc7326nq.js` | 2126 | esm | `path` | — | 0 |
| `chunk_0144_124321148.js` | `chunk-thb6qhb7.js` | 2418 | esm | `path` | join | 2 |
| `chunk_0418_280256301.js` | `chunk-vf9agke5.js` | 2544 | esm | `path` | — | 0 |
| `chunk_0438_282978362.js` | `chunk-wrkxptbf.js` | 104256 | esm | `path` | isAbsolute, join, resolve | 0 |
| `chunk_0438_282978362.js` | `chunk-wrkxptbf.js` | 107798 | esm | `path` | — | 0 |
| `chunk_0438_282978362.js` | `chunk-wrkxptbf.js` | 111569 | esm | `path` | isAbsolute, resolve | 0 |
| `chunk_0163_146135716.js` | `chunk-xahy38ty.js` | 24 | esm | `path` | — | 2 |
| `chunk_0163_146135716.js` | `chunk-xahy38ty.js` | 156 | esm | `path` | — | 2 |
| `chunk_0267_249458502.js` | `chunk-xnkmks1t.js` | 3821 | esm | `path` | — | 0 |
| `chunk_0267_249458502.js` | `chunk-xnkmks1t.js` | 5185 | esm | `path` | — | 0 |
| `chunk_0447_287383431.js` | `chunk-xw18w92h.js` | 1399 | esm | `path` | dirname | 0 |
| `chunk_0183_158860009.js` | `chunk-yz2mc1mb.js` | 716 | esm | `path` | — | 49 |
| `chunk_0162_146005971.js` | `chunk-zekm22vp.js` | 212 | esm | `path` | — | 4 |
| `chunk_0079_113208595.js` | `chunk-zwsvre1a.js` | 1724 | esm | `path` | — | 13 |
| `chunk_0079_113208595.js` | `chunk-zwsvre1a.js` | 1946 | esm | `path` | — | 13 |
| `chunk_0079_113208595.js` | `chunk-zwsvre1a.js` | 3760 | esm | `path` | — | 13 |
| `chunk_0079_113208595.js` | `chunk-zwsvre1a.js` | 3871 | esm | `path` | — | 13 |
| `chunk_0079_113208595.js` | `chunk-zwsvre1a.js` | 30022 | esm | `path` | — | 13 |

### `node:os` — 67 contactos

**Funcionalidad:** Informacion del SO. homedir, tmpdir, hostname, release, platform, arch.

**Decisión:** CONSERVAR via EnvironmentProvider  
| Chunk | Módulo (vfs) | Posición | Tipo | Especificador | Símbolo(s) | rdeps |
|---|---|---:|---|---|---|---:|
| `chunk_orphan_k7raz5np.js` | `None` | 2207 | esm | `os` | EOL | 0 |
| `chunk_orphan_k7raz5np.js` | `None` | 2350 | esm | `os` | EOL | 0 |
| `chunk_0275_272410430.js` | `chunk-09yx2ges.js` | 305476 | esm | `os` | — | 0 |
| `chunk_0275_272410430.js` | `chunk-09yx2ges.js` | 305570 | esm | `os` | — | 0 |
| `chunk_0275_272410430.js` | `chunk-09yx2ges.js` | 305638 | esm | `os` | — | 0 |
| `chunk_0131_123734518.js` | `chunk-0hfmf8xt.js` | 302 | esm | `os` | — | 2 |
| `chunk_0131_123734518.js` | `chunk-0hfmf8xt.js` | 489 | esm | `os` | — | 2 |
| `chunk_0422_280427249.js` | `chunk-0kzp4zq9.js` | 1754 | esm | `os` | EOL | 0 |
| `chunk_0421_280391868.js` | `chunk-0sx5r3nk.js` | 2175 | esm | `os` | EOL | 0 |
| `chunk_0141_124114100.js` | `chunk-0w16pvg0.js` | 602 | esm | `os` | EOL | 33 |
| `chunk_0399_276904401.js` | `chunk-1etnrgwc.js` | 2329 | esm | `os` | EOL | 0 |
| `chunk_0448_287913187.js` | `chunk-210v0c6c.js` | 9861 | esm | `os` | — | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 390 | esm | `os` | homedir | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 915 | esm | `os` | homedir | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 1465 | esm | `os` | homedir | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 1609 | esm | `os` | release | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 1660 | esm | `os` | — | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 4170 | esm | `os` | homedir | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 4937 | esm | `os` | homedir, tmpdir | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 5455 | esm | `os` | homedir | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 5552 | esm | `os` | homedir, userInfo | 0 |
| `chunk_0005_101349743.js` | `chunk-2s7rxcdz.js` | 32752 | esm | `os` | — | 6 |
| `chunk_0402_276944482.js` | `chunk-2zhxbds0.js` | 1683 | esm | `os` | EOL | 0 |
| `chunk_0067_108811803.js` | `chunk-37zemjkn.js` | 381 | esm | `os` | homedir | 3 |
| `chunk_0401_276932136.js` | `chunk-3kj2qpzg.js` | 1891 | esm | `os` | EOL | 0 |
| `chunk_0432_280648960.js` | `chunk-4s5cgpts.js` | 1614 | esm | `os` | EOL | 0 |
| `chunk_0398_276874539.js` | `chunk-58nayx9p.js` | 2044 | esm | `os` | EOL | 0 |
| `chunk_0117_122736465.js` | `chunk-5dvx5qt8.js` | 237 | esm | `os` | — | 2 |
| `chunk_0408_277341288.js` | `chunk-6emkm07f.js` | 1891 | esm | `os` | EOL | 0 |
| `chunk_0440_283189215.js` | `chunk-76dxkyre.js` | 1925 | esm | `os` | EOL | 0 |
| `chunk_0397_276839987.js` | `chunk-7p35mz6d.js` | 1904 | esm | `os` | EOL | 0 |
| `chunk_0029_106192038.js` | `chunk-82masma7.js` | 873 | dynamic-import | `os` | — | 4 |
| `chunk_0126_123538032.js` | `chunk-8g8r3vrh.js` | 546 | esm | `os` | homedir | 8 |
| `chunk_0429_280582280.js` | `chunk-8nzvg1cy.js` | 1891 | esm | `os` | EOL | 0 |
| `chunk_0266_240181111.js` | `chunk-9f4f8etn.js` | 8699489 | dynamic-import | `os` | — | 0 |
| `chunk_0266_240181111.js` | `chunk-9f4f8etn.js` | 8951516 | esm | `os` | — | 0 |
| `chunk_0196_162807342.js` | `chunk-bj997enm.js` | 73 | esm | `os` | — | 5 |
| `chunk_0186_159452129.js` | `chunk-ctfvsqfc.js` | 438 | esm | `os` | — | 58 |
| `chunk_0449_293706614.js` | `chunk-cwfnnp1q.js` | 8075 | esm | `os` | release | 0 |
| `chunk_0449_293706614.js` | `chunk-cwfnnp1q.js` | 20664 | esm | `os` | tmpdir | 0 |
| `chunk_0449_293706614.js` | `chunk-cwfnnp1q.js` | 182371 | esm | `os` | EOL, tmpdir | 0 |
| `chunk_0411_277425674.js` | `chunk-dgv8sqv5.js` | 2037 | esm | `os` | EOL | 0 |
| `chunk_0191_161918564.js` | `chunk-dpsr58v2.js` | 415 | esm | `os` | — | 68 |
| `chunk_0191_161918564.js` | `chunk-dpsr58v2.js` | 433 | esm | `os` | — | 68 |
| `chunk_0396_276819691.js` | `chunk-dtzr4w9n.js` | 1936 | esm | `os` | EOL | 0 |
| `chunk_0104_118238445.js` | `chunk-e34sfbe5.js` | 388 | esm | `os` | EOL | 6 |
| `chunk_0430_280603320.js` | `chunk-ebjv6219.js` | 1891 | esm | `os` | EOL | 0 |
| `chunk_0439_283164357.js` | `chunk-gar0ypmm.js` | 1887 | esm | `os` | EOL | 0 |
| `chunk_0425_280495388.js` | `chunk-gp08n9pr.js` | 1642 | esm | `os` | EOL | 0 |
| `chunk_0218_188656639.js` | `chunk-hn275w5h.js` | 755 | esm | `os` | — | 102 |
| `chunk_0407_277323062.js` | `chunk-j48c4w8h.js` | 1967 | esm | `os` | EOL | 0 |
| `chunk_0442_283233921.js` | `chunk-j92v9vnb.js` | 1950 | esm | `os` | EOL | 0 |
| `chunk_0405_277227410.js` | `chunk-k7raz5np.js` | 2207 | esm | `os` | EOL | 3 |
| `chunk_0405_277227410.js` | `chunk-k7raz5np.js` | 2350 | esm | `os` | EOL | 3 |
| `chunk_0388_276732867.js` | `chunk-n2m5v4sw.js` | 1679 | esm | `os` | EOL | 0 |
| `chunk_0108_118284793.js` | `chunk-n7kh9ry5.js` | 335 | esm | `os` | EOL | 2 |
| `chunk_0420_280347800.js` | `chunk-p636j4am.js` | 1891 | esm | `os` | EOL | 0 |
| `chunk_0400_276918402.js` | `chunk-qk8ayt8f.js` | 1683 | esm | `os` | EOL | 0 |
| `chunk_0431_280633797.js` | `chunk-qqwf27h4.js` | 1951 | esm | `os` | EOL | 0 |
| `chunk_0427_280541020.js` | `chunk-r10780dt.js` | 2139 | esm | `os` | EOL | 0 |
| `chunk_0424_280464296.js` | `chunk-rayx4d11.js` | 1944 | esm | `os` | EOL | 0 |
| `chunk_0433_280669464.js` | `chunk-rpsd686b.js` | 1891 | esm | `os` | EOL | 0 |
| `chunk_0426_280512856.js` | `chunk-srd481br.js` | 1891 | esm | `os` | EOL | 0 |
| `chunk_0144_124321148.js` | `chunk-thb6qhb7.js` | 2389 | esm | `os` | homedir | 2 |
| `chunk_0163_146135716.js` | `chunk-xahy38ty.js` | 307 | esm | `os` | — | 2 |
| `chunk_0423_280442400.js` | `chunk-y9pk5kh7.js` | 1921 | esm | `os` | EOL | 0 |
| `chunk_0079_113208595.js` | `chunk-zwsvre1a.js` | 1927 | esm | `os` | — | 13 |

### `node:fs` — 61 contactos

**Funcionalidad:** E/S de ficheros. Lectura/escritura, stat, watcher de configuracion y ficheros de trabajo, extraccion de assets.

**Decisión:** CONSERVAR via FilesystemProvider  
**Estado medido en Android:** Riesgo real: watcher recursivo no soportado (cae a backend=node). EACCES fuera del sandbox.

| Chunk | Módulo (vfs) | Posición | Tipo | Especificador | Símbolo(s) | rdeps |
|---|---|---:|---|---|---|---:|
| `chunk_0275_272410430.js` | `chunk-09yx2ges.js` | 22110 | esm | `fs` | constants | 0 |
| `chunk_0275_272410430.js` | `chunk-09yx2ges.js` | 22300 | esm | `fs` | — | 0 |
| `chunk_0275_272410430.js` | `chunk-09yx2ges.js` | 22322 | esm | `fs` | constants | 0 |
| `chunk_0275_272410430.js` | `chunk-09yx2ges.js` | 153549 | esm | `fs` | — | 0 |
| `chunk_0275_272410430.js` | `chunk-09yx2ges.js` | 305430 | esm | `fs` | — | 0 |
| `chunk_0275_272410430.js` | `chunk-09yx2ges.js` | 305524 | esm | `fs` | — | 0 |
| `chunk_0275_272410430.js` | `chunk-09yx2ges.js` | 305592 | esm | `fs` | — | 0 |
| `chunk_0131_123734518.js` | `chunk-0hfmf8xt.js` | 159 | esm | `fs` | existsSync, readdirSync, readFileSync, statSync | 2 |
| `chunk_0131_123734518.js` | `chunk-0hfmf8xt.js` | 420 | esm | `fs` | statSync | 2 |
| `chunk_0445_283263947.js` | `chunk-1jgc1qk1.js` | 1938 | esm | `fs` | readFileSync | 0 |
| `chunk_0445_283263947.js` | `chunk-1jgc1qk1.js` | 2047 | esm | `fs` | existsSync | 0 |
| `chunk_0391_276759908.js` | `chunk-25dcn49d.js` | 40 | esm | `fs` | readFileSync | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 200 | esm | `fs` | realpathSync | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 266 | esm | `fs` | lstatSync, readFileSync, readlinkSync, realpath, realpathSync, statSync | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 575 | esm | `fs` | createReadStream | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 1019 | esm | `fs` | — | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 1351 | esm | `fs` | constants | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 1734 | esm | `fs` | constants, createWriteStream | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 2111 | esm | `fs` | lstatSync | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 2316 | esm | `fs` | constants | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 2684 | esm | `fs` | constants | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 2943 | esm | `fs` | constants | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 3182 | esm | `fs` | closeSync, constants, fchmodSync, fstatSync, ftruncateSync, lstatSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 3905 | esm | `fs` | accessSync, constants, realpath, realpathSync | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 4341 | esm | `fs` | closeSync, constants, fstatSync, lstatSync, openSync, readSync | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 5211 | esm | `fs` | existsSync | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 5339 | esm | `fs` | existsSync | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 5599 | esm | `fs` | realpathSync | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 5750 | esm | `fs` | constants | 0 |
| `chunk_0005_101349743.js` | `chunk-2s7rxcdz.js` | 5318 | esm | `fs` | existsSync | 6 |
| `chunk_0067_108811803.js` | `chunk-37zemjkn.js` | 351 | esm | `fs` | promises | 3 |
| `chunk_0069_108890292.js` | `chunk-3rkrt7x6.js` | 1349 | esm | `fs` | promises | 3 |
| `chunk_0203_174448085.js` | `chunk-4kcbhaah.js` | 357 | esm | `fs` | existsSync, readFileSync | 11 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 162643 | esm | `fs` | statSync | 4 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 166434 | dynamic-import | `fs` | — | 4 |
| `chunk_0001_54753417.js` | `chunk-7gtsct90.js` | 163764 | esm | `node:fs` | — | 2 |
| `chunk_0029_106192038.js` | `chunk-82masma7.js` | 842 | dynamic-import | `fs` | — | 4 |
| `chunk_0449_293706614.js` | `chunk-cwfnnp1q.js` | 7110 | esm | `fs` | existsSync | 0 |
| `chunk_0449_293706614.js` | `chunk-cwfnnp1q.js` | 235295 | esm | `fs` | realpathSync | 0 |
| `chunk_0191_161918564.js` | `chunk-dpsr58v2.js` | 397 | esm | `fs` | — | 68 |
| `chunk_0218_188656639.js` | `chunk-hn275w5h.js` | 734 | esm | `fs` | — | 102 |
| `chunk_0211_185839942.js` | `chunk-j5dn57yp.js` | 132 | esm | `fs` | existsSync | 8 |
| `chunk_0211_185839942.js` | `chunk-j5dn57yp.js` | 318 | esm | `fs` | statSync | 8 |
| `chunk_0211_185839942.js` | `chunk-j5dn57yp.js` | 432 | esm | `fs` | existsSync, writeFileSync | 8 |
| `chunk_0263_213351226.js` | `chunk-kb1j967y.js` | 908 | esm | `fs` | existsSync, readFileSync | 0 |
| `chunk_0195_162742945.js` | `chunk-kcjcpqq9.js` | 1 | esm | `fs` | watch | 61 |
| `chunk_0187_161308469.js` | `chunk-mes56ye5.js` | 150898 | esm | `fs` | realpathSync | 52 |
| `chunk_0187_161308469.js` | `chunk-mes56ye5.js` | 152161 | esm | `fs` | lstatSync, readdir, readdirSync, readlinkSync, realpathSync | 52 |
| `chunk_0187_161308469.js` | `chunk-mes56ye5.js` | 152263 | esm | `fs` | — | 52 |
| `chunk_0403_277022637.js` | `chunk-myg6fkx3.js` | 1038 | esm | `fs` | — | 0 |
| `chunk_0080_114439853.js` | `chunk-s95j0csq.js` | 30752 | esm | `fs` | closeSync, existsSync, openSync | 6 |
| `chunk_0215_188268858.js` | `chunk-w7kwxfqb.js` | 15701 | esm | `fs` | — | 7 |
| `chunk_0215_188268858.js` | `chunk-w7kwxfqb.js` | 17319 | esm | `fs` | — | 7 |
| `chunk_0163_146135716.js` | `chunk-xahy38ty.js` | 326 | esm | `fs` | — | 2 |
| `chunk_0163_146135716.js` | `chunk-xahy38ty.js` | 344 | esm | `fs` | — | 2 |
| `chunk_0163_146135716.js` | `chunk-xahy38ty.js` | 363 | esm | `fs` | — | 2 |
| `chunk_0267_249458502.js` | `chunk-xnkmks1t.js` | 5150 | esm | `fs` | readFileSync | 0 |
| `chunk_0447_287383431.js` | `chunk-xw18w92h.js` | 1324 | esm | `fs` | createWriteStream | 0 |
| `chunk_0070_108914366.js` | `chunk-yfgaxh72.js` | 184 | esm | `fs` | readFileSync | 7 |
| `chunk_0162_146005971.js` | `chunk-zekm22vp.js` | 106 | esm | `fs` | readFileSync, readdirSync | 4 |
| `chunk_0079_113208595.js` | `chunk-zwsvre1a.js` | 3708 | esm | `fs` | existsSync, realpathSync | 13 |

### `node:crypto` — 35 contactos

**Funcionalidad:** Primitivas criptograficas. SHA-256 de assets, randomUUID para IDs, claves SSH/TLS.

**Decisión:** CONSERVAR via RuntimeProvider.crypto  
| Chunk | Módulo (vfs) | Posición | Tipo | Especificador | Símbolo(s) | rdeps |
|---|---|---:|---|---|---|---:|
| `chunk_0275_272410430.js` | `chunk-09yx2ges.js` | 22246 | esm | `crypto` | createHash, randomUUID | 0 |
| `chunk_0275_272410430.js` | `chunk-09yx2ges.js` | 305498 | esm | `crypto` | — | 0 |
| `chunk_0141_124114100.js` | `chunk-0w16pvg0.js` | 2531 | esm | `crypto` | randomBytes | 33 |
| `chunk_0209_179311894.js` | `chunk-0wk6f84s.js` | 9590 | esm | `crypto` | randomBytes | 49 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 80 | esm | `crypto` | createHash, randomBytes, randomUUID | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 2278 | esm | `crypto` | createHash | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 2811 | esm | `crypto` | randomUUID | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 3143 | esm | `crypto` | randomBytes | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 3672 | esm | `crypto` | randomUUID | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 4303 | esm | `crypto` | createHash | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 4457 | esm | `crypto` | verify, X509Certificate | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 4765 | esm | `crypto` | randomUUID | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 5514 | esm | `crypto` | createHash | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 5713 | esm | `crypto` | randomUUID | 0 |
| `chunk_0005_101349743.js` | `chunk-2s7rxcdz.js` | 25849 | esm | `crypto` | createHash | 6 |
| `chunk_0067_108811803.js` | `chunk-37zemjkn.js` | 262 | esm | `crypto` | createHash, createPrivateKey, createPublicKey, sign | 3 |
| `chunk_0184_159152165.js` | `chunk-4vhm3wje.js` | 844 | esm | `crypto` | randomBytes | 52 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 6059 | esm | `crypto` | randomUUID | 4 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 66162 | esm | `crypto` | createHash | 4 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 210899 | esm | `crypto` | createHash | 4 |
| `chunk_0142_124144631.js` | `chunk-7zxzqvgc.js` | 551 | esm | `crypto` | randomBytes | 41 |
| `chunk_0266_240181111.js` | `chunk-9f4f8etn.js` | 8797674 | esm | `crypto` | createHash | 0 |
| `chunk_0266_240181111.js` | `chunk-9f4f8etn.js` | 8951451 | esm | `crypto` | randomUUID | 0 |
| `chunk_0208_176606090.js` | `chunk-9g497wsj.js` | 1 | esm | `crypto` | createHash | 54 |
| `chunk_0196_162807342.js` | `chunk-bj997enm.js` | 91 | esm | `crypto` | randomBytes, randomUUID | 5 |
| `chunk_0186_159452129.js` | `chunk-ctfvsqfc.js` | 457 | esm | `crypto` | randomUUID | 58 |
| `chunk_0218_188656639.js` | `chunk-hn275w5h.js` | 708 | esm | `crypto` | — | 102 |
| `chunk_0265_213707767.js` | `chunk-j3cfc320.js` | 6638 | esm | `crypto` | createHash | 0 |
| `chunk_0011_104837179.js` | `chunk-pyvxqpq5.js` | 251218 | dynamic-import | `crypto` | — | 5 |
| `chunk_0334_275399521.js` | `chunk-s94h4j3c.js` | 10312 | dynamic-import | `crypto` | — | 0 |
| `chunk_0182_158519933.js` | `chunk-t6qpsd35.js` | 23206 | esm | `crypto` | randomUUID | 50 |
| `chunk_0215_188268858.js` | `chunk-w7kwxfqb.js` | 9459 | esm | `crypto` | — | 7 |
| `chunk_0267_249458502.js` | `chunk-xnkmks1t.js` | 2714 | esm | `crypto` | randomBytes, randomUUID | 0 |
| `chunk_0267_249458502.js` | `chunk-xnkmks1t.js` | 5109 | esm | `crypto` | createHash | 0 |
| `chunk_0183_158860009.js` | `chunk-yz2mc1mb.js` | 736 | esm | `crypto` | createHash, randomUUID | 49 |

### `node:url` — 27 contactos

**Funcionalidad:** URLs y file://. fileURLToPath/pathToFileURL para resolver rutas de modulos.

**Decisión:** CONSERVAR via RuntimeProvider.fileURLToPath  
| Chunk | Módulo (vfs) | Posición | Tipo | Especificador | Símbolo(s) | rdeps |
|---|---|---:|---|---|---|---:|
| `chunk_0421_280391868.js` | `chunk-0sx5r3nk.js` | 2224 | esm | `url` | fileURLToPath | 0 |
| `chunk_0445_283263947.js` | `chunk-1jgc1qk1.js` | 1992 | esm | `url` | fileURLToPath, pathToFileURL | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 5090 | esm | `url` | fileURLToPath | 0 |
| `chunk_0005_101349743.js` | `chunk-2s7rxcdz.js` | 5433 | esm | `url` | fileURLToPath | 6 |
| `chunk_0414_279324085.js` | `chunk-3pvznm75.js` | 49037 | esm | `url` | pathToFileURL | 0 |
| `chunk_0204_174454887.js` | `chunk-44nah9ak.js` | 54 | esm | `url` | pathToFileURL | 50 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 5105 | esm | `url` | fileURLToPath | 4 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 85425 | esm | `url` | pathToFileURL | 4 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 97079 | esm | `url` | fileURLToPath | 4 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 126653 | esm | `url` | fileURLToPath | 4 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 151610 | esm | `url` | fileURLToPath | 4 |
| `chunk_0282_273232788.js` | `chunk-7q2shk67.js` | 2540 | esm | `url` | pathToFileURL | 0 |
| `chunk_0266_240181111.js` | `chunk-9f4f8etn.js` | 188325 | esm | `url` | fileURLToPath, pathToFileURL | 0 |
| `chunk_0449_293706614.js` | `chunk-cwfnnp1q.js` | 82017 | esm | `url` | pathToFileURL | 0 |
| `chunk_0218_188656639.js` | `chunk-hn275w5h.js` | 9004 | esm | `url` | — | 102 |
| `chunk_0211_185839942.js` | `chunk-j5dn57yp.js` | 95 | esm | `url` | fileURLToPath | 8 |
| `chunk_0211_185839942.js` | `chunk-j5dn57yp.js` | 281 | esm | `url` | fileURLToPath | 8 |
| `chunk_0211_185839942.js` | `chunk-j5dn57yp.js` | 395 | esm | `url` | fileURLToPath | 8 |
| `chunk_0132_123829620.js` | `chunk-kfqh5r0n.js` | 157 | esm | `url` | pathToFileURL | 3 |
| `chunk_0187_161308469.js` | `chunk-mes56ye5.js` | 152045 | esm | `url` | fileURLToPath | 52 |
| `chunk_0187_161308469.js` | `chunk-mes56ye5.js` | 152124 | esm | `url` | fileURLToPath | 52 |
| `chunk_0223_188934803.js` | `chunk-n6tj7rny.js` | 207 | esm | `url` | fileURLToPath | 4 |
| `chunk_0438_282978362.js` | `chunk-wrkxptbf.js` | 107819 | esm | `url` | fileURLToPath, pathToFileURL | 0 |
| `chunk_0438_282978362.js` | `chunk-wrkxptbf.js` | 141492 | esm | `url` | fileURLToPath | 0 |
| `chunk_0163_146135716.js` | `chunk-xahy38ty.js` | 44 | esm | `url` | fileURLToPath | 2 |
| `chunk_0183_158860009.js` | `chunk-yz2mc1mb.js` | 856 | esm | `url` | fileURLToPath | 49 |
| `chunk_0162_146005971.js` | `chunk-zekm22vp.js` | 157 | esm | `url` | fileURLToPath, pathToFileURL | 4 |

### `node:buffer` — 9 contactos

**Funcionalidad:** Buffers binarios. Framing del protocolo PTY, codificacion de payloads.

**Decisión:** CONSERVAR via RuntimeProvider.buffer  
| Chunk | Módulo (vfs) | Posición | Tipo | Especificador | Símbolo(s) | rdeps |
|---|---|---:|---|---|---|---:|
| `chunk_orphan_qcpntc9z.js` | `None` | 2415787 | dynamic-import | `node:buffer` | — | 0 |
| `chunk_0275_272410430.js` | `chunk-09yx2ges.js` | 100956 | dynamic-import | `node:buffer` | — | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 3834 | esm | `buffer` | isUtf8 | 0 |
| `chunk_0216_188399975.js` | `chunk-c9dk3vqe.js` | 1005 | esm | `buffer` | Buffer | 55 |
| `chunk_0090_116022518.js` | `chunk-gbqvbvbm.js` | 1020 | esm | `buffer` | Buffer | 95 |
| `chunk_0263_213351226.js` | `chunk-kb1j967y.js` | 188 | esm | `buffer` | Buffer | 0 |
| `chunk_0274_268438273.js` | `chunk-qcpntc9z.js` | 2415787 | dynamic-import | `node:buffer` | — | 3 |
| `chunk_0163_146135716.js` | `chunk-xahy38ty.js` | 1113 | esm | `buffer` | Buffer | 2 |
| `chunk_0210_179835193.js` | `chunk-yq5qw44s.js` | 85 | esm | `buffer` | Buffer | 63 |

### `node:stream` — 12 contactos

**Funcionalidad:** Streams. Readable/Writable/Transform/PassThrough de la TUI, PTY y del servidor.

**Decisión:** CONSERVAR via NetworkProvider/PtyProvider  
| Chunk | Módulo (vfs) | Posición | Tipo | Especificador | Símbolo(s) | rdeps |
|---|---|---:|---|---|---|---:|
| `chunk_0001_54753417.js` | `chunk-7gtsct90.js` | 691888 | esm | `node:stream` | Readable | 2 |
| `chunk_0217_188483466.js` | `chunk-m0xbh7h1.js` | 593 | esm | `stream` | finished | 56 |
| `chunk_0217_188483466.js` | `chunk-m0xbh7h1.js` | 2179 | esm | `stream` | finished, Readable | 56 |
| `chunk_0187_161308469.js` | `chunk-mes56ye5.js` | 152405 | esm | `stream` | — | 52 |
| `chunk_0215_188268858.js` | `chunk-w7kwxfqb.js` | 2665 | esm | `stream` | PassThrough | 7 |
| `chunk_0215_188268858.js` | `chunk-w7kwxfqb.js` | 12387 | esm | `stream` | Readable, Transform | 7 |
| `chunk_0215_188268858.js` | `chunk-w7kwxfqb.js` | 15723 | esm | `stream` | pipeline, Readable | 7 |
| `chunk_0215_188268858.js` | `chunk-w7kwxfqb.js` | 17381 | esm | `stream` | Duplex, Readable | 7 |
| `chunk_0438_282978362.js` | `chunk-wrkxptbf.js` | 92961 | esm | `stream` | Writable | 0 |
| `chunk_0447_287383431.js` | `chunk-xw18w92h.js` | 1286 | esm | `stream` | Writable | 0 |
| `chunk_0447_287383431.js` | `chunk-xw18w92h.js` | 1430 | esm | `stream` | Writable | 0 |
| `chunk_0210_179835193.js` | `chunk-yq5qw44s.js` | 117 | esm | `stream` | Readable, Writable | 63 |

### `node:worker_threads` — 3 contactos

**Funcionalidad:** Workers aislados. Worker de parser/OpenTUI (blob embebido), worker real (chunk-z4ny5a8k), Photon image worker.

**Decisión:** SUSTITUIR por WorkerProvider (thread|process)  
**Estado medido en Android:** Sin uso observado en el log. Compat de Bun es parcial (throwNotImplemented).

| Chunk | Módulo (vfs) | Posición | Tipo | Especificador | Símbolo(s) | rdeps |
|---|---|---:|---|---|---|---:|
| `chunk_0269_249967489.js` | `chunk-23n3wbjy.js` | 2420 | dynamic-import | `worker_threads` | — | 0 |
| `chunk_0210_179835193.js` | `chunk-yq5qw44s.js` | 1110203 | esm | `node:worker_threads` | parentPort | 63 |
| `chunk_0483_298212149.js` | `chunk-z4ny5a8k.js` | 131 | esm | `worker_threads` | parentPort | 0 |

### `node:net` — 6 contactos

**Funcionalidad:** Sockets TCP/IP. Socket del PTY, sockets del servidor, conexion del navegador, isIPv4/isIPv6.

**Decisión:** CONSERVAR via NetworkProvider  
| Chunk | Módulo (vfs) | Posición | Tipo | Especificador | Símbolo(s) | rdeps |
|---|---|---:|---|---|---|---:|
| `chunk_0448_287913187.js` | `chunk-210v0c6c.js` | 13393 | esm | `net` | — | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 4634 | esm | `net` | isIPv4, isIPv6 | 0 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 198900 | esm | `net` | — | 4 |
| `chunk_0266_240181111.js` | `chunk-9f4f8etn.js` | 8689302 | dynamic-import | `net` | — | 0 |
| `chunk_0216_188399975.js` | `chunk-c9dk3vqe.js` | 1038 | esm | `net` | — | 55 |
| `chunk_0267_249458502.js` | `chunk-xnkmks1t.js` | 2826 | esm | `net` | — | 0 |

### `node:https` — 3 contactos

**Funcionalidad:** HTTPS/TLS. Cliente HTTPS, agente TLS, proxy.

**Decisión:** CONSERVAR via NetworkProvider  
| Chunk | Módulo (vfs) | Posición | Tipo | Especificador | Símbolo(s) | rdeps |
|---|---|---:|---|---|---|---:|
| `chunk_0216_188399975.js` | `chunk-c9dk3vqe.js` | 1061 | esm | `tls` | — | 55 |
| `chunk_0454_294653895.js` | `chunk-p1y4s2mr.js` | 7687 | dynamic-import | `https` | — | 0 |
| `chunk_0454_294653895.js` | `chunk-p1y4s2mr.js` | 11470 | dynamic-import | `https` | — | 0 |

### `node:fs/promises` — 64 contactos

**Funcionalidad:** E/S asincrona de ficheros. Extraccion atomica de assets, mkdir/chmod/rename, lectura de blobs.

**Decisión:** CONSERVAR via FilesystemProvider  
**Estado medido en Android:** Sin problema medido. Extraccion de assets verificada por sha256.

| Chunk | Módulo (vfs) | Posición | Tipo | Especificador | Símbolo(s) | rdeps |
|---|---|---:|---|---|---|---:|
| `chunk_orphan_k7raz5np.js` | `None` | 2145 | esm | `fs/promises` | open | 0 |
| `chunk_orphan_k7raz5np.js` | `None` | 2232 | esm | `fs/promises` | readFile | 0 |
| `chunk_0275_272410430.js` | `chunk-09yx2ges.js` | 22142 | esm | `fs/promises` | lstat, open, opendir, unlink | 0 |
| `chunk_0275_272410430.js` | `chunk-09yx2ges.js` | 22354 | esm | `fs/promises` | lstat, mkdir, open, rename, unlink | 0 |
| `chunk_0131_123734518.js` | `chunk-0hfmf8xt.js` | 240 | esm | `fs/promises` | readFile, rm, writeFile | 2 |
| `chunk_0131_123734518.js` | `chunk-0hfmf8xt.js` | 450 | esm | `fs/promises` | readFile | 2 |
| `chunk_0422_280427249.js` | `chunk-0kzp4zq9.js` | 1799 | esm | `fs/promises` | mkdir, readFile, rename, writeFile | 0 |
| `chunk_0209_179311894.js` | `chunk-0wk6f84s.js` | 9628 | esm | `fs/promises` | open, readFile, rename, unlink | 49 |
| `chunk_0448_287913187.js` | `chunk-210v0c6c.js` | 9831 | esm | `fs/promises` | — | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 614 | esm | `fs/promises` | readdir, readFile | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 736 | esm | `fs/promises` | appendFile, mkdir, rename, stat, symlink, unlink | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 1041 | esm | `fs/promises` | appendFile, chmod, copyFile, link, lstat, mkdir, open, readdir, readFile, readlink, realpath, rename, rmdir, rm, stat, symlink, unlink | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 1311 | esm | `fs/promises` | readFile | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 1383 | esm | `fs/promises` | access, readdir, readFile, readlink | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 1554 | esm | `fs/promises` | readdir, readFile | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 1791 | esm | `fs/promises` | lstat, open, lstat, readdir, realpath, rename, stat | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 2394 | esm | `fs/promises` | readdir, stat | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 2551 | esm | `fs/promises` | readFile | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 2716 | esm | `fs/promises` | lstat, open | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 2976 | esm | `fs/promises` | appendFile, copyFile, lstat, mkdir, open, readdir, readFile, stat, unlink, writeFile | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 3397 | esm | `fs/promises` | lstat, open, rename, stat, unlink, writeFile | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 3546 | esm | `fs/promises` | readdir, readFile | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 3868 | esm | `fs/promises` | open | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 3991 | esm | `fs/promises` | access | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 4803 | esm | `fs/promises` | mkdir, mkdtemp, readFile, rm, writeFile | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 5373 | esm | `fs/promises` | copyFile, readFile, rm, writeFile | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 5782 | esm | `fs/promises` | open, readdir, rm, stat | 0 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 5065 | esm | `fs/promises` | readFile | 4 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 6096 | esm | `fs/promises` | — | 4 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 162603 | esm | `fs/promises` | readFile | 4 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 166350 | dynamic-import | `fs/promises` | — | 4 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 198715 | esm | `fs/promises` | stat | 4 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 198835 | esm | `fs/promises` | mkdir, readFile, rename | 4 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 210936 | esm | `fs/promises` | chmod, lstat, mkdir, open, readFile, rename, rm | 4 |
| `chunk_0152_145359137.js` | `chunk-68qvjkq9.js` | 121 | esm | `fs/promises` | readdir, stat | 8 |
| `chunk_0001_54753417.js` | `chunk-7gtsct90.js` | 823563 | esm | `node:fs/promises` | rm | 2 |
| `chunk_0001_54753417.js` | `chunk-7gtsct90.js` | 968251 | esm | `node:fs/promises` | rm | 2 |
| `chunk_0266_240181111.js` | `chunk-9f4f8etn.js` | 8697868 | dynamic-import | `fs/promises` | — | 0 |
| `chunk_0266_240181111.js` | `chunk-9f4f8etn.js` | 8699420 | dynamic-import | `fs/promises` | — | 0 |
| `chunk_0266_240181111.js` | `chunk-9f4f8etn.js` | 8951488 | esm | `fs/promises` | — | 0 |
| `chunk_0151_145327003.js` | `chunk-9ykqvmfb.js` | 177 | esm | `fs/promises` | appendFile, mkdir, readFile, rename, rm, writeFile | 4 |
| `chunk_0196_162807342.js` | `chunk-bj997enm.js` | 144 | esm | `fs/promises` | mkdir, readFile, rm, stat, utimes, writeFile | 5 |
| `chunk_0449_293706614.js` | `chunk-cwfnnp1q.js` | 20628 | esm | `fs/promises` | open | 0 |
| `chunk_0449_293706614.js` | `chunk-cwfnnp1q.js` | 182410 | esm | `fs/promises` | mkdir, writeFile | 0 |
| `chunk_0425_280495388.js` | `chunk-gp08n9pr.js` | 1667 | esm | `fs/promises` | readFile, rename, writeFile | 0 |
| `chunk_0153_145377358.js` | `chunk-gx66ket5.js` | 21 | esm | `fs/promises` | stat | 7 |
| `chunk_0010_101934621.js` | `chunk-hergse29.js` | 10796 | esm | `fs/promises` | — | 3 |
| `chunk_0211_185839942.js` | `chunk-j5dn57yp.js` | 165 | esm | `fs/promises` | mkdir, writeFile | 8 |
| `chunk_0405_277227410.js` | `chunk-k7raz5np.js` | 2145 | esm | `fs/promises` | open | 3 |
| `chunk_0405_277227410.js` | `chunk-k7raz5np.js` | 2232 | esm | `fs/promises` | readFile | 3 |
| `chunk_0187_161308469.js` | `chunk-mes56ye5.js` | 150933 | esm | `fs/promises` | readdir | 52 |
| `chunk_0187_161308469.js` | `chunk-mes56ye5.js` | 152285 | esm | `fs/promises` | lstat, readdir, readlink, realpath | 52 |
| `chunk_0403_277022637.js` | `chunk-myg6fkx3.js` | 1056 | esm | `fs/promises` | readFile | 0 |
| `chunk_0108_118284793.js` | `chunk-n7kh9ry5.js` | 380 | esm | `fs/promises` | readFile, stat, writeFile | 2 |
| `chunk_0072_109877226.js` | `chunk-nbjn4zqf.js` | 307 | esm | `fs/promises` | — | 11 |
| `chunk_0181_158268415.js` | `chunk-p7np38cq.js` | 237 | esm | `fs/promises` | mkdir, open | 46 |
| `chunk_0080_114439853.js` | `chunk-s95j0csq.js` | 30816 | esm | `fs/promises` | chmod | 6 |
| `chunk_0080_114439853.js` | `chunk-s95j0csq.js` | 63023 | esm | `fs/promises` | readFile | 6 |
| `chunk_0144_124321148.js` | `chunk-thb6qhb7.js` | 2313 | esm | `fs/promises` | readFile, rename, rm, writeFile | 2 |
| `chunk_0438_282978362.js` | `chunk-wrkxptbf.js` | 141438 | esm | `fs/promises` | access, constants | 0 |
| `chunk_0163_146135716.js` | `chunk-xahy38ty.js` | 111 | esm | `fs/promises` | constants, default=Ze | 2 |
| `chunk_0163_146135716.js` | `chunk-xahy38ty.js` | 241 | esm | `fs/promises` | constants, default=T | 2 |
| `chunk_0447_287383431.js` | `chunk-xw18w92h.js` | 1363 | esm | `fs/promises` | mkdir | 0 |
| `chunk_0183_158860009.js` | `chunk-yz2mc1mb.js` | 6318 | dynamic-import | `fs/promises` | — | 49 |

### `node:util` — 13 contactos

**Funcionalidad:** Utilidades. promisify(execFile), stripVTControlCharacters, StringDecoder, inspect.

**Decisión:** CONSERVAR via RuntimeProvider.util  
| Chunk | Módulo (vfs) | Posición | Tipo | Especificador | Símbolo(s) | rdeps |
|---|---|---:|---|---|---|---:|
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 2029 | esm | `util` | promisify | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 4105 | esm | `util` | promisify | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 5290 | esm | `string_decoder` | StringDecoder | 0 |
| `chunk_0184_159152165.js` | `chunk-4vhm3wje.js` | 2599 | esm | `util` | stripVTControlCharacters | 52 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 66199 | esm | `util` | isDeepStrictEqual | 4 |
| `chunk_0187_161308469.js` | `chunk-mes56ye5.js` | 152428 | esm | `string_decoder` | StringDecoder | 52 |
| `chunk_0435_280708196.js` | `chunk-pwdfewx0.js` | 1737 | esm | `util` | stripVTControlCharacters | 0 |
| `chunk_0080_114439853.js` | `chunk-s95j0csq.js` | 95379 | esm | `util` | isDeepStrictEqual | 6 |
| `chunk_0068_108834508.js` | `chunk-w59fntk1.js` | 225 | esm | `util` | promisify | 3 |
| `chunk_0438_282978362.js` | `chunk-wrkxptbf.js` | 104316 | esm | `util` | isDeepStrictEqual | 0 |
| `chunk_0438_282978362.js` | `chunk-wrkxptbf.js` | 133485 | esm | `util` | isDeepStrictEqual | 0 |
| `chunk_0163_146135716.js` | `chunk-xahy38ty.js` | 177 | esm | `util` | promisify | 2 |
| `chunk_0163_146135716.js` | `chunk-xahy38ty.js` | 1146 | esm | `util` | promisify | 2 |

### `node:events` — 6 contactos

**Funcionalidad:** EventEmitter. Eventos del servidor, MCP y procesos.

**Decisión:** CONSERVAR (EventEmitter nativo)  
| Chunk | Módulo (vfs) | Posición | Tipo | Especificador | Símbolo(s) | rdeps |
|---|---|---:|---|---|---|---:|
| `chunk_0209_179311894.js` | `chunk-0wk6f84s.js` | 9551 | esm | `events` | EventEmitter | 49 |
| `chunk_0209_179311894.js` | `chunk-0wk6f84s.js` | 9763 | esm | `events` | EventEmitter | 49 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 1703 | esm | `events` | once | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 5128 | esm | `events` | setMaxListeners | 0 |
| `chunk_0001_54753417.js` | `chunk-7gtsct90.js` | 691844 | esm | `node:events` | EventEmitter | 2 |
| `chunk_0187_161308469.js` | `chunk-mes56ye5.js` | 152366 | esm | `events` | EventEmitter | 52 |

### `node:async_hooks` — 3 contactos

**Funcionalidad:** Contexto asincrono. AsyncLocalStorage (contexto de sesion) y AsyncResource.

**Decisión:** CONSERVAR via RuntimeProvider.createAsyncLocalStorage  
| Chunk | Módulo (vfs) | Posición | Tipo | Especificador | Símbolo(s) | rdeps |
|---|---|---:|---|---|---|---:|
| `chunk_0275_272410430.js` | `chunk-09yx2ges.js` | 305287 | esm | `async_hooks` | AsyncResource | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 2893 | esm | `async_hooks` | AsyncLocalStorage | 0 |
| `chunk_0076_110867574.js` | `chunk-nzqsarz8.js` | 22800 | dynamic-import | `async_hooks` | — | 23 |

### `node:process` — 7 contactos

**Funcionalidad:** Proceso actual. platform, env, versions, cwd, stdin/stdout, argv.

**Decisión:** CONSERVAR via EnvironmentProvider  
| Chunk | Módulo (vfs) | Posición | Tipo | Especificador | Símbolo(s) | rdeps |
|---|---|---:|---|---|---|---:|
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 235 | esm | `process` | cwd | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 1679 | esm | `process` | — | 0 |
| `chunk_0120_123118606.js` | `chunk-hynpagvj.js` | 981 | esm | `process` | stdin, stdout | 9 |
| `chunk_0120_123118606.js` | `chunk-hynpagvj.js` | 38538 | esm | `process` | — | 9 |
| `chunk_0163_146135716.js` | `chunk-xahy38ty.js` | 1 | esm | `process` | — | 2 |
| `chunk_0163_146135716.js` | `chunk-xahy38ty.js` | 284 | esm | `process` | — | 2 |
| `chunk_0163_146135716.js` | `chunk-xahy38ty.js` | 1090 | esm | `process` | — | 2 |

### `node:readline` — 4 contactos

**Funcionalidad:** Interfaz de linea de comandos. TUI (OpenTUI), PTY de Effect, lector de procesos.

**Decisión:** CONSERVAR (TUI) via PtyProvider/RuntimeProvider  
| Chunk | Módulo (vfs) | Posición | Tipo | Especificador | Símbolo(s) | rdeps |
|---|---|---:|---|---|---|---:|
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 5245 | esm | `readline` | createInterface | 0 |
| `chunk_0120_123118606.js` | `chunk-hynpagvj.js` | 1027 | esm | `readline` | — | 9 |
| `chunk_0120_123118606.js` | `chunk-hynpagvj.js` | 1054 | esm | `readline` | — | 9 |
| `chunk_0215_188268858.js` | `chunk-w7kwxfqb.js` | 10570 | esm | `readline` | — | 7 |

### `node:tty` — 3 contactos

**Funcionalidad:** Terminales TTY. ReadStream/WriteStream de la TUI y del cliente mini.

**Decisión:** CONSERVAR (TUI) via PtyProvider  
| Chunk | Módulo (vfs) | Posición | Tipo | Especificador | Símbolo(s) | rdeps |
|---|---|---:|---|---|---|---:|
| `chunk_0120_123118606.js` | `chunk-hynpagvj.js` | 1079 | esm | `tty` | ReadStream, WriteStream | 9 |
| `chunk_0120_123118606.js` | `chunk-hynpagvj.js` | 38561 | esm | `tty` | WriteStream | 9 |
| `chunk_0403_277022637.js` | `chunk-myg6fkx3.js` | 1115 | esm | `tty` | ReadStream | 0 |

### `node:module` — 7 contactos

**Funcionalidad:** Carga de modulos. createRequire para cargar dependencias opcionales.

**Decisión:** CONSERVAR via RuntimeProvider.createRequire  
| Chunk | Módulo (vfs) | Posición | Tipo | Especificador | Símbolo(s) | rdeps |
|---|---|---:|---|---|---|---:|
| `chunk_0445_283263947.js` | `chunk-1jgc1qk1.js` | 1899 | esm | `module` | createRequire | 0 |
| `chunk_0448_287913187.js` | `chunk-210v0c6c.js` | 13353 | esm | `module` | createRequire | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 40 | esm | `module` | createRequire | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 4896 | esm | `module` | createRequire | 0 |
| `chunk_0005_101349743.js` | `chunk-2s7rxcdz.js` | 5351 | esm | `module` | createRequire | 6 |
| `chunk_0211_185839942.js` | `chunk-j5dn57yp.js` | 55 | esm | `module` | createRequire | 8 |
| `chunk_0215_188268858.js` | `chunk-w7kwxfqb.js` | 12482 | esm | `module` | createRequire | 7 |

### `node:child_process` — 14 contactos

**Funcionalidad:** Procesos hijo. git, shell del tool, credential_process, binario opencode-pty, integracion Zed.

**Decisión:** SUSTITUIR por ProcessProvider  
**Estado medido en Android:** SIN PROBLEMA MEDIDO: 'spawning process command=git' operativo.

| Chunk | Módulo (vfs) | Posición | Tipo | Especificador | Símbolo(s) | rdeps |
|---|---|---:|---|---|---|---:|
| `chunk_0275_272410430.js` | `chunk-09yx2ges.js` | 305367 | esm | `child_process` | spawn | 0 |
| `chunk_0131_123734518.js` | `chunk-0hfmf8xt.js` | 340 | esm | `child_process` | spawn | 2 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 1986 | esm | `child_process` | execFile | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 2064 | esm | `child_process` | execFileSync | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 4679 | esm | `child_process` | execFile | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 4722 | esm | `child_process` | execFile | 0 |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 5171 | esm | `child_process` | spawn | 0 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 198796 | esm | `child_process` | spawn | 4 |
| `chunk_0144_124321148.js` | `chunk-thb6qhb7.js` | 256 | esm | `child_process` | spawn | 2 |
| `chunk_0068_108834508.js` | `chunk-w59fntk1.js` | 188 | esm | `child_process` | exec | 3 |
| `chunk_0215_188268858.js` | `chunk-w7kwxfqb.js` | 2632 | esm | `child_process` | — | 7 |
| `chunk_0163_146135716.js` | `chunk-xahy38ty.js` | 81 | esm | `child_process` | — | 2 |
| `chunk_0163_146135716.js` | `chunk-xahy38ty.js` | 211 | esm | `child_process` | — | 2 |
| `chunk_0163_146135716.js` | `chunk-xahy38ty.js` | 1180 | esm | `child_process` | — | 2 |

### `node:stream/promises` — 3 contactos

**Funcionalidad:** Pipeline asincrono. pipeline() para el duplex del PTY.

**Decisión:** CONSERVAR  
| Chunk | Módulo (vfs) | Posición | Tipo | Especificador | Símbolo(s) | rdeps |
|---|---|---:|---|---|---|---:|
| `chunk_0215_188268858.js` | `chunk-w7kwxfqb.js` | 12438 | esm | `stream/promises` | pipeline | 7 |
| `chunk_0215_188268858.js` | `chunk-w7kwxfqb.js` | 17341 | esm | `stream/promises` | — | 7 |
| `chunk_0447_287383431.js` | `chunk-xw18w92h.js` | 1464 | esm | `stream/promises` | finished | 0 |

### `node:zlib` — 2 contactos

**Funcionalidad:** Compresion. brotli (AppArchive), gzip/deflate/zstd de la capa HTTP.

**Decisión:** CONSERVAR via NetworkProvider  
| Chunk | Módulo (vfs) | Posición | Tipo | Especificador | Símbolo(s) | rdeps |
|---|---|---:|---|---|---|---:|
| `chunk_0215_188268858.js` | `chunk-w7kwxfqb.js` | 14326 | esm | `zlib` | — | 7 |
| `chunk_0267_249458502.js` | `chunk-xnkmks1t.js` | 5205 | esm | `zlib` | brotliDecompressSync | 0 |

### `bun:ffi` — 3 contactos

**Funcionalidad:** Carga dinamica de bibliotecas nativas. PTY (librust_pty) y busqueda rapida de ficheros (fff).

**Decisión:** SUSTITUIR (seam: PtyProvider) / CONSERVAR en Bun  
**Estado medido en Android:** SIN PROBLEMA MEDIDO: builtin://bun/ffi registrado. Verificacion PTY pendiente.

| Chunk | Módulo (vfs) | Posición | Tipo | Especificador | Símbolo(s) | rdeps |
|---|---|---:|---|---|---|---:|
| `chunk_0005_101349743.js` | `chunk-2s7rxcdz.js` | 7238 | esm | `bun:ffi` | FFIType, JSCallback | 6 |
| `chunk_0005_101349743.js` | `chunk-2s7rxcdz.js` | 7290 | esm | `bun:ffi` | CString, dlopen, FFIType, ptr, read | 6 |
| `chunk_0263_213351226.js` | `chunk-kb1j967y.js` | 133 | esm | `bun:ffi` | dlopen, FFIType, ptr | 0 |

### `bun:sqlite` — 2 contactos

**Funcionalidad:** Motor de persistencia (SQLite). Sesiones, mensajes, proyectos, migraciones, credenciales de editor (Zed). Migracion V1->V2 de la base.

**Decisión:** SUSTITUIR (seam ya existente: SqliteNative)  
**Estado medido en Android:** SIN PROBLEMA MEDIDO: 59 migraciones aplicadas, opencode.db + WAL + SHM presentes.

| Chunk | Módulo (vfs) | Posición | Tipo | Especificador | Símbolo(s) | rdeps |
|---|---|---:|---|---|---|---:|
| `chunk_0131_123734518.js` | `chunk-0hfmf8xt.js` | 378 | esm | `bun:sqlite` | Database | 2 |
| `chunk_0080_114439853.js` | `chunk-s95j0csq.js` | 28200 | esm | `bun:sqlite` | Database | 6 |

### `node:assert` — 1 contactos

**Funcionalidad:** Aserciones. fail() en validacion de esquema.

**Decisión:** CONSERVAR  
| Chunk | Módulo (vfs) | Posición | Tipo | Especificador | Símbolo(s) | rdeps |
|---|---|---:|---|---|---|---:|
| `chunk_0197_172462523.js` | `chunk-bqxkpwa1.js` | 16595 | esm | `assert` | — | 6 |

### `Bun.file` — 13 contactos

**Funcionalidad:** Handle de archivo lazy (Bun.file). Lectura de assets embebidos (opencode-pty con sha256), archivos de sesion, parches git.

**Decisión:** SUSTITUIR por FilesystemProvider.file  
**Estado medido en Android:** Sin problema medido. Verificado: opencode-pty con checksum sha256.

| Chunk | Módulo (vfs) | Posición | Tipo | Especificador | Símbolo(s) | rdeps |
|---|---|---:|---|---|---|---:|
| `chunk_0399_276904401.js` | `chunk-1etnrgwc.js` | 2672 | bun-global | `Bun.file` | — | 0 |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 211622 | bun-global | `Bun.file` | — | 4 |
| `chunk_0001_54753417.js` | `chunk-7gtsct90.js` | 164960 | bun-global | `Bun.file` | — | 2 |
| `chunk_0001_54753417.js` | `chunk-7gtsct90.js` | 660151 | bun-global | `Bun.file` | — | 2 |
| `chunk_0001_54753417.js` | `chunk-7gtsct90.js` | 3210700 | bun-global | `Bun.file` | — | 2 |
| `chunk_0001_54753417.js` | `chunk-7gtsct90.js` | 3219132 | bun-global | `Bun.file` | — | 2 |
| `chunk_0001_54753417.js` | `chunk-7gtsct90.js` | 3226599 | bun-global | `Bun.file` | — | 2 |
| `chunk_0001_54753417.js` | `chunk-7gtsct90.js` | 4206475 | bun-global | `Bun.file` | — | 2 |
| `chunk_0001_54753417.js` | `chunk-7gtsct90.js` | 4206551 | bun-global | `Bun.file` | — | 2 |
| `chunk_0427_280541020.js` | `chunk-r10780dt.js` | 2421 | bun-global | `Bun.file` | — | 0 |
| `chunk_0438_282978362.js` | `chunk-wrkxptbf.js` | 116016 | bun-global | `Bun.file` | — | 0 |
| `chunk_0438_282978362.js` | `chunk-wrkxptbf.js` | 116998 | bun-global | `Bun.file` | — | 0 |
| `chunk_0438_282978362.js` | `chunk-wrkxptbf.js` | 117349 | bun-global | `Bun.file` | — | 0 |

### `node:http` — 4 contactos

**Funcionalidad:** HTTP cliente/servidor. Servidor OpenCode (127.0.0.1:4096), cliente HTTP, endpoint /api/fs/*.

**Decisión:** CONSERVAR via NetworkProvider  
| Chunk | Módulo (vfs) | Posición | Tipo | Especificador | Símbolo(s) | rdeps |
|---|---|---:|---|---|---|---:|
| `chunk_0281_273035654.js` | `chunk-0vp63x7m.js` | 8754 | dynamic-import | `http` | — | 0 |
| `chunk_0074_110139336.js` | `chunk-0yqrnm6m.js` | 606 | esm | `http` | — | 3 |
| `chunk_0454_294653895.js` | `chunk-p1y4s2mr.js` | 7672 | dynamic-import | `http` | — | 0 |
| `chunk_0454_294653895.js` | `chunk-p1y4s2mr.js` | 11455 | dynamic-import | `http` | — | 0 |

### `Bun.serve` — 8 contactos

**Funcionalidad:** Servidor HTTP de Bun. Servidor de desarrollo de Bun (dependencia, no camino critico).

**Decisión:** CONSERVAR (desarrollo)  
| Chunk | Módulo (vfs) | Posición | Tipo | Especificador | Símbolo(s) | rdeps |
|---|---|---:|---|---|---|---:|
| `chunk_0001_54753417.js` | `chunk-7gtsct90.js` | 659864 | bun-global | `Bun.serve` | — | 2 |
| `chunk_0001_54753417.js` | `chunk-7gtsct90.js` | 660426 | bun-global | `Bun.serve` | — | 2 |
| `chunk_0001_54753417.js` | `chunk-7gtsct90.js` | 660566 | bun-global | `Bun.serve` | — | 2 |
| `chunk_0001_54753417.js` | `chunk-7gtsct90.js` | 2964739 | bun-global | `Bun.serve` | — | 2 |
| `chunk_0001_54753417.js` | `chunk-7gtsct90.js` | 3262477 | bun-global | `Bun.serve` | — | 2 |
| `chunk_0001_54753417.js` | `chunk-7gtsct90.js` | 3262779 | bun-global | `Bun.serve` | — | 2 |
| `chunk_0001_54753417.js` | `chunk-7gtsct90.js` | 3282231 | bun-global | `Bun.serve` | — | 2 |
| `chunk_0001_54753417.js` | `chunk-7gtsct90.js` | 3282841 | bun-global | `Bun.serve` | — | 2 |

### `Bun.write` — 7 contactos

**Funcionalidad:** Escritura a un stream (Bun.write). Inspector de depuracion de Bun (uso de desarrollo).

**Decisión:** CONSERVAR (desarrollo) / SUSTITUIR por RuntimeProvider  
| Chunk | Módulo (vfs) | Posición | Tipo | Especificador | Símbolo(s) | rdeps |
|---|---|---:|---|---|---|---:|
| `chunk_0001_54753417.js` | `chunk-7gtsct90.js` | 3259209 | bun-global | `Bun.write` | — | 2 |
| `chunk_0001_54753417.js` | `chunk-7gtsct90.js` | 3259314 | bun-global | `Bun.write` | — | 2 |
| `chunk_0001_54753417.js` | `chunk-7gtsct90.js` | 3259402 | bun-global | `Bun.write` | — | 2 |
| `chunk_0001_54753417.js` | `chunk-7gtsct90.js` | 3259511 | bun-global | `Bun.write` | — | 2 |
| `chunk_0001_54753417.js` | `chunk-7gtsct90.js` | 3259641 | bun-global | `Bun.write` | — | 2 |
| `chunk_0001_54753417.js` | `chunk-7gtsct90.js` | 3259746 | bun-global | `Bun.write` | — | 2 |
| `chunk_0001_54753417.js` | `chunk-7gtsct90.js` | 3259798 | bun-global | `Bun.write` | — | 2 |

### `Bun.env` — 2 contactos

**Funcionalidad:** Entorno de Bun. Drizzle-kit / servidor de desarrollo de Bun (no critico).

**Decisión:** CONSERVAR (desarrollo) / SUSTITUIR por EnvironmentProvider  
| Chunk | Módulo (vfs) | Posición | Tipo | Especificador | Símbolo(s) | rdeps |
|---|---|---:|---|---|---|---:|
| `chunk_0001_54753417.js` | `chunk-7gtsct90.js` | 3134200 | bun-global | `Bun.env` | — | 2 |
| `chunk_0001_54753417.js` | `chunk-7gtsct90.js` | 3277786 | bun-global | `Bun.env` | — | 2 |

### `Bun.spawn` — 1 contactos

**Funcionalidad:** Lanzamiento de proceso (Bun.spawn). Apertura de URL en Android via /system/bin/am (intents).

**Decisión:** CONSERVAR (ya Android-native) / SUSTITUIR por ProcessProvider  
| Chunk | Módulo (vfs) | Posición | Tipo | Especificador | Símbolo(s) | rdeps |
|---|---|---:|---|---|---|---:|
| `chunk_0001_54753417.js` | `chunk-7gtsct90.js` | 3286419 | bun-global | `Bun.spawn` | — | 2 |

### `node:stream/consumers` — 1 contactos

**Funcionalidad:** Consumidores de stream. text(process.stdin) para entrada por stdin.

**Decisión:** CONSERVAR  
| Chunk | Módulo (vfs) | Posición | Tipo | Especificador | Símbolo(s) | rdeps |
|---|---|---:|---|---|---|---:|
| `chunk_0106_118253310.js` | `chunk-3nzdycha.js` | 1 | esm | `stream/consumers` | text | 2 |

### `node:timers` — 2 contactos

**Funcionalidad:** Temporizadores. setTimeout de timers/promises en TUI y cliente mini.

**Decisión:** CONSERVAR  
| Chunk | Módulo (vfs) | Posición | Tipo | Especificador | Símbolo(s) | rdeps |
|---|---|---:|---|---|---|---:|
| `chunk_0449_293706614.js` | `chunk-cwfnnp1q.js` | 388329 | esm | `timers/promises` | setTimeout | 0 |
| `chunk_0403_277022637.js` | `chunk-myg6fkx3.js` | 993 | esm | `timers/promises` | setTimeout | 0 |

### `node:perf_hooks` — 1 contactos

**Funcionalidad:** Metricas de rendimiento. monitorEventLoopDelay en la TUI.

**Decisión:** CONSERVAR (diagnostico) / degradable  
| Chunk | Módulo (vfs) | Posición | Tipo | Especificador | Símbolo(s) | rdeps |
|---|---|---:|---|---|---|---:|
| `chunk_0449_293706614.js` | `chunk-cwfnnp1q.js` | 20714 | esm | `perf_hooks` | monitorEventLoopDelay | 0 |

### `node:inspector` — 0 contactos

**Funcionalidad:** Inspector de Node. Solo referencia textual; sin uso real.

**Decisión:** SIN USO (sin contacto lexical)  
| Chunk | Módulo (vfs) | Posición | Tipo | Especificador | Símbolo(s) | rdeps |
|---|---|---:|---|---|---|---:|

---

## 2.1.3 Dependencias directas, indirectas y transitivas

`rdeps` = número de módulos que dependen (directa o transitivamente) del módulo que contiene el contacto.

| API | Módulos con contacto | rdeps máx. | Alcance transitivo inverso | En los 411 dependientes del núcleo |
|---|---:|---:|---:|---:|
| `node:path` | 61 | 102 | 269 | 239 |
| `node:os` | 50 | 102 | 253 | 228 |
| `node:fs` | 28 | 102 | 266 | 240 |
| `node:crypto` | 21 | 102 | 253 | 228 |
| `node:url` | 19 | 102 | 244 | 221 |
| `node:buffer` | 9 | 95 | 213 | 190 |
| `node:stream` | 7 | 63 | 107 | 88 |
| `node:worker_threads` | 3 | 63 | 83 | 70 |
| `node:net` | 6 | 55 | 76 | 71 |
| `node:https` | 2 | 55 | 76 | 71 |
| `node:fs/promises` | 30 | 52 | 100 | 93 |
| `node:util` | 9 | 52 | 75 | 70 |
| `node:events` | 4 | 52 | 77 | 71 |
| `node:async_hooks` | 3 | 23 | 23 | 23 |
| `node:process` | 3 | 9 | 15 | 14 |
| `node:readline` | 3 | 9 | 20 | 19 |
| `node:tty` | 2 | 9 | 13 | 12 |
| `node:module` | 6 | 8 | 21 | 21 |
| `node:child_process` | 8 | 7 | 16 | 16 |
| `node:stream/promises` | 2 | 7 | 8 | 8 |
| `node:zlib` | 2 | 7 | 8 | 8 |
| `bun:ffi` | 2 | 6 | 8 | 8 |
| `bun:sqlite` | 2 | 6 | 9 | 9 |
| `node:assert` | 1 | 6 | 6 | 6 |
| `Bun.file` | 5 | 4 | 4 | 4 |
| `node:http` | 3 | 3 | 3 | 3 |
| `Bun.serve` | 1 | 2 | 2 | 2 |
| `Bun.write` | 1 | 2 | 2 | 2 |
| `Bun.env` | 1 | 2 | 2 | 2 |
| `Bun.spawn` | 1 | 2 | 2 | 2 |
| `node:stream/consumers` | 1 | 2 | 2 | 2 |
| `node:timers` | 2 | 0 | 0 | 0 |
| `node:perf_hooks` | 1 | 0 | 0 | 0 |
| `node:inspector` | 0 | 0 | — | — |

**Lectura:** el alcance inverso es el número de módulos del motor que quedan alcanzados por la API a través de sus dependientes. Es la medida del radio de impacto de una re-armadura de esa API.
