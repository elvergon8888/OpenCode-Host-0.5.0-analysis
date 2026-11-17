# OpenCode-Host 0.5.0-7 — Análisis y desempacado

Desempacado y analizado el APK `OpenCode-Host-0.5.0-7-signed.apk` (114 MB) usando Termux en Android.

- **Paquete:** `app.opencodehost`
- **Etiqueta:** OpenCode
- **Descripción:** `Runs the local OpenCode server on 127.0.0.1`
- **Original:** `/storage/emulated/0/Download/model/Deftcon2/OpenCode-Host-0.5.0-7-signed.apk`

## Estructura del APK (12 archivos)

| Parte | Tamaño | Descripción |
|-------|--------|-------------|
| `classes.dex` | 2.2 MB | Código Kotlin/Java principal (stdlib de Kotlin) |
| `classes2.dex` | 896 B | Solo recursos generados (`R`, `R$xml`) |
| `classes3.dex` | 79 KB | Lógica principal: servicio, actividades, config de proveedores IA |
| `classes4.dex` | 55 KB | MCP probe, actividades y listeners de proveedores |
| `AndroidManifest.xml` | 4.2 KB | Manifiesto (XML binario AXML) |
| `resources.arsc` | 600 B | Tabla de recursos |
| `res/xml/network_security_config.xml` | 552 B | Config de seguridad de red (binario) |
| `lib/arm64-v8a/libopencode.so` | 325 MB | Runtime Node.js embebido (V8 + Node-API) |
| `lib/arm64-v8a/libopencode-pty.so` | 2.9 MB | Pseudo-terminal (PTY) |
| `lib/arm64-v8a/libgit.so` | 3.4 MB | Librería Git |
| `lib/arm64-v8a/libaihub.so` | 121 KB | AI Connection Hub (MCP, WebSocket, JSON-RPC) |
| `lib/arm64-v8a/libopencode-crhandler.so` | 8 KB | Crash handler (SIGSYS / seccomp) |

## Documentación

- [`docs/01-manifiesto.md`](docs/01-manifiesto.md) — componentes, permisos, filtros de intención
- [`docs/02-librarias-nativas.md`](docs/02-librarias-nativas.md) — análisis de cada `.so`
- [`docs/03-codigo-dex.md`](docs/03-codigo-dex.md) — clases y proveedores de IA
- [`docs/04-config-red.md`](docs/04-config-red.md) — network security config

## Arquitectura

```
APK (114 MB)
├── DEX (Kotlin/Java)        → Lógica Android, UI, configuración de proveedores IA
├── libopencode.so (325 MB)  → Node.js embebido + V8 (servidor OpenCode local)
├── libopencode-pty.so       → Terminal pseudo (ejecución de comandos)
├── libgit.so                → Operaciones Git
├── libaihub.so              → Hub multiagente MCP / WebSocket / JSON-RPC
├── libopencode-crhandler.so → Manejador de fallos (seccomp)
└── AndroidManifest          → app.opencodehost, OpencodeService, MainActivity
```

## Qué hace

Host Android que ejecuta un **servidor OpenCode local** (Node.js embebido) accesible en
`127.0.0.1`, con soporte para múltiples proveedores de IA, integración Git, terminal PTY
y un hub de conexión multiagente vía MCP/WebSocket.

## Estructura de este repo

```
.
├── README.md
├── apk/OpenCode-Host-0.5.0-7-signed.apk   (original, Git LFS)
├── unpacked/                              (contenido extraído)
└── docs/                                  (análisis)
```

Los archivos `.apk` y `.so` grandes están gestionados con **Git LFS**.

## Herramientas usadas

`unzip` (system), `strings`, Python 3.14, `git-lfs`, `gh` CLI — todo desde Termux en Android.
