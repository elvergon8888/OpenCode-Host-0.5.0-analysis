# Inventario de dependencias de plataforma

Total de APIs de plataforma detectadas: **34**

| API | Modulos | Que es | Estado en Android | Riesgo |
|---|---:|---|---|---|
| `node:path` | 65 | Path de Node | Soportado. | bajo |
| `node:os` | 53 | OS de Node | Soportado. report() da datos Android. | bajo |
| `node:fs` | 31 | Filesystem de Node | Soportado. Requiere mapear paths sandbox Android. | bajo |
| `node:fs/promises` | 30 | node:fs/promises |  | bajo |
| `node:crypto` | 27 | Crypto de Node | Soportado. | bajo |
| `node:url` | 23 | URL de Node | Soportado. | bajo |
| `node:util` | 14 | Util de Node | Soportado. | bajo |
| `node:buffer` | 14 | Buffer de Node | Soportado. | bajo |
| `node:stream` | 12 | Streams de Node | Soportado. | bajo |
| `node:child_process` | 11 | Processos hijo de Node | Funciona parcialmente en node-mobile. Preferir PTY. | medio |
| `node:http` | 9 | HTTP de Node | Soportado. | bajo |
| `node:module` | 9 | Module de Node | Soportado. | bajo |
| `Bun.file` | 8 | API de archivo de Bun | Adjuntos, pty embebido, fileURLToPath. Polyfill sobre node:fs. | medio |
| `node:net` | 8 | Red de Node | Soportado. Servidor local 127.0.0.1 funciona. | bajo |
| `node:async_hooks` | 8 | Async hooks de Node | Soportado parcialmente. | medio |
| `bun:sqlite` | 7 | SQLite embebido de Bun | Motor: sesiones, credenciales, mensajes. NO existe en node-mobile. Requiere N-API bionic. | bajo |
| `bun:ffi` | 7 | FFI de Bun | Motor: carga dinamica de librerias nativas (librust_pty). NO existe en node-mobile. | bajo |
| `node:zlib` | 7 | Zlib de Node | Soportado. | bajo |
| `node:events` | 7 | Events de Node | Soportado. | bajo |
| `node:worker_threads` | 6 | Workers de Node | NO soportado en Android. El motor es Effect-based: usar fibers. | alto |
| `node:readline` | 6 | Readline de Node | Soportado parcialmente. | medio |
| `node:process` | 6 | Process de Node | Soportado. env vars de Android. | bajo |
| `node:https` | 5 | HTTPS de Node | Soportado. | bajo |
| `node:tty` | 5 | TTY de Node | Soportado. Base del PTY. | medio |
| `node:timers` | 5 | Timers de Node | Soportado. | bajo |
| `node:inspector` | 4 | Inspector de Node | No aplica en release. | bajo |
| `node:perf_hooks` | 4 | Perf hooks de Node | No soportado en Android. | medio |
| `node:assert` | 4 | Assert de Node | Soportado. | bajo |
| `Bun.write` | 2 | Escritura via Bun | Escribe archivos. Polyfill sobre node:fs/promises. | medio |
| `node:stream/promises` | 2 | node:stream/promises |  | bajo |
| `Bun.spawn` | 1 | Spawn de Bun | Lanzamiento de procesos. Sustituir por libopencode-pty.so. | bajo |
| `Bun.serve` | 1 | Servidor HTTP de Bun | Servidor HTTP. El motor ya usa node:http/http2. | bajo |
| `Bun.env` | 1 | Bun.env |  | bajo |
| `node:stream/consumers` | 1 | node:stream/consumers |  | bajo |

## Modulos por API

### `node:path` (65 modulos)

- `chunk-7gtsct90.js` (chunk `chunk_0001_54753417.js`, cat `agent`)
- `chunk-4z9vkptb.js` (chunk `chunk_0003_93889274.js`, cat `unclassified`)
- `chunk-a9g7vvqy.js` (chunk `chunk_0004_100299361.js`, cat `unclassified`)
- `chunk-2s7rxcdz.js` (chunk `chunk_0005_101349743.js`, cat `unclassified`)
- `chunk-hergse29.js` (chunk `chunk_0010_101934621.js`, cat `unclassified`)
- `chunk-37zemjkn.js` (chunk `chunk_0067_108811803.js`, cat `unclassified`)
- `chunk-zwsvre1a.js` (chunk `chunk_0079_113208595.js`, cat `unclassified`)
- `chunk-s95j0csq.js` (chunk `chunk_0080_114439853.js`, cat `unclassified`)
- `chunk-cczztrvs.js` (chunk `chunk_0082_114609660.js`, cat `unclassified`)
- `chunk-mwgp5jzm.js` (chunk `chunk_0107_118257543.js`, cat `unclassified`)
- `chunk-n7kh9ry5.js` (chunk `chunk_0108_118284793.js`, cat `unclassified`)
- `chunk-5dvx5qt8.js` (chunk `chunk_0117_122736465.js`, cat `unclassified`)
- `chunk-8g8r3vrh.js` (chunk `chunk_0126_123538032.js`, cat `unclassified`)
- `chunk-0hfmf8xt.js` (chunk `chunk_0131_123734518.js`, cat `unclassified`)
- `chunk-kfqh5r0n.js` (chunk `chunk_0132_123829620.js`, cat `unclassified`)
- `chunk-0w16pvg0.js` (chunk `chunk_0141_124114100.js`, cat `unclassified`)
- `chunk-1pedmecm.js` (chunk `chunk_0143_124152677.js`, cat `unclassified`)
- `chunk-thb6qhb7.js` (chunk `chunk_0144_124321148.js`, cat `unclassified`)
- `chunk-nmc9cxtn.js` (chunk `chunk_0145_140456706.js`, cat `git`)
- `chunk-p5fz0ng1.js` (chunk `chunk_0150_145112393.js`, cat `unclassified`)
- `chunk-9ykqvmfb.js` (chunk `chunk_0151_145327003.js`, cat `unclassified`)
- `chunk-68qvjkq9.js` (chunk `chunk_0152_145359137.js`, cat `unclassified`)
- `chunk-gx66ket5.js` (chunk `chunk_0153_145377358.js`, cat `unclassified`)
- `chunk-2kb25nvv.js` (chunk `chunk_0155_145459483.js`, cat `unclassified`)
- `chunk-zekm22vp.js` (chunk `chunk_0162_146005971.js`, cat `unclassified`)
- `chunk-xahy38ty.js` (chunk `chunk_0163_146135716.js`, cat `unclassified`)
- `chunk-ardh484r.js` (chunk `chunk_0180_158232507.js`, cat `session`)
- `chunk-p7np38cq.js` (chunk `chunk_0181_158268415.js`, cat `unclassified`)
- `chunk-t6qpsd35.js` (chunk `chunk_0182_158519933.js`, cat `unclassified`)
- `chunk-yz2mc1mb.js` (chunk `chunk_0183_158860009.js`, cat `unclassified`)
- `chunk-4vhm3wje.js` (chunk `chunk_0184_159152165.js`, cat `unclassified`)
- `chunk-ctfvsqfc.js` (chunk `chunk_0186_159452129.js`, cat `unclassified`)
- `chunk-mes56ye5.js` (chunk `chunk_0187_161308469.js`, cat `event`)
- `chunk-dpsr58v2.js` (chunk `chunk_0191_161918564.js`, cat `unclassified`)
- `chunk-b2jd3xca.js` (chunk `chunk_0194_162637971.js`, cat `unclassified`)
- `chunk-bj997enm.js` (chunk `chunk_0196_162807342.js`, cat `unclassified`)
- `chunk-4kcbhaah.js` (chunk `chunk_0203_174448085.js`, cat `unclassified`)
- `chunk-0wk6f84s.js` (chunk `chunk_0209_179311894.js`, cat `event`)
- `chunk-yq5qw44s.js` (chunk `chunk_0210_179835193.js`, cat `unclassified`)
- `chunk-j5dn57yp.js` (chunk `chunk_0211_185839942.js`, cat `event`)
- ... y 25 mas

### `node:os` (53 modulos)

- `chunk-7gtsct90.js` (chunk `chunk_0001_54753417.js`, cat `agent`)
- `chunk-a9g7vvqy.js` (chunk `chunk_0004_100299361.js`, cat `unclassified`)
- `chunk-2s7rxcdz.js` (chunk `chunk_0005_101349743.js`, cat `unclassified`)
- `chunk-37zemjkn.js` (chunk `chunk_0067_108811803.js`, cat `unclassified`)
- `chunk-zwsvre1a.js` (chunk `chunk_0079_113208595.js`, cat `unclassified`)
- `chunk-e34sfbe5.js` (chunk `chunk_0104_118238445.js`, cat `unclassified`)
- `chunk-n7kh9ry5.js` (chunk `chunk_0108_118284793.js`, cat `unclassified`)
- `chunk-5dvx5qt8.js` (chunk `chunk_0117_122736465.js`, cat `unclassified`)
- `chunk-8g8r3vrh.js` (chunk `chunk_0126_123538032.js`, cat `unclassified`)
- `chunk-0hfmf8xt.js` (chunk `chunk_0131_123734518.js`, cat `unclassified`)
- `chunk-0w16pvg0.js` (chunk `chunk_0141_124114100.js`, cat `unclassified`)
- `chunk-thb6qhb7.js` (chunk `chunk_0144_124321148.js`, cat `unclassified`)
- `chunk-nmc9cxtn.js` (chunk `chunk_0145_140456706.js`, cat `git`)
- `chunk-xahy38ty.js` (chunk `chunk_0163_146135716.js`, cat `unclassified`)
- `chunk-ctfvsqfc.js` (chunk `chunk_0186_159452129.js`, cat `unclassified`)
- `chunk-dpsr58v2.js` (chunk `chunk_0191_161918564.js`, cat `unclassified`)
- `chunk-bj997enm.js` (chunk `chunk_0196_162807342.js`, cat `unclassified`)
- `chunk-j5dn57yp.js` (chunk `chunk_0211_185839942.js`, cat `event`)
- `chunk-hn275w5h.js` (chunk `chunk_0218_188656639.js`, cat `unclassified`)
- `chunk-9f4f8etn.js` (chunk `chunk_0266_240181111.js`, cat `server`)
- `chunk-2nw5waa2.js` (chunk `chunk_0272_262805653.js`, cat `command`)
- `chunk-09yx2ges.js` (chunk `chunk_0275_272410430.js`, cat `auth`)
- `chunk-n2m5v4sw.js` (chunk `chunk_0388_276732867.js`, cat `unclassified`)
- `chunk-dtzr4w9n.js` (chunk `chunk_0396_276819691.js`, cat `unclassified`)
- `chunk-7p35mz6d.js` (chunk `chunk_0397_276839987.js`, cat `unclassified`)
- `chunk-58nayx9p.js` (chunk `chunk_0398_276874539.js`, cat `unclassified`)
- `chunk-1etnrgwc.js` (chunk `chunk_0399_276904401.js`, cat `unclassified`)
- `chunk-qk8ayt8f.js` (chunk `chunk_0400_276918402.js`, cat `unclassified`)
- `chunk-3kj2qpzg.js` (chunk `chunk_0401_276932136.js`, cat `unclassified`)
- `chunk-2zhxbds0.js` (chunk `chunk_0402_276944482.js`, cat `unclassified`)
- `chunk-k7raz5np.js` (chunk `chunk_0405_277227410.js`, cat `unclassified`)
- `chunk-j48c4w8h.js` (chunk `chunk_0407_277323062.js`, cat `unclassified`)
- `chunk-6emkm07f.js` (chunk `chunk_0408_277341288.js`, cat `unclassified`)
- `chunk-dgv8sqv5.js` (chunk `chunk_0411_277425674.js`, cat `unclassified`)
- `chunk-p636j4am.js` (chunk `chunk_0420_280347800.js`, cat `unclassified`)
- `chunk-0sx5r3nk.js` (chunk `chunk_0421_280391868.js`, cat `unclassified`)
- `chunk-0kzp4zq9.js` (chunk `chunk_0422_280427249.js`, cat `unclassified`)
- `chunk-y9pk5kh7.js` (chunk `chunk_0423_280442400.js`, cat `unclassified`)
- `chunk-rayx4d11.js` (chunk `chunk_0424_280464296.js`, cat `unclassified`)
- `chunk-gp08n9pr.js` (chunk `chunk_0425_280495388.js`, cat `unclassified`)
- ... y 13 mas

### `node:fs` (31 modulos)

- `chunk-7gtsct90.js` (chunk `chunk_0001_54753417.js`, cat `agent`)
- `chunk-4z9vkptb.js` (chunk `chunk_0003_93889274.js`, cat `unclassified`)
- `chunk-a9g7vvqy.js` (chunk `chunk_0004_100299361.js`, cat `unclassified`)
- `chunk-2s7rxcdz.js` (chunk `chunk_0005_101349743.js`, cat `unclassified`)
- `chunk-37zemjkn.js` (chunk `chunk_0067_108811803.js`, cat `unclassified`)
- `chunk-3rkrt7x6.js` (chunk `chunk_0069_108890292.js`, cat `unclassified`)
- `chunk-yfgaxh72.js` (chunk `chunk_0070_108914366.js`, cat `unclassified`)
- `chunk-zwsvre1a.js` (chunk `chunk_0079_113208595.js`, cat `unclassified`)
- `chunk-s95j0csq.js` (chunk `chunk_0080_114439853.js`, cat `unclassified`)
- `chunk-0hfmf8xt.js` (chunk `chunk_0131_123734518.js`, cat `unclassified`)
- `chunk-thb6qhb7.js` (chunk `chunk_0144_124321148.js`, cat `unclassified`)
- `chunk-nmc9cxtn.js` (chunk `chunk_0145_140456706.js`, cat `git`)
- `chunk-zekm22vp.js` (chunk `chunk_0162_146005971.js`, cat `unclassified`)
- `chunk-xahy38ty.js` (chunk `chunk_0163_146135716.js`, cat `unclassified`)
- `chunk-mes56ye5.js` (chunk `chunk_0187_161308469.js`, cat `event`)
- `chunk-dpsr58v2.js` (chunk `chunk_0191_161918564.js`, cat `unclassified`)
- `chunk-kcjcpqq9.js` (chunk `chunk_0195_162742945.js`, cat `unclassified`)
- `chunk-4kcbhaah.js` (chunk `chunk_0203_174448085.js`, cat `unclassified`)
- `chunk-j5dn57yp.js` (chunk `chunk_0211_185839942.js`, cat `event`)
- `chunk-w7kwxfqb.js` (chunk `chunk_0215_188268858.js`, cat `unclassified`)
- `chunk-hn275w5h.js` (chunk `chunk_0218_188656639.js`, cat `unclassified`)
- `chunk-kb1j967y.js` (chunk `chunk_0263_213351226.js`, cat `unclassified`)
- `chunk-9f4f8etn.js` (chunk `chunk_0266_240181111.js`, cat `server`)
- `chunk-xnkmks1t.js` (chunk `chunk_0267_249458502.js`, cat `unclassified`)
- `chunk-2nw5waa2.js` (chunk `chunk_0272_262805653.js`, cat `command`)
- `chunk-09yx2ges.js` (chunk `chunk_0275_272410430.js`, cat `auth`)
- `chunk-25dcn49d.js` (chunk `chunk_0391_276759908.js`, cat `unclassified`)
- `chunk-myg6fkx3.js` (chunk `chunk_0403_277022637.js`, cat `pty`)
- `chunk-1jgc1qk1.js` (chunk `chunk_0445_283263947.js`, cat `unclassified`)
- `chunk-xw18w92h.js` (chunk `chunk_0447_287383431.js`, cat `unclassified`)
- `chunk-cwfnnp1q.js` (chunk `chunk_0449_293706614.js`, cat `unclassified`)

### `node:fs/promises` (30 modulos)

- `chunk-4z9vkptb.js` (chunk `chunk_0003_93889274.js`, cat `unclassified`)
- `chunk-hergse29.js` (chunk `chunk_0010_101934621.js`, cat `unclassified`)
- `chunk-nbjn4zqf.js` (chunk `chunk_0072_109877226.js`, cat `unclassified`)
- `chunk-s95j0csq.js` (chunk `chunk_0080_114439853.js`, cat `unclassified`)
- `chunk-n7kh9ry5.js` (chunk `chunk_0108_118284793.js`, cat `unclassified`)
- `chunk-0hfmf8xt.js` (chunk `chunk_0131_123734518.js`, cat `unclassified`)
- `chunk-thb6qhb7.js` (chunk `chunk_0144_124321148.js`, cat `unclassified`)
- `chunk-nmc9cxtn.js` (chunk `chunk_0145_140456706.js`, cat `git`)
- `chunk-p5fz0ng1.js` (chunk `chunk_0150_145112393.js`, cat `unclassified`)
- `chunk-9ykqvmfb.js` (chunk `chunk_0151_145327003.js`, cat `unclassified`)
- `chunk-68qvjkq9.js` (chunk `chunk_0152_145359137.js`, cat `unclassified`)
- `chunk-gx66ket5.js` (chunk `chunk_0153_145377358.js`, cat `unclassified`)
- `chunk-xahy38ty.js` (chunk `chunk_0163_146135716.js`, cat `unclassified`)
- `chunk-p7np38cq.js` (chunk `chunk_0181_158268415.js`, cat `unclassified`)
- `chunk-mes56ye5.js` (chunk `chunk_0187_161308469.js`, cat `event`)
- `chunk-bj997enm.js` (chunk `chunk_0196_162807342.js`, cat `unclassified`)
- `chunk-0wk6f84s.js` (chunk `chunk_0209_179311894.js`, cat `event`)
- `chunk-j5dn57yp.js` (chunk `chunk_0211_185839942.js`, cat `event`)
- `chunk-9f4f8etn.js` (chunk `chunk_0266_240181111.js`, cat `server`)
- `chunk-2nw5waa2.js` (chunk `chunk_0272_262805653.js`, cat `command`)
- `chunk-09yx2ges.js` (chunk `chunk_0275_272410430.js`, cat `auth`)
- `chunk-myg6fkx3.js` (chunk `chunk_0403_277022637.js`, cat `pty`)
- `chunk-k7raz5np.js` (chunk `chunk_0405_277227410.js`, cat `unclassified`)
- `chunk-0kzp4zq9.js` (chunk `chunk_0422_280427249.js`, cat `unclassified`)
- `chunk-gp08n9pr.js` (chunk `chunk_0425_280495388.js`, cat `unclassified`)
- `chunk-wrkxptbf.js` (chunk `chunk_0438_282978362.js`, cat `unclassified`)
- `chunk-xw18w92h.js` (chunk `chunk_0447_287383431.js`, cat `unclassified`)
- `chunk-210v0c6c.js` (chunk `chunk_0448_287913187.js`, cat `unclassified`)
- `chunk-cwfnnp1q.js` (chunk `chunk_0449_293706614.js`, cat `unclassified`)
- `None` (chunk `chunk_orphan_k7raz5np.js`, cat `unclassified`)

### `node:crypto` (27 modulos)

- `chunk-7gtsct90.js` (chunk `chunk_0001_54753417.js`, cat `agent`)
- `chunk-4z9vkptb.js` (chunk `chunk_0003_93889274.js`, cat `unclassified`)
- `chunk-a9g7vvqy.js` (chunk `chunk_0004_100299361.js`, cat `unclassified`)
- `chunk-2s7rxcdz.js` (chunk `chunk_0005_101349743.js`, cat `unclassified`)
- `chunk-37zemjkn.js` (chunk `chunk_0067_108811803.js`, cat `unclassified`)
- `chunk-zwsvre1a.js` (chunk `chunk_0079_113208595.js`, cat `unclassified`)
- `chunk-s95j0csq.js` (chunk `chunk_0080_114439853.js`, cat `unclassified`)
- `chunk-0w16pvg0.js` (chunk `chunk_0141_124114100.js`, cat `unclassified`)
- `chunk-7zxzqvgc.js` (chunk `chunk_0142_124144631.js`, cat `unclassified`)
- `chunk-thb6qhb7.js` (chunk `chunk_0144_124321148.js`, cat `unclassified`)
- `chunk-nmc9cxtn.js` (chunk `chunk_0145_140456706.js`, cat `git`)
- `chunk-t6qpsd35.js` (chunk `chunk_0182_158519933.js`, cat `unclassified`)
- `chunk-yz2mc1mb.js` (chunk `chunk_0183_158860009.js`, cat `unclassified`)
- `chunk-4vhm3wje.js` (chunk `chunk_0184_159152165.js`, cat `unclassified`)
- `chunk-ctfvsqfc.js` (chunk `chunk_0186_159452129.js`, cat `unclassified`)
- `chunk-bj997enm.js` (chunk `chunk_0196_162807342.js`, cat `unclassified`)
- `chunk-9g497wsj.js` (chunk `chunk_0208_176606090.js`, cat `unclassified`)
- `chunk-0wk6f84s.js` (chunk `chunk_0209_179311894.js`, cat `event`)
- `chunk-w7kwxfqb.js` (chunk `chunk_0215_188268858.js`, cat `unclassified`)
- `chunk-hn275w5h.js` (chunk `chunk_0218_188656639.js`, cat `unclassified`)
- `chunk-j3cfc320.js` (chunk `chunk_0265_213707767.js`, cat `unclassified`)
- `chunk-9f4f8etn.js` (chunk `chunk_0266_240181111.js`, cat `server`)
- `chunk-xnkmks1t.js` (chunk `chunk_0267_249458502.js`, cat `unclassified`)
- `chunk-03myqcgz.js` (chunk `chunk_0270_249980185.js`, cat `event`)
- `chunk-5mbc8t5c.js` (chunk `chunk_0271_250598318.js`, cat `unclassified`)
- `chunk-2nw5waa2.js` (chunk `chunk_0272_262805653.js`, cat `command`)
- `chunk-09yx2ges.js` (chunk `chunk_0275_272410430.js`, cat `auth`)

### `node:url` (23 modulos)

- `chunk-7gtsct90.js` (chunk `chunk_0001_54753417.js`, cat `agent`)
- `chunk-4z9vkptb.js` (chunk `chunk_0003_93889274.js`, cat `unclassified`)
- `chunk-2s7rxcdz.js` (chunk `chunk_0005_101349743.js`, cat `unclassified`)
- `chunk-kfqh5r0n.js` (chunk `chunk_0132_123829620.js`, cat `unclassified`)
- `chunk-thb6qhb7.js` (chunk `chunk_0144_124321148.js`, cat `unclassified`)
- `chunk-nmc9cxtn.js` (chunk `chunk_0145_140456706.js`, cat `git`)
- `chunk-zekm22vp.js` (chunk `chunk_0162_146005971.js`, cat `unclassified`)
- `chunk-xahy38ty.js` (chunk `chunk_0163_146135716.js`, cat `unclassified`)
- `chunk-yz2mc1mb.js` (chunk `chunk_0183_158860009.js`, cat `unclassified`)
- `chunk-mes56ye5.js` (chunk `chunk_0187_161308469.js`, cat `event`)
- `chunk-44nah9ak.js` (chunk `chunk_0204_174454887.js`, cat `unclassified`)
- `chunk-yq5qw44s.js` (chunk `chunk_0210_179835193.js`, cat `unclassified`)
- `chunk-j5dn57yp.js` (chunk `chunk_0211_185839942.js`, cat `event`)
- `chunk-hn275w5h.js` (chunk `chunk_0218_188656639.js`, cat `unclassified`)
- `chunk-n6tj7rny.js` (chunk `chunk_0223_188934803.js`, cat `unclassified`)
- `chunk-9f4f8etn.js` (chunk `chunk_0266_240181111.js`, cat `server`)
- `chunk-2nw5waa2.js` (chunk `chunk_0272_262805653.js`, cat `command`)
- `chunk-7q2shk67.js` (chunk `chunk_0282_273232788.js`, cat `auth`)
- `chunk-3pvznm75.js` (chunk `chunk_0414_279324085.js`, cat `unclassified`)
- `chunk-0sx5r3nk.js` (chunk `chunk_0421_280391868.js`, cat `unclassified`)
- `chunk-wrkxptbf.js` (chunk `chunk_0438_282978362.js`, cat `unclassified`)
- `chunk-1jgc1qk1.js` (chunk `chunk_0445_283263947.js`, cat `unclassified`)
- `chunk-cwfnnp1q.js` (chunk `chunk_0449_293706614.js`, cat `unclassified`)

### `node:util` (14 modulos)

- `chunk-7gtsct90.js` (chunk `chunk_0001_54753417.js`, cat `agent`)
- `chunk-4z9vkptb.js` (chunk `chunk_0003_93889274.js`, cat `unclassified`)
- `chunk-a9g7vvqy.js` (chunk `chunk_0004_100299361.js`, cat `unclassified`)
- `chunk-w59fntk1.js` (chunk `chunk_0068_108834508.js`, cat `unclassified`)
- `chunk-s95j0csq.js` (chunk `chunk_0080_114439853.js`, cat `unclassified`)
- `chunk-thb6qhb7.js` (chunk `chunk_0144_124321148.js`, cat `unclassified`)
- `chunk-nmc9cxtn.js` (chunk `chunk_0145_140456706.js`, cat `git`)
- `chunk-xahy38ty.js` (chunk `chunk_0163_146135716.js`, cat `unclassified`)
- `chunk-4vhm3wje.js` (chunk `chunk_0184_159152165.js`, cat `unclassified`)
- `chunk-j5dn57yp.js` (chunk `chunk_0211_185839942.js`, cat `event`)
- `chunk-9f4f8etn.js` (chunk `chunk_0266_240181111.js`, cat `server`)
- `chunk-2nw5waa2.js` (chunk `chunk_0272_262805653.js`, cat `command`)
- `chunk-pwdfewx0.js` (chunk `chunk_0435_280708196.js`, cat `unclassified`)
- `chunk-wrkxptbf.js` (chunk `chunk_0438_282978362.js`, cat `unclassified`)

### `node:buffer` (14 modulos)

- `chunk-7gtsct90.js` (chunk `chunk_0001_54753417.js`, cat `agent`)
- `chunk-bja4s23x.js` (chunk `chunk_0060_108350648.js`, cat `unclassified`)
- `chunk-gbqvbvbm.js` (chunk `chunk_0090_116022518.js`, cat `unclassified`)
- `chunk-thb6qhb7.js` (chunk `chunk_0144_124321148.js`, cat `unclassified`)
- `chunk-nmc9cxtn.js` (chunk `chunk_0145_140456706.js`, cat `git`)
- `chunk-xahy38ty.js` (chunk `chunk_0163_146135716.js`, cat `unclassified`)
- `chunk-yq5qw44s.js` (chunk `chunk_0210_179835193.js`, cat `unclassified`)
- `chunk-j5dn57yp.js` (chunk `chunk_0211_185839942.js`, cat `event`)
- `chunk-c9dk3vqe.js` (chunk `chunk_0216_188399975.js`, cat `unclassified`)
- `chunk-kb1j967y.js` (chunk `chunk_0263_213351226.js`, cat `unclassified`)
- `chunk-2nw5waa2.js` (chunk `chunk_0272_262805653.js`, cat `command`)
- `chunk-qcpntc9z.js` (chunk `chunk_0274_268438273.js`, cat `unclassified`)
- `chunk-09yx2ges.js` (chunk `chunk_0275_272410430.js`, cat `auth`)
- `None` (chunk `chunk_orphan_qcpntc9z.js`, cat `unclassified`)

### `node:stream` (12 modulos)

- `chunk-7gtsct90.js` (chunk `chunk_0001_54753417.js`, cat `agent`)
- `chunk-thb6qhb7.js` (chunk `chunk_0144_124321148.js`, cat `unclassified`)
- `chunk-nmc9cxtn.js` (chunk `chunk_0145_140456706.js`, cat `git`)
- `chunk-mes56ye5.js` (chunk `chunk_0187_161308469.js`, cat `event`)
- `chunk-nxy0ygzw.js` (chunk `chunk_0189_161867167.js`, cat `unclassified`)
- `chunk-yq5qw44s.js` (chunk `chunk_0210_179835193.js`, cat `unclassified`)
- `chunk-j5dn57yp.js` (chunk `chunk_0211_185839942.js`, cat `event`)
- `chunk-w7kwxfqb.js` (chunk `chunk_0215_188268858.js`, cat `unclassified`)
- `chunk-m0xbh7h1.js` (chunk `chunk_0217_188483466.js`, cat `unclassified`)
- `chunk-wrkxptbf.js` (chunk `chunk_0438_282978362.js`, cat `unclassified`)
- `chunk-xw18w92h.js` (chunk `chunk_0447_287383431.js`, cat `unclassified`)
- `chunk-210v0c6c.js` (chunk `chunk_0448_287913187.js`, cat `unclassified`)

### `node:child_process` (11 modulos)

- `chunk-7gtsct90.js` (chunk `chunk_0001_54753417.js`, cat `agent`)
- `chunk-4z9vkptb.js` (chunk `chunk_0003_93889274.js`, cat `unclassified`)
- `chunk-w59fntk1.js` (chunk `chunk_0068_108834508.js`, cat `unclassified`)
- `chunk-0hfmf8xt.js` (chunk `chunk_0131_123734518.js`, cat `unclassified`)
- `chunk-thb6qhb7.js` (chunk `chunk_0144_124321148.js`, cat `unclassified`)
- `chunk-nmc9cxtn.js` (chunk `chunk_0145_140456706.js`, cat `git`)
- `chunk-xahy38ty.js` (chunk `chunk_0163_146135716.js`, cat `unclassified`)
- `chunk-nxy0ygzw.js` (chunk `chunk_0189_161867167.js`, cat `unclassified`)
- `chunk-w7kwxfqb.js` (chunk `chunk_0215_188268858.js`, cat `unclassified`)
- `chunk-2nw5waa2.js` (chunk `chunk_0272_262805653.js`, cat `command`)
- `chunk-09yx2ges.js` (chunk `chunk_0275_272410430.js`, cat `auth`)

### `node:http` (9 modulos)

- `chunk-7gtsct90.js` (chunk `chunk_0001_54753417.js`, cat `agent`)
- `chunk-0yqrnm6m.js` (chunk `chunk_0074_110139336.js`, cat `unclassified`)
- `chunk-thb6qhb7.js` (chunk `chunk_0144_124321148.js`, cat `unclassified`)
- `chunk-nmc9cxtn.js` (chunk `chunk_0145_140456706.js`, cat `git`)
- `chunk-b42n448f.js` (chunk `chunk_0168_154280940.js`, cat `unclassified`)
- `chunk-e8atd9y6.js` (chunk `chunk_0169_154373206.js`, cat `unclassified`)
- `chunk-depgxf6f.js` (chunk `chunk_0214_187798699.js`, cat `unclassified`)
- `chunk-w7kwxfqb.js` (chunk `chunk_0215_188268858.js`, cat `unclassified`)
- `chunk-9f4f8etn.js` (chunk `chunk_0266_240181111.js`, cat `server`)

### `node:module` (9 modulos)

- `chunk-7gtsct90.js` (chunk `chunk_0001_54753417.js`, cat `agent`)
- `chunk-2s7rxcdz.js` (chunk `chunk_0005_101349743.js`, cat `unclassified`)
- `chunk-thb6qhb7.js` (chunk `chunk_0144_124321148.js`, cat `unclassified`)
- `chunk-nmc9cxtn.js` (chunk `chunk_0145_140456706.js`, cat `git`)
- `chunk-j5dn57yp.js` (chunk `chunk_0211_185839942.js`, cat `event`)
- `chunk-w7kwxfqb.js` (chunk `chunk_0215_188268858.js`, cat `unclassified`)
- `chunk-2nw5waa2.js` (chunk `chunk_0272_262805653.js`, cat `command`)
- `chunk-1jgc1qk1.js` (chunk `chunk_0445_283263947.js`, cat `unclassified`)
- `chunk-210v0c6c.js` (chunk `chunk_0448_287913187.js`, cat `unclassified`)

### `Bun.file` (8 modulos)

- `chunk-7gtsct90.js` (chunk `chunk_0001_54753417.js`, cat `agent`)
- `chunk-4z9vkptb.js` (chunk `chunk_0003_93889274.js`, cat `unclassified`)
- `chunk-kfqh5r0n.js` (chunk `chunk_0132_123829620.js`, cat `unclassified`)
- `chunk-nmc9cxtn.js` (chunk `chunk_0145_140456706.js`, cat `git`)
- `chunk-kb1j967y.js` (chunk `chunk_0263_213351226.js`, cat `unclassified`)
- `chunk-1etnrgwc.js` (chunk `chunk_0399_276904401.js`, cat `unclassified`)
- `chunk-r10780dt.js` (chunk `chunk_0427_280541020.js`, cat `unclassified`)
- `chunk-wrkxptbf.js` (chunk `chunk_0438_282978362.js`, cat `unclassified`)

### `node:net` (8 modulos)

- `chunk-7gtsct90.js` (chunk `chunk_0001_54753417.js`, cat `agent`)
- `chunk-4z9vkptb.js` (chunk `chunk_0003_93889274.js`, cat `unclassified`)
- `chunk-thb6qhb7.js` (chunk `chunk_0144_124321148.js`, cat `unclassified`)
- `chunk-nmc9cxtn.js` (chunk `chunk_0145_140456706.js`, cat `git`)
- `chunk-c9dk3vqe.js` (chunk `chunk_0216_188399975.js`, cat `unclassified`)
- `chunk-xnkmks1t.js` (chunk `chunk_0267_249458502.js`, cat `unclassified`)
- `chunk-2nw5waa2.js` (chunk `chunk_0272_262805653.js`, cat `command`)
- `chunk-210v0c6c.js` (chunk `chunk_0448_287913187.js`, cat `unclassified`)

### `node:async_hooks` (8 modulos)

- `chunk-7gtsct90.js` (chunk `chunk_0001_54753417.js`, cat `agent`)
- `chunk-a9g7vvqy.js` (chunk `chunk_0004_100299361.js`, cat `unclassified`)
- `chunk-thb6qhb7.js` (chunk `chunk_0144_124321148.js`, cat `unclassified`)
- `chunk-nmc9cxtn.js` (chunk `chunk_0145_140456706.js`, cat `git`)
- `chunk-sjfn3wze.js` (chunk `chunk_0260_204808112.js`, cat `unclassified`)
- `chunk-n21h4aaz.js` (chunk `chunk_0261_212898705.js`, cat `unclassified`)
- `chunk-2nw5waa2.js` (chunk `chunk_0272_262805653.js`, cat `command`)
- `chunk-09yx2ges.js` (chunk `chunk_0275_272410430.js`, cat `auth`)

### `bun:sqlite` (7 modulos)

- `chunk-7gtsct90.js` (chunk `chunk_0001_54753417.js`, cat `agent`)
- `chunk-zwsvre1a.js` (chunk `chunk_0079_113208595.js`, cat `unclassified`)
- `chunk-s95j0csq.js` (chunk `chunk_0080_114439853.js`, cat `unclassified`)
- `chunk-y8kny4x5.js` (chunk `chunk_0130_123666289.js`, cat `unclassified`)
- `chunk-0hfmf8xt.js` (chunk `chunk_0131_123734518.js`, cat `unclassified`)
- `chunk-j3cfc320.js` (chunk `chunk_0265_213707767.js`, cat `unclassified`)
- `chunk-9f4f8etn.js` (chunk `chunk_0266_240181111.js`, cat `server`)

### `bun:ffi` (7 modulos)

- `chunk-7gtsct90.js` (chunk `chunk_0001_54753417.js`, cat `agent`)
- `chunk-a9g7vvqy.js` (chunk `chunk_0004_100299361.js`, cat `unclassified`)
- `chunk-2s7rxcdz.js` (chunk `chunk_0005_101349743.js`, cat `unclassified`)
- `chunk-yq5qw44s.js` (chunk `chunk_0210_179835193.js`, cat `unclassified`)
- `chunk-j5dn57yp.js` (chunk `chunk_0211_185839942.js`, cat `event`)
- `chunk-xq2yeq74.js` (chunk `chunk_0262_213305506.js`, cat `unclassified`)
- `chunk-kb1j967y.js` (chunk `chunk_0263_213351226.js`, cat `unclassified`)

### `node:zlib` (7 modulos)

- `chunk-7gtsct90.js` (chunk `chunk_0001_54753417.js`, cat `agent`)
- `chunk-5mqshj7a.js` (chunk `chunk_0097_117089979.js`, cat `unclassified`)
- `chunk-d8zkddbp.js` (chunk `chunk_0098_117782468.js`, cat `unclassified`)
- `chunk-thb6qhb7.js` (chunk `chunk_0144_124321148.js`, cat `unclassified`)
- `chunk-nmc9cxtn.js` (chunk `chunk_0145_140456706.js`, cat `git`)
- `chunk-w7kwxfqb.js` (chunk `chunk_0215_188268858.js`, cat `unclassified`)
- `chunk-xnkmks1t.js` (chunk `chunk_0267_249458502.js`, cat `unclassified`)

### `node:events` (7 modulos)

- `chunk-7gtsct90.js` (chunk `chunk_0001_54753417.js`, cat `agent`)
- `chunk-thb6qhb7.js` (chunk `chunk_0144_124321148.js`, cat `unclassified`)
- `chunk-nmc9cxtn.js` (chunk `chunk_0145_140456706.js`, cat `git`)
- `chunk-mes56ye5.js` (chunk `chunk_0187_161308469.js`, cat `event`)
- `chunk-0wk6f84s.js` (chunk `chunk_0209_179311894.js`, cat `event`)
- `chunk-j5dn57yp.js` (chunk `chunk_0211_185839942.js`, cat `event`)
- `chunk-2nw5waa2.js` (chunk `chunk_0272_262805653.js`, cat `command`)

### `node:worker_threads` (6 modulos)

- `chunk-7gtsct90.js` (chunk `chunk_0001_54753417.js`, cat `agent`)
- `chunk-thb6qhb7.js` (chunk `chunk_0144_124321148.js`, cat `unclassified`)
- `chunk-nmc9cxtn.js` (chunk `chunk_0145_140456706.js`, cat `git`)
- `chunk-yq5qw44s.js` (chunk `chunk_0210_179835193.js`, cat `unclassified`)
- `chunk-j5dn57yp.js` (chunk `chunk_0211_185839942.js`, cat `event`)
- `chunk-z4ny5a8k.js` (chunk `chunk_0483_298212149.js`, cat `unclassified`)

### `node:readline` (6 modulos)

- `chunk-7gtsct90.js` (chunk `chunk_0001_54753417.js`, cat `agent`)
- `chunk-hynpagvj.js` (chunk `chunk_0120_123118606.js`, cat `unclassified`)
- `chunk-thb6qhb7.js` (chunk `chunk_0144_124321148.js`, cat `unclassified`)
- `chunk-nmc9cxtn.js` (chunk `chunk_0145_140456706.js`, cat `git`)
- `chunk-w7kwxfqb.js` (chunk `chunk_0215_188268858.js`, cat `unclassified`)
- `chunk-2nw5waa2.js` (chunk `chunk_0272_262805653.js`, cat `command`)

### `node:process` (6 modulos)

- `chunk-7gtsct90.js` (chunk `chunk_0001_54753417.js`, cat `agent`)
- `chunk-hynpagvj.js` (chunk `chunk_0120_123118606.js`, cat `unclassified`)
- `chunk-thb6qhb7.js` (chunk `chunk_0144_124321148.js`, cat `unclassified`)
- `chunk-nmc9cxtn.js` (chunk `chunk_0145_140456706.js`, cat `git`)
- `chunk-xahy38ty.js` (chunk `chunk_0163_146135716.js`, cat `unclassified`)
- `chunk-2nw5waa2.js` (chunk `chunk_0272_262805653.js`, cat `command`)

### `node:https` (5 modulos)

- `chunk-7gtsct90.js` (chunk `chunk_0001_54753417.js`, cat `agent`)
- `chunk-thb6qhb7.js` (chunk `chunk_0144_124321148.js`, cat `unclassified`)
- `chunk-nmc9cxtn.js` (chunk `chunk_0145_140456706.js`, cat `git`)
- `chunk-b42n448f.js` (chunk `chunk_0168_154280940.js`, cat `unclassified`)
- `chunk-e8atd9y6.js` (chunk `chunk_0169_154373206.js`, cat `unclassified`)

### `node:tty` (5 modulos)

- `chunk-7gtsct90.js` (chunk `chunk_0001_54753417.js`, cat `agent`)
- `chunk-hynpagvj.js` (chunk `chunk_0120_123118606.js`, cat `unclassified`)
- `chunk-thb6qhb7.js` (chunk `chunk_0144_124321148.js`, cat `unclassified`)
- `chunk-nmc9cxtn.js` (chunk `chunk_0145_140456706.js`, cat `git`)
- `chunk-myg6fkx3.js` (chunk `chunk_0403_277022637.js`, cat `pty`)

### `node:timers` (5 modulos)

- `chunk-7gtsct90.js` (chunk `chunk_0001_54753417.js`, cat `agent`)
- `chunk-thb6qhb7.js` (chunk `chunk_0144_124321148.js`, cat `unclassified`)
- `chunk-nmc9cxtn.js` (chunk `chunk_0145_140456706.js`, cat `git`)
- `chunk-myg6fkx3.js` (chunk `chunk_0403_277022637.js`, cat `pty`)
- `chunk-cwfnnp1q.js` (chunk `chunk_0449_293706614.js`, cat `unclassified`)

### `node:inspector` (4 modulos)

- `chunk-7gtsct90.js` (chunk `chunk_0001_54753417.js`, cat `agent`)
- `chunk-thb6qhb7.js` (chunk `chunk_0144_124321148.js`, cat `unclassified`)
- `chunk-nmc9cxtn.js` (chunk `chunk_0145_140456706.js`, cat `git`)
- `chunk-ardh484r.js` (chunk `chunk_0180_158232507.js`, cat `session`)

### `node:perf_hooks` (4 modulos)

- `chunk-7gtsct90.js` (chunk `chunk_0001_54753417.js`, cat `agent`)
- `chunk-thb6qhb7.js` (chunk `chunk_0144_124321148.js`, cat `unclassified`)
- `chunk-nmc9cxtn.js` (chunk `chunk_0145_140456706.js`, cat `git`)
- `chunk-cwfnnp1q.js` (chunk `chunk_0449_293706614.js`, cat `unclassified`)

### `node:assert` (4 modulos)

- `chunk-7gtsct90.js` (chunk `chunk_0001_54753417.js`, cat `agent`)
- `chunk-thb6qhb7.js` (chunk `chunk_0144_124321148.js`, cat `unclassified`)
- `chunk-nmc9cxtn.js` (chunk `chunk_0145_140456706.js`, cat `git`)
- `chunk-bqxkpwa1.js` (chunk `chunk_0197_172462523.js`, cat `unclassified`)

### `Bun.write` (2 modulos)

- `chunk-7gtsct90.js` (chunk `chunk_0001_54753417.js`, cat `agent`)
- `chunk-ardh484r.js` (chunk `chunk_0180_158232507.js`, cat `session`)

### `node:stream/promises` (2 modulos)

- `chunk-w7kwxfqb.js` (chunk `chunk_0215_188268858.js`, cat `unclassified`)
- `chunk-xw18w92h.js` (chunk `chunk_0447_287383431.js`, cat `unclassified`)

### `Bun.spawn` (1 modulos)

- `chunk-7gtsct90.js` (chunk `chunk_0001_54753417.js`, cat `agent`)

### `Bun.serve` (1 modulos)

- `chunk-7gtsct90.js` (chunk `chunk_0001_54753417.js`, cat `agent`)

### `Bun.env` (1 modulos)

- `chunk-7gtsct90.js` (chunk `chunk_0001_54753417.js`, cat `agent`)

### `node:stream/consumers` (1 modulos)

- `chunk-3nzdycha.js` (chunk `chunk_0106_118253310.js`, cat `unclassified`)

