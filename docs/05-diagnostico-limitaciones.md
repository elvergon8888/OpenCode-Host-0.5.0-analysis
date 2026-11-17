# 05 — Diagnóstico: ¿dónde está realmente la limitación?

## Tesis a evaluar

> "Z.ai construyó el APK desde el motor nativo de OpenCode, puso 'Android' como
> pretexto para limitar, en vez de adaptar 100% OpenCode; y como no reconstruyó
> todo, creó `opencode-mcp-bridge`, que también está limitado."

## Veredicto por partes

| Parte de la tesis | Veredicto | Evidencia |
|---|---|---|
| El APK se construyó desde el motor de OpenCode | **CONFIRMADO** | `libopencode.so` (325 MB) contiene el bundle JS de OpenCode v2 embebido (string de 8.26 MB) + runtime V8/Node-API |
| El bundle trae la infraestructura real de OpenCode | **CONFIRMADO** | 224 hosts de proveedores en el catálogo embebido, ~8.901 modelos con `price:0`, `models.opencode.ai`, 169 rutas `opencode.ai/inference/*` |
| La UI de la app solo expone 7 proveedores | **CONFIRMADO** | `Config$ApiProvider` hardcodea DeepInfra, OpenAI, Cohere, Google AI Studio, DeepSeek, SiliconFlow, NVIDIA |
| Android fue "pretexto" para limitar | **PARCIALMENTE** | El límite real es de la UI Kotlin (lista fija) + del catálogo de herramientas del bridge, no del runtime |
| El bridge MCP está limitado | **CONFIRMADO** | `tools/list` expone solo ~50 herramientas de superficie Android (browser/files/shell/apps/device) |
| OpenCode upstream no soporta Android | **CONFIRMADO** | `npm i @opencode/cli` → `EBADPLATFORM: wanted {os:darwin,linux,win32}` |

## Dónde está el cuello de botella real

```
┌─ APK (app.opencodehost) ──────────────────────────────────┐
│  OpencodeService → servidor OpenCode en 127.0.0.1:4096     │
│  libopencode.so → bundle completo (224 providers)          │
│  UI Kotlin → Config$ApiProvider (7 hardcodeados)  ◄── LÍMITE│
└────────────────────────────────────────────────────────────┘
                        ▲
┌─ Bridge (com.opencode.mcpbridge) ──────────────────────────┐
│  127.0.0.1:8765/mcp                                        │
│  ~50 tools: browser_*, android_fs_*, android_shell_*, ...   │
│  ◄── LÍMITE: catálogo fijo, fs roots app/ext/sdcard        │
└────────────────────────────────────────────────────────────┘
                        ▲
┌─ Termux ────────────────────────────────────────────────────┐
│  node v26.13.1, npm 12.2.2, git, python3.14, gh            │
│  ~/.config/opencode/opencode.json → MCP remoto "android"   │
│  ◄── LÍMITE: opencode CLI no instala (EBADPLATFORM)        │
└────────────────────────────────────────────────────────────┘
```

### Los 3 límites reales, en orden de impacto

1. **El catálogo de tools del bridge (50 herramientas)** es el límite más visible:
   cada capacidad del dispositivo Android debe estar explícitamente implementada
   en Kotlin en el bridge. No es un problema de OpenCode — es de MCP.

2. **`Config$ApiProvider` hardcodea 7 proveedores** mientras el bundle trae 224.
   El motor puede hablar con los 224; la UI no te deja elegir. Este es un límite
   de *presentación*, no del motor.

3. **Los roots de `android_fs_*`**: `app`, `ext`, `sdcard` (limitado a
   `/storage/emulated/0` con subrutas). De ahí que no puedas compartir archivos
   "directamente": no es que falte la herramienta, es que el path raíz de sdcard
   está vetado en la implementación del bridge.

## Lo que NO es el problema

- **No es falta de providers**: el bundle ya tiene 224 con miles de modelos free.
- **No es que OpenCode sea incompatible con Android**: el bundle corre dentro de
  la APK. Upstream no publica binario Android, pero el runtime (Node 26 / V8) sí
  funciona — de hecho el servidor ya corre en `127.0.0.1:4096`.
- **No es el MCP en sí**: MCP soporta tools arbitrarias; el límite es qué tools
  el bridge decidió implementar.

## Proveedores gratuitos disponibles (models.dev, mismo catálogo del bundle)

79 proveedores con modelos 100% gratuitos. Destacados:

| Proveedor | Modelos free |
|---|---|
| `opencode` (OpenCode Zen) | 52 — `ling-3.1-flash-free`, `minimax-m2.1-free`, `kimi-k2.5-free` |
| `nvidia` | 52 |
| `alibaba-token-plan` | 29 |
| `kilo` | 20 |
| `openrouter` | 17 |
| `zai` | 3 — `glm-4.5-flash`, `glm-4.6v-flash`, `glm-4.7-flash` |
| `huggingface` | 1 — `zai-org/GLM-4.7-Flash` |
| `groq` | 1 — `allam-2-7b` |
| `google` | 4 |
| `cohere` | 2 |

El bundle además referencia `https://models.opencode.ai` y 169 rutas
`opencode.ai/inference/*` → la inferencia gratuita de OpenCode Zen está cableada.

## Vías técnicas viables

### Vía A — Compilar OpenCode upstream para Android (lo que el prompt pedía)
- `@opencode/cli` publica binarios precompilados solo para darwin/linux/win32.
- El repo v2 es TypeScript sobre **Bun** (`packageManager: bun@1.4.4`).
  Compilar con Bun `compile --target=bun-linux-arm64` produce un binario
  **glibc**, no bionic → no corre en Android sin adaptation.
- **Adaptación real**: Bun soporta `bun-linux-arm64` pero el target Android
  requiere patch de platform (exec, fs, spawn). Es trabajo real de días.
- Ya existe base: `nodo/out/ci/android-cross-build.yml` ya cross-compila
  V8 + Rust a `aarch64-linux-android` con NDK r27c, y `patch-rusty-v8.py`
  existe para parchear V8. La infraestructura está.

### Vía B — Node puro en Termux (la más rápida)
- Termux ya tiene **node v26.13.1** y npm.
- `@opencode/cli` v1.19.6 (`opencode-ai`) es un binario Bun; pero el repo v2
  es TS puro y corre con Node/Bun.
- Si se corre el server desde Termux con Node, se obtiene el 100% de las
  capacidades de OpenCode (tools nativas: read/write/edit/bash/glob/grep/webfetch)
  **más** Termux como filesystem real → la limitación del bridge desaparece
  para todo lo que no sea específico de Android.
- El MCP bridge seguiría siendo necesario solo para lo que es Android-específico
  (WebView, intents, apps, cámara).

### Vía C — Extender el bridge (arreglo quirúrgico)
- El bridge es Kotlin con un catálogo fijo. Añadir tools nuevas (p.ej.
  `android_fs_read` sin límite de root, `android_share_file`, `android_termux_*`
  con PTY persistente) es trabajo acotado y de bajo riesgo.
- Es la vía más rápida para eliminar el síntoma "no puedo compartir archivos".

## Combinación recomendada

**B + C**: Node/OpenCode nativo en Termux como cerebro + bridge MCP reducido a
lo genuinamente Android-específico. Elimina la mayor parte de las limitaciones
sin reimplementar el motor, y conserva los providers del catálogo.

Reconstruir el motor desde cero (Vía A) solo se justifica si se quiere
eliminar Termux del medio y分发 una APK 100% autónoma.
