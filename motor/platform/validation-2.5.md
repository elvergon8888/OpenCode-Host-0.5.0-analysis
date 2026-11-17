# Fase 2.5 — Validación arquitectónica de la propuesta `PlatformProvider`

Generado por `motor/tools/validate_platform_design.py` (ejecutable, reproducible).

---

## V1 — Cobertura de los puntos de contacto

- Contactos verificados: **565**
- APIs cubiertas: **34/34**
- Interfaces del contrato: **8** → `DatabaseProvider`, `EnvironmentProvider`, `FilesystemProvider`, `NetworkProvider`, `ProcessProvider`, `PtyProvider`, `RuntimeProvider`, `WorkerProvider`
- **Contactos sin destino en el contrato: 0**

### Contactos por interfaz

| Interfaz | Contactos | Módulos con contacto | Suite de equivalencia |
|---|---:|---:|---|
| `DatabaseProvider` | 2 | 2 | DB-01..09, PERS-01..05 |
| `EnvironmentProvider` | 76 | 52 | RT-01, FS-01, PERS-04 |
| `FilesystemProvider` | 138 | 48 | FS-01..08 |
| `NetworkProvider` | 44 | 17 | NET-01..05 |
| `ProcessProvider` | 15 | 9 | PROC-01..05 |
| `PtyProvider` | 10 | 6 | PTY-01..06 |
| `RuntimeProvider` | 277 | 78 | RT-01..06, TOOL-01..05 |
| `WorkerProvider` | 3 | 3 | WORK-01..06 |
| **TOTAL** | **565** | **114** | — |

---

## V2 — Trazabilidad API original → interfaz → implementación → prueba

| API original | Contactos | Interfaz | Implementación Android | Estado | Suite |
|---|---:|---|---|---|---|
| `node:path` | 171 | `RuntimeProvider` | ver compatibility-matrix.md | ver matriz | RT-01..06, TOOL-01..05 |
| `node:os` | 67 | `EnvironmentProvider` | ver compatibility-matrix.md | ver matriz | RT-01, FS-01, PERS-04 |
| `node:fs/promises` | 64 | `FilesystemProvider` | ver compatibility-matrix.md | ver matriz | FS-01..08 |
| `node:fs` | 61 | `FilesystemProvider` | ver compatibility-matrix.md | ver matriz | FS-01..08 |
| `node:crypto` | 35 | `RuntimeProvider` | ver compatibility-matrix.md | ver matriz | RT-01..06, TOOL-01..05 |
| `node:url` | 27 | `RuntimeProvider` | ver compatibility-matrix.md | ver matriz | RT-01..06, TOOL-01..05 |
| `node:child_process` | 14 | `ProcessProvider` | ver compatibility-matrix.md | ver matriz | PROC-01..05 |
| `Bun.file` | 13 | `FilesystemProvider` | ver compatibility-matrix.md | ver matriz | FS-01..08 |
| `node:util` | 13 | `RuntimeProvider` | ver compatibility-matrix.md | ver matriz | RT-01..06, TOOL-01..05 |
| `node:stream` | 12 | `NetworkProvider` | ver compatibility-matrix.md | ver matriz | NET-01..05 |
| `node:buffer` | 9 | `RuntimeProvider` | ver compatibility-matrix.md | ver matriz | RT-01..06, TOOL-01..05 |
| `Bun.serve` | 8 | `NetworkProvider` | ver compatibility-matrix.md | ver matriz | NET-01..05 |
| `Bun.write` | 7 | `RuntimeProvider` | ver compatibility-matrix.md | ver matriz | RT-01..06, TOOL-01..05 |
| `node:module` | 7 | `RuntimeProvider` | ver compatibility-matrix.md | ver matriz | RT-01..06, TOOL-01..05 |
| `node:process` | 7 | `EnvironmentProvider` | ver compatibility-matrix.md | ver matriz | RT-01, FS-01, PERS-04 |
| `node:net` | 6 | `NetworkProvider` | ver compatibility-matrix.md | ver matriz | NET-01..05 |
| `node:events` | 6 | `NetworkProvider` | ver compatibility-matrix.md | ver matriz | NET-01..05 |
| `node:http` | 4 | `NetworkProvider` | ver compatibility-matrix.md | ver matriz | NET-01..05 |
| `node:readline` | 4 | `PtyProvider` | ver compatibility-matrix.md | ver matriz | PTY-01..06 |
| `bun:ffi` | 3 | `PtyProvider` | ver compatibility-matrix.md | ver matriz | PTY-01..06 |
| `node:worker_threads` | 3 | `WorkerProvider` | ver compatibility-matrix.md | ver matriz | WORK-01..06 |
| `node:https` | 3 | `NetworkProvider` | ver compatibility-matrix.md | ver matriz | NET-01..05 |
| `node:tty` | 3 | `PtyProvider` | ver compatibility-matrix.md | ver matriz | PTY-01..06 |
| `node:async_hooks` | 3 | `RuntimeProvider` | ver compatibility-matrix.md | ver matriz | RT-01..06, TOOL-01..05 |
| `node:stream/promises` | 3 | `NetworkProvider` | ver compatibility-matrix.md | ver matriz | NET-01..05 |
| `bun:sqlite` | 2 | `DatabaseProvider` | ver compatibility-matrix.md | ver matriz | DB-01..09, PERS-01..05 |
| `Bun.env` | 2 | `EnvironmentProvider` | ver compatibility-matrix.md | ver matriz | RT-01, FS-01, PERS-04 |
| `node:zlib` | 2 | `NetworkProvider` | ver compatibility-matrix.md | ver matriz | NET-01..05 |
| `node:timers` | 2 | `RuntimeProvider` | ver compatibility-matrix.md | ver matriz | RT-01..06, TOOL-01..05 |
| `Bun.spawn` | 1 | `ProcessProvider` | ver compatibility-matrix.md | ver matriz | PROC-01..05 |
| `node:perf_hooks` | 1 | `RuntimeProvider` | ver compatibility-matrix.md | ver matriz | RT-01..06, TOOL-01..05 |
| `node:assert` | 1 | `RuntimeProvider` | ver compatibility-matrix.md | ver matriz | RT-01..06, TOOL-01..05 |
| `node:stream/consumers` | 1 | `RuntimeProvider` | ver compatibility-matrix.md | ver matriz | RT-01..06, TOOL-01..05 |
| `node:inspector` | 0 | `RuntimeProvider` | ver compatibility-matrix.md | ver matriz | RT-01..06, TOOL-01..05 |

---

## V3 — Núcleo crítico `chunk-n21h4aaz.js` y sus 411 dependientes

**Módulo:** `chunk-n21h4aaz.js` (`chunk_0261_212898705.js`) — 1209 exports, 416467 bytes, 411 dependientes, 1 dependencias, topológico #491.

### 3.1 Contactos de plataforma EN el núcleo

**0 contactos.** El núcleo es un módulo de primitivas compartidas (1.209 exports: helpers de
interop Bun `__toESM`/módulos nativos, utilidades de esquema, etc.). **No toca la plataforma.**
Por tanto **no requiere ninguna modificación** y es el punto de mayor fan-in *invulnerable*:

> `chunk-n21h4aaz.js` no es el lugar donde hay que re-armar. Es el lugar donde **no** hay que tocar nada.

### 3.2 Clasificación de los 411 dependientes

| Categoría | Módulos | % |
|---|---:|---:|
| En la **frontera** (tienen contacto de plataforma directo) | 92 | 22.4 % |
| **Sin** contacto directo (alcanzados a través de la frontera) | 319 | 77.6 % |
| **Total** | **411** | 100 % |

### 3.3 APIs que ve el conjunto de los 411 dependientes

| API | Dependientes del núcleo que la tocan (directo o transitivo) | Interfaz |
|---|---:|---|
| `node:path` | 45 | `RuntimeProvider` |
| `node:os` | 42 | `EnvironmentProvider` |
| `node:fs` | 23 | `FilesystemProvider` |
| `node:fs/promises` | 22 | `FilesystemProvider` |
| `node:crypto` | 17 | `RuntimeProvider` |
| `node:url` | 16 | `RuntimeProvider` |
| `node:util` | 8 | `RuntimeProvider` |
| `node:buffer` | 7 | `RuntimeProvider` |
| `node:net` | 6 | `NetworkProvider` |
| `node:child_process` | 6 | `ProcessProvider` |
| `node:module` | 6 | `RuntimeProvider` |
| `node:stream` | 4 | `NetworkProvider` |
| `Bun.file` | 4 | `FilesystemProvider` |
| `node:async_hooks` | 3 | `RuntimeProvider` |
| `node:readline` | 3 | `PtyProvider` |
| `node:events` | 3 | `NetworkProvider` |
| `node:http` | 3 | `NetworkProvider` |
| `node:https` | 2 | `NetworkProvider` |
| `node:process` | 2 | `EnvironmentProvider` |
| `bun:ffi` | 2 | `PtyProvider` |
| `node:timers` | 2 | `RuntimeProvider` |
| `node:tty` | 2 | `PtyProvider` |
| `node:stream/promises` | 2 | `NetworkProvider` |
| `node:zlib` | 2 | `NetworkProvider` |
| `node:worker_threads` | 2 | `WorkerProvider` |
| `node:assert` | 1 | `RuntimeProvider` |
| `node:perf_hooks` | 1 | `RuntimeProvider` |
| `bun:sqlite` | 1 | `DatabaseProvider` |

**Conclusión V3:** los 411 dependientes del núcleo **no** tocan la plataforma directamente
en su mayoría; la alcanzan a través de los módulos de la frontera, que son precisamente
los que el contrato sustituye. El contrato cubre el **100 %** de los 411: bien en la
frontera (sustitución puntual), bien a través de la frontera (sin tocar el código).

### 3.4 Módulos de la frontera: lista exacta de los puntos de re-armadura

| Chunk | Módulo (vfs) | rdeps | APIs en la frontera | Interfaces |
|---|---|---:|---|---|
| `chunk_0090_116022518.js` | `chunk-gbqvbvbm.js` | 95 | `node:buffer` | `RuntimeProvider` |
| `chunk_0191_161918564.js` | `chunk-dpsr58v2.js` | 68 | `node:fs`, `node:os`, `node:path` | `EnvironmentProvider`, `FilesystemProvider`, `RuntimeProvider` |
| `chunk_0216_188399975.js` | `chunk-c9dk3vqe.js` | 55 | `node:buffer`, `node:https`, `node:net` | `NetworkProvider`, `RuntimeProvider` |
| `chunk_0184_159152165.js` | `chunk-4vhm3wje.js` | 52 | `node:crypto`, `node:path`, `node:util` | `RuntimeProvider` |
| `chunk_0187_161308469.js` | `chunk-mes56ye5.js` | 52 | `node:events`, `node:fs`, `node:fs/promises`, `node:path`, `node:stream`, `node:url`, `node:util` | `FilesystemProvider`, `NetworkProvider`, `RuntimeProvider` |
| `chunk_0194_162637971.js` | `chunk-b2jd3xca.js` | 50 | `node:path` | `RuntimeProvider` |
| `chunk_0182_158519933.js` | `chunk-t6qpsd35.js` | 50 | `node:crypto`, `node:path` | `RuntimeProvider` |
| `chunk_0204_174454887.js` | `chunk-44nah9ak.js` | 50 | `node:url` | `RuntimeProvider` |
| `chunk_0209_179311894.js` | `chunk-0wk6f84s.js` | 49 | `node:crypto`, `node:events`, `node:fs/promises`, `node:path` | `FilesystemProvider`, `NetworkProvider`, `RuntimeProvider` |
| `chunk_0183_158860009.js` | `chunk-yz2mc1mb.js` | 49 | `node:crypto`, `node:fs/promises`, `node:path`, `node:url` | `FilesystemProvider`, `RuntimeProvider` |
| `chunk_0181_158268415.js` | `chunk-p7np38cq.js` | 46 | `node:fs/promises`, `node:path` | `FilesystemProvider`, `RuntimeProvider` |
| `chunk_0142_124144631.js` | `chunk-7zxzqvgc.js` | 41 | `node:crypto` | `RuntimeProvider` |
| `chunk_0141_124114100.js` | `chunk-0w16pvg0.js` | 33 | `node:crypto`, `node:os`, `node:path` | `EnvironmentProvider`, `RuntimeProvider` |
| `chunk_0076_110867574.js` | `chunk-nzqsarz8.js` | 23 | `node:async_hooks` | `RuntimeProvider` |
| `chunk_0079_113208595.js` | `chunk-zwsvre1a.js` | 13 | `node:fs`, `node:os`, `node:path` | `EnvironmentProvider`, `FilesystemProvider`, `RuntimeProvider` |
| `chunk_0072_109877226.js` | `chunk-nbjn4zqf.js` | 11 | `node:fs/promises` | `FilesystemProvider` |
| `chunk_0203_174448085.js` | `chunk-4kcbhaah.js` | 11 | `node:fs`, `node:path` | `FilesystemProvider`, `RuntimeProvider` |
| `chunk_0120_123118606.js` | `chunk-hynpagvj.js` | 9 | `node:process`, `node:readline`, `node:tty` | `EnvironmentProvider`, `PtyProvider` |
| `chunk_0126_123538032.js` | `chunk-8g8r3vrh.js` | 8 | `node:os`, `node:path` | `EnvironmentProvider`, `RuntimeProvider` |
| `chunk_0211_185839942.js` | `chunk-j5dn57yp.js` | 8 | `node:fs`, `node:fs/promises`, `node:module`, `node:path`, `node:url` | `FilesystemProvider`, `RuntimeProvider` |
| `chunk_0070_108914366.js` | `chunk-yfgaxh72.js` | 7 | `node:fs` | `FilesystemProvider` |
| `chunk_0215_188268858.js` | `chunk-w7kwxfqb.js` | 7 | `node:child_process`, `node:crypto`, `node:fs`, `node:module`, `node:readline`, `node:stream`, `node:stream/promises`, `node:zlib` | `FilesystemProvider`, `NetworkProvider`, `ProcessProvider`, `PtyProvider`, `RuntimeProvider` |
| `chunk_0197_172462523.js` | `chunk-bqxkpwa1.js` | 6 | `node:assert` | `RuntimeProvider` |
| `chunk_0080_114439853.js` | `chunk-s95j0csq.js` | 6 | `bun:sqlite`, `node:fs`, `node:fs/promises`, `node:path`, `node:util` | `DatabaseProvider`, `FilesystemProvider`, `RuntimeProvider` |
| `chunk_0005_101349743.js` | `chunk-2s7rxcdz.js` | 6 | `bun:ffi`, `node:crypto`, `node:fs`, `node:module`, `node:os`, `node:path`, `node:url` | `EnvironmentProvider`, `FilesystemProvider`, `PtyProvider`, `RuntimeProvider` |
| `chunk_0011_104837179.js` | `chunk-pyvxqpq5.js` | 5 | `node:crypto` | `RuntimeProvider` |
| `chunk_0003_93889274.js` | `chunk-4z9vkptb.js` | 4 | `Bun.file`, `node:child_process`, `node:crypto`, `node:fs`, `node:fs/promises`, `node:net`, `node:path`, `node:url`, `node:util` | `FilesystemProvider`, `NetworkProvider`, `ProcessProvider`, `RuntimeProvider` |
| `chunk_0223_188934803.js` | `chunk-n6tj7rny.js` | 4 | `node:path`, `node:url` | `RuntimeProvider` |
| `chunk_0029_106192038.js` | `chunk-82masma7.js` | 4 | `node:fs`, `node:os`, `node:path` | `EnvironmentProvider`, `FilesystemProvider`, `RuntimeProvider` |
| `chunk_0162_146005971.js` | `chunk-zekm22vp.js` | 4 | `node:fs`, `node:path`, `node:url` | `FilesystemProvider`, `RuntimeProvider` |
| `chunk_0010_101934621.js` | `chunk-hergse29.js` | 3 | `node:fs/promises`, `node:path` | `FilesystemProvider`, `RuntimeProvider` |
| `chunk_0405_277227410.js` | `chunk-k7raz5np.js` | 3 | `node:fs/promises`, `node:os`, `node:path` | `EnvironmentProvider`, `FilesystemProvider`, `RuntimeProvider` |
| `chunk_0067_108811803.js` | `chunk-37zemjkn.js` | 3 | `node:crypto`, `node:fs`, `node:os`, `node:path` | `EnvironmentProvider`, `FilesystemProvider`, `RuntimeProvider` |
| `chunk_0074_110139336.js` | `chunk-0yqrnm6m.js` | 3 | `node:http` | `NetworkProvider` |
| `chunk_0069_108890292.js` | `chunk-3rkrt7x6.js` | 3 | `node:fs` | `FilesystemProvider` |
| `chunk_0274_268438273.js` | `chunk-qcpntc9z.js` | 3 | `node:buffer` | `RuntimeProvider` |
| `chunk_0068_108834508.js` | `chunk-w59fntk1.js` | 3 | `node:child_process`, `node:util` | `ProcessProvider`, `RuntimeProvider` |
| `chunk_0180_158232507.js` | `chunk-ardh484r.js` | 2 | `node:path` | `RuntimeProvider` |
| `chunk_0144_124321148.js` | `chunk-thb6qhb7.js` | 2 | `node:child_process`, `node:fs/promises`, `node:os`, `node:path` | `EnvironmentProvider`, `FilesystemProvider`, `ProcessProvider`, `RuntimeProvider` |
| `chunk_0438_282978362.js` | `chunk-wrkxptbf.js` | 0 | `Bun.file`, `node:fs/promises`, `node:path`, `node:stream`, `node:url`, `node:util` | `FilesystemProvider`, `NetworkProvider`, `RuntimeProvider` |
| `chunk_0454_294653895.js` | `chunk-p1y4s2mr.js` | 0 | `node:http`, `node:https` | `NetworkProvider` |
| `chunk_0433_280669464.js` | `chunk-rpsd686b.js` | 0 | `node:os` | `EnvironmentProvider` |
| `chunk_0427_280541020.js` | `chunk-r10780dt.js` | 0 | `Bun.file`, `node:os` | `EnvironmentProvider`, `FilesystemProvider` |
| `chunk_0449_293706614.js` | `chunk-cwfnnp1q.js` | 0 | `node:fs`, `node:fs/promises`, `node:os`, `node:path`, `node:perf_hooks`, `node:timers`, `node:url` | `EnvironmentProvider`, `FilesystemProvider`, `RuntimeProvider` |
| `chunk_0275_272410430.js` | `chunk-09yx2ges.js` | 0 | `node:async_hooks`, `node:buffer`, `node:child_process`, `node:crypto`, `node:fs`, `node:fs/promises`, `node:os`, `node:path` | `EnvironmentProvider`, `FilesystemProvider`, `ProcessProvider`, `RuntimeProvider` |
| `chunk_0431_280633797.js` | `chunk-qqwf27h4.js` | 0 | `node:os`, `node:path` | `EnvironmentProvider`, `RuntimeProvider` |
| `chunk_0436_280777742.js` | `chunk-tc7326nq.js` | 0 | `node:path` | `RuntimeProvider` |
| `chunk_0429_280582280.js` | `chunk-8nzvg1cy.js` | 0 | `node:os` | `EnvironmentProvider` |
| `chunk_0425_280495388.js` | `chunk-gp08n9pr.js` | 0 | `node:fs/promises`, `node:os` | `EnvironmentProvider`, `FilesystemProvider` |
| `chunk_0388_276732867.js` | `chunk-n2m5v4sw.js` | 0 | `node:os` | `EnvironmentProvider` |
| `chunk_0334_275399521.js` | `chunk-s94h4j3c.js` | 0 | `node:crypto` | `RuntimeProvider` |
| `chunk_0397_276839987.js` | `chunk-7p35mz6d.js` | 0 | `node:os` | `EnvironmentProvider` |
| `chunk_0414_279324085.js` | `chunk-3pvznm75.js` | 0 | `node:path`, `node:url` | `RuntimeProvider` |
| `chunk_0421_280391868.js` | `chunk-0sx5r3nk.js` | 0 | `node:os`, `node:path`, `node:url` | `EnvironmentProvider`, `RuntimeProvider` |
| `chunk_0439_283164357.js` | `chunk-gar0ypmm.js` | 0 | `node:os` | `EnvironmentProvider` |
| `chunk_0418_280256301.js` | `chunk-vf9agke5.js` | 0 | `node:path` | `RuntimeProvider` |
| `chunk_0426_280512856.js` | `chunk-srd481br.js` | 0 | `node:os` | `EnvironmentProvider` |
| `chunk_0442_283233921.js` | `chunk-j92v9vnb.js` | 0 | `node:os` | `EnvironmentProvider` |
| `chunk_0396_276819691.js` | `chunk-dtzr4w9n.js` | 0 | `node:os` | `EnvironmentProvider` |
| `chunk_0269_249967489.js` | `chunk-23n3wbjy.js` | 0 | `node:worker_threads` | `WorkerProvider` |
| `chunk_0448_287913187.js` | `chunk-210v0c6c.js` | 0 | `node:fs/promises`, `node:module`, `node:net`, `node:os`, `node:path` | `EnvironmentProvider`, `FilesystemProvider`, `NetworkProvider`, `RuntimeProvider` |
| `chunk_0266_240181111.js` | `chunk-9f4f8etn.js` | 0 | `node:crypto`, `node:fs/promises`, `node:net`, `node:os`, `node:path`, `node:url` | `EnvironmentProvider`, `FilesystemProvider`, `NetworkProvider`, `RuntimeProvider` |
| `chunk_0445_283263947.js` | `chunk-1jgc1qk1.js` | 0 | `node:fs`, `node:module`, `node:path`, `node:url` | `FilesystemProvider`, `RuntimeProvider` |
| `chunk_0267_249458502.js` | `chunk-xnkmks1t.js` | 0 | `node:crypto`, `node:fs`, `node:net`, `node:path`, `node:zlib` | `FilesystemProvider`, `NetworkProvider`, `RuntimeProvider` |
| `chunk_0423_280442400.js` | `chunk-y9pk5kh7.js` | 0 | `node:os` | `EnvironmentProvider` |
| `chunk_0415_279578417.js` | `chunk-d8vsw18n.js` | 0 | `node:path` | `RuntimeProvider` |
| `chunk_0282_273232788.js` | `chunk-7q2shk67.js` | 0 | `node:path`, `node:url` | `RuntimeProvider` |
| `chunk_0447_287383431.js` | `chunk-xw18w92h.js` | 0 | `node:fs`, `node:fs/promises`, `node:path`, `node:stream`, `node:stream/promises` | `FilesystemProvider`, `NetworkProvider`, `RuntimeProvider` |
| `chunk_0424_280464296.js` | `chunk-rayx4d11.js` | 0 | `node:os` | `EnvironmentProvider` |
| `chunk_0265_213707767.js` | `chunk-j3cfc320.js` | 0 | `node:crypto` | `RuntimeProvider` |
| `chunk_0281_273035654.js` | `chunk-0vp63x7m.js` | 0 | `node:http` | `NetworkProvider` |
| `chunk_0430_280603320.js` | `chunk-ebjv6219.js` | 0 | `node:os` | `EnvironmentProvider` |
| `chunk_0408_277341288.js` | `chunk-6emkm07f.js` | 0 | `node:os` | `EnvironmentProvider` |
| `chunk_0400_276918402.js` | `chunk-qk8ayt8f.js` | 0 | `node:os` | `EnvironmentProvider` |
| `chunk_0272_262805653.js` | `chunk-2nw5waa2.js` | 0 | `node:async_hooks`, `node:buffer`, `node:child_process`, `node:crypto`, `node:events`, `node:fs`, `node:fs/promises`, `node:module`, `node:net`, `node:os`, `node:path`, `node:process`, `node:readline`, `node:url`, `node:util` | `EnvironmentProvider`, `FilesystemProvider`, `NetworkProvider`, `ProcessProvider`, `PtyProvider`, `RuntimeProvider` |
| `chunk_0403_277022637.js` | `chunk-myg6fkx3.js` | 0 | `node:fs`, `node:fs/promises`, `node:path`, `node:timers`, `node:tty` | `FilesystemProvider`, `PtyProvider`, `RuntimeProvider` |
| `chunk_0407_277323062.js` | `chunk-j48c4w8h.js` | 0 | `node:os` | `EnvironmentProvider` |
| `chunk_0399_276904401.js` | `chunk-1etnrgwc.js` | 0 | `Bun.file`, `node:os`, `node:path` | `EnvironmentProvider`, `FilesystemProvider`, `RuntimeProvider` |
| `chunk_orphan_qcpntc9z.js` | `None` | 0 | `node:buffer` | `RuntimeProvider` |
| `chunk_0420_280347800.js` | `chunk-p636j4am.js` | 0 | `node:os` | `EnvironmentProvider` |
| `chunk_0391_276759908.js` | `chunk-25dcn49d.js` | 0 | `node:fs` | `FilesystemProvider` |
| `chunk_0432_280648960.js` | `chunk-4s5cgpts.js` | 0 | `node:os` | `EnvironmentProvider` |
| `chunk_0440_283189215.js` | `chunk-76dxkyre.js` | 0 | `node:os` | `EnvironmentProvider` |
| `chunk_0483_298212149.js` | `chunk-z4ny5a8k.js` | 0 | `node:worker_threads` | `WorkerProvider` |
| `chunk_0398_276874539.js` | `chunk-58nayx9p.js` | 0 | `node:os` | `EnvironmentProvider` |
| `chunk_0411_277425674.js` | `chunk-dgv8sqv5.js` | 0 | `node:os` | `EnvironmentProvider` |
| `chunk_0402_276944482.js` | `chunk-2zhxbds0.js` | 0 | `node:os` | `EnvironmentProvider` |
| `chunk_0422_280427249.js` | `chunk-0kzp4zq9.js` | 0 | `node:fs/promises`, `node:os`, `node:path` | `EnvironmentProvider`, `FilesystemProvider`, `RuntimeProvider` |
| `chunk_orphan_k7raz5np.js` | `None` | 0 | `node:fs/promises`, `node:os`, `node:path` | `EnvironmentProvider`, `FilesystemProvider`, `RuntimeProvider` |
| `chunk_0401_276932136.js` | `chunk-3kj2qpzg.js` | 0 | `node:os` | `EnvironmentProvider` |
| `chunk_0263_213351226.js` | `chunk-kb1j967y.js` | 0 | `bun:ffi`, `node:buffer`, `node:fs`, `node:path` | `FilesystemProvider`, `PtyProvider`, `RuntimeProvider` |
| `chunk_0435_280708196.js` | `chunk-pwdfewx0.js` | 0 | `node:util` | `RuntimeProvider` |

---

## V4 — Módulos que NO requieren cambio

- Módulos **sin** ningún contacto de plataforma: **379 / 493** (76.9 %)
- Módulos **con** contacto (frontera de re-armadura): **114 / 493** (23.1 %)
- De esos, los que son **dependientes directos del núcleo**: **92**

### Módulos sin contacto, ordenados por criticidad (top 20)

| Chunk | Módulo (vfs) | exports | rdeps | categoría |
|---|---|---:|---:|---|
| `chunk_0261_212898705.js` | `chunk-n21h4aaz.js` | 1209 | 411 | unclassified |
| `chunk_0257_195597878.js` | `chunk-sm7shkgk.js` | 184 | 289 | unclassified |
| `chunk_0259_201156805.js` | `chunk-4gr6ykz6.js` | 3 | 284 | unclassified |
| `chunk_0260_204808112.js` | `chunk-sjfn3wze.js` | 460 | 283 | unclassified |
| `chunk_0250_192460900.js` | `chunk-6yqe1wh2.js` | 9 | 185 | unclassified |
| `chunk_0256_193820987.js` | `chunk-757zpfn8.js` | 14 | 172 | unclassified |
| `chunk_0258_200818870.js` | `chunk-wf5xpb8x.js` | 160 | 167 | unclassified |
| `chunk_0213_187668207.js` | `chunk-v7k69p7c.js` | 53 | 161 | unclassified |
| `chunk_0097_117089979.js` | `chunk-5mqshj7a.js` | 13 | 159 | unclassified |
| `chunk_0255_193607916.js` | `chunk-61588f0g.js` | 12 | 157 | unclassified |
| `chunk_0221_188876729.js` | `chunk-pe8vmq4v.js` | 3 | 155 | unclassified |
| `chunk_0253_193442792.js` | `chunk-88651rnn.js` | 38 | 153 | unclassified |
| `chunk_0228_189630927.js` | `chunk-4ybaaayx.js` | 8 | 150 | unclassified |
| `chunk_0249_192256243.js` | `chunk-dmtjssg8.js` | 6 | 149 | unclassified |
| `chunk_0246_190849514.js` | `chunk-63y5fq64.js` | 5 | 145 | unclassified |
| `chunk_0242_190491744.js` | `chunk-wvqyfdak.js` | 31 | 132 | unclassified |
| `chunk_0243_190683709.js` | `chunk-7zzth1mk.js` | 43 | 131 | unclassified |
| `chunk_0096_116734154.js` | `chunk-kxthv9b5.js` | 1 | 130 | unclassified |
| `chunk_0245_190827752.js` | `chunk-pzvh5c4b.js` | 2 | 128 | unclassified |
| `chunk_0244_190810171.js` | `chunk-rbbjm8fa.js` | 23 | 121 | unclassified |

---

## V5 — Superficie de código que introduce el contrato

| Artefacto | Contenido | Líneas |
|---|---|---:|
| `motor/platform/Platform.ts` | contrato | 226 |
| `motor/platform/contracts/credential.ts` | contrato | 89 |
| `motor/platform/contracts/database.ts` | contrato | 99 |
| `motor/platform/contracts/environment.ts` | contrato | 90 |
| `motor/platform/contracts/filesystem.ts` | contrato | 106 |
| `motor/platform/contracts/index.ts` | contrato | 13 |
| `motor/platform/contracts/network.ts` | contrato | 91 |
| `motor/platform/contracts/process.ts` | contrato | 113 |
| `motor/platform/contracts/pty.ts` | contrato | 88 |
| `motor/platform/contracts/runtime.ts` | contrato | 118 |
| `motor/platform/contracts/worker.ts` | contrato | 86 |
| **Total** | | **1119** |

Comparado con las 565 llamadas a la plataforma que sustituye, el contrato es una
**frontera de ~1.100 líneas** que hace explícito todo lo que hoy está implícito en
imports dispersos. No es una reescritura del motor.

---

## V6 — Type-check del contrato (TypeScript estricto)

**Resultado:** OK — 0 errores de tipo en los 11 ficheros

Comando: `bash motor/tools/typecheck_platform.sh`  
Configuracion: `motor/platform/tsconfig.json` (`strict`, `noUnusedLocals`, `noUnusedParameters`, 
`verbatimModuleSyntax`, `noEmit`).

Alcance: `motor/platform/Platform.ts` + `motor/platform/contracts/*.ts` (11 ficheros).

Esta comprobacion **no** toca el motor: solo analiza el contrato propuesto.

> Control negativo verificado: al inyectar un tipo invalido en `contracts/pty.ts`,
> `tsc` devuelve `error TS2304` y codigo de salida 1. El check detecta fallos reales.

---

## Veredicto

| Comprobación | Resultado |
|---|---|
| V1 Cobertura de contactos | ✅ OK — 0 sin mapear de 565 |
| V2 Trazabilidad de las 34 APIs | ✅ OK — 34/34 |
| V3 Cobertura de los 411 dependientes | ✅ OK — 92 frontera + 319 indirectos = 411 |
| V4 Módulos sin cambio | ✅ 379/493 (76.9 %) |
| V5 Superficie del contrato | ✅ 1119 líneas |
| V6 Type-check del contrato (strict) | ✅ OK — 0 errores de tipo en los 11 ficheros |

**La propuesta cubre el 100 % de las dependencias identificadas**, incluido el núcleo
crítico `chunk-n21h4aaz.js` y sus 411 dependientes.

> Esto **no** autoriza la implementación. La Fase 3 requiere autorización expresa.