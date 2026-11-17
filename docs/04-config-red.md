# 04 — res/xml/network_security_config.xml

Formato **AXML binario**. Contenido reconstruido a partir del string pool.

## Contenido reconstruido

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">127.0.0.1</domain>
        <domain includeSubdomains="true">localhost</domain>
    </domain-config>
</network-security-config>
```

## Strings extraídos

```
network-security-config
base-config
domain-config
cleartextTrafficPermitted
includeSubdomains
127.0.0.1
localhost
domain
```

## Interpretación

- Permite **tráfico en claro (HTTP sin TLS)** — necesario para hablar con el servidor
  OpenCode local que corre en `127.0.0.1`.
- Ancla en los **certificados del sistema** (sin CA propia embebida).
- `includeSubdomains="true"` en los dominios locales.

## Implicación de seguridad

El `cleartextTrafficPermitted` a nivel `base-config` es amplio: aplica a **todos** los
destinos, no solo a localhost. Cualquier tráfico saliente desde la app puede ir sin
cifrar. Para endurecerlo, el `base-config` debería tener `cleartextTrafficPermitted="false"`
y dejar `true` únicamente en el `domain-config` de `127.0.0.1` / `localhost`.
