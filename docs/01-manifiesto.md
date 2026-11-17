# 01 — AndroidManifest.xml

Formato **AXML binario** (Android Binary XML). Decodificado extrayendo el string pool
UTF-16LE con Python 3.14.

## Identidad

| Campo | Valor |
|-------|-------|
| `package` | `app.opencodehost` |
| `label` | `OpenCode` |
| `description` | `Runs the local OpenCode server on 127.0.0.1` |
| `versionName` / `versionCode` | 0.5.0-7 / 7 |
| `minSdkVersion` / `targetSdkVersion` | presentes (binario) |

## Componentes

| Tipo | Clase |
|------|-------|
| Activity (LAUNCHER) | `app.opencodehost.MainActivity` |
| Activity | `app.opencodehost.CompatActivity` |
| Activity | `app.opencodehost.KeysActivity` |
| Activity | `app.opencodehost.ProvidersActivity` |
| Service | `app.opencodehost.OpencodeService` |

## Filtro de intención principal

```xml
<action android:name="android.intent.action.MAIN" />
<category android:name="android.intent.category.LAUNCHER" />
```

## Permisos

| Permiso | Para qué |
|---------|----------|
| `android.permission.INTERNET` | acceso a red (proveedores IA, MCP) |
| `android.permission.POST_NOTIFICATIONS` | notificaciones del servicio |
| `android.permission.FOREGROUND_SERVICE` | servidor OpenCode en primer plano |
| `android.permission.FOREGROUND_SERVICE_SPECIAL_USE` | tipo especial de FGS |
| `android.permission.WAKE_LOCK` | mantener CPU activa con el servicio |

### Atributos FGS

```xml
android:foregroundServiceType="specialUse"
android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE="..."
```

El servicio `OpencodeService` corre como servicio en primer plano de tipo `specialUse`,
justificado por ejecutar el servidor OpenCode local.

## Notas

- `resources.arsc` pesa solo **600 bytes**, anormalmente pequeño para una app con WebView,
  notificaciones y activities → los recursos parecen estar empaquetados en el código o
  las clases R generadas son mínimas (`classes2.dex` = 896 B solo con `R` y `R$xml`).
