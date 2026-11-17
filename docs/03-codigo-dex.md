# 03 — Código DEX (clases y proveedores de IA)

Paquete base: **`app.opencodehost`**. Código Kotlin (Kotlin stdlib completo presente
en `classes.dex`).

---

## Reparto por DEX

| DEX | Tamaño | Contenido |
|-----|--------|-----------|
| `classes.dex` | 2.2 MB | Kotlin stdlib + runtime (mayoritariamente biblioteca estándar) |
| `classes2.dex` | 896 B | Solo `app.opencodehost.R` y `R$xml` (recursos compilados) |
| `classes3.dex` | 79 KB | Lógica principal: servicio, actividades, config, permisos |
| `classes4.dex` | 55 KB | MCP probe + activities + listeners de proveedores |

---

## Clases identificadas

### `app.opencodehost.OpencodeService`
Servicio en primer plano. Se observa:
- `onDestroy` (lambda `$this$androidBlock_u24lambda_u249`)
- Bloqueo `androidBlock` con `PowerManager$WakeLock`
- `ProcessBuilder$Redirect` — lanza procesos hijos
- `SharedPreferences` para configuración persistente
- Notificaciones vía `NotificationManager` + `NotificationChannel` + `Notification$Builder`
- `NotificationManager` / `POST_NOTIFICATIONS` (permiso runtime en Android 13+)
- `ClipboardManager` — acceso al portapapeles
- `Settings$Global` — lectura de ajustes globales del sistema
- `ContentResolver` — acceso a providers de contenido
- `AlertDialog$Builder` — diálogos de error

### `app.opencodehost.ProvidersActivity`
Gestión de proveedores de IA. Tiene **18 listeners anónimos** (`$1` … `$18`) y
delegados de `View.OnClickListener`, `DialogInterface`.

### `app.opencodehost.Config$ApiProvider`
Enumeración/configuración de proveedores. Referenciado como
`[Lapp/opencodehost/Config$ApiProvider;` (array).

### `app.opencodehost.McpProbe$Result` (en classes4.dex)
Sonda MCP con:
- `android.intent.action.OPEN_DOCUMENT`
- `android.intent.category.OPENABLE`
- `android.intent.extra.ALLOW_MULTIPLE`
- `SocketTimeoutException` — timeout de red
- `BitmapFactory` — carga de imágenes
- `WebChromeClient` — WebView

### `app.opencodehost.MainActivity` / `CompatActivity` / `KeysActivity`
- `MainActivity` — LAUNCHER
- `CompatActivity` — compatibilidad / WebView (`HttpAuthHandler`, `WebChromeClient`)
- `KeysActivity` — gestión de claves de API

---

## Proveedores de IA detectados

| Proveedor | URL de API | URL de panel de claves |
|-----------|------------|------------------------|
| DeepInfra | `https://api.deepinfra.com/v1/openai` | `https://deepinfra.com/dash/api_keys` |
| OpenAI | — | `https://platform.openai.com/api-keys` |
| Cohere | — | `https://dashboard.cohere.com/api-keys` |
| Google AI Studio | — | `https://aistudio.google.com/app/apikey` |
| DeepSeek | — | `https://platform.deepseek.com/api_keys` |
| SiliconFlow | — | `https://cloud.siliconflow.com/account/ak` |
| NVIDIA | `https://integrate.api.nvidia.com/v1` | — |

Nota: DeepInfra y NVIDIA usan endpoints **compatibles con OpenAI** (`/v1/openai`, `/v1`),
lo que sugiere un cliente único con formato de request estilo OpenAI.

---

## Señales relevantes en el código

```
app.opencodehost 0.4.0 ==          ← string de versión embebido (obsoleto vs 0.5.0)
<<< servidor OpenCode               ← log de arranque del servidor
Termux con opencode-mcp-bridge activo?
opencode:
```

Indicaciones de que la app comprueba la presencia de **Termux** y del
**opencode-mcp-bridge** activo, coordinando ambos componentes.

---

## Stack de Android usado

- `android.webkit.WebChromeClient`, `HttpAuthHandler` → WebView con handler de auth HTTP
- `android.app.NotificationManager` / `NotificationChannel` → servicio en primer plano
- `android.os.PowerManager$WakeLock` → CPU despierta
- `android.content.SharedPreferences` → config persistida
- `android.content.ClipboardManager` → portapapeles
- `android.provider.Settings$Global` → ajustes del sistema
- `android.content.ContentResolver` → content providers
- `android.app.AlertDialog$Builder` → UI de diálogos
