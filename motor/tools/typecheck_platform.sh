#!/usr/bin/env bash
# Fase 2 — type-check del contrato PlatformProvider.
#
# Valida los 11 ficheros TypeScript de motor/platform/ con tsc --noEmit y
# strict:true. NO emite nada y NO toca el motor.
#
# Busca tsc en este orden:
#   1. $REPO/.tscheck/node_modules/typescript/lib/tsc.js   (instalacion local)
#   2. tsc en el PATH
#   3. npx --yes typescript@5 tsc
#
# Codigo de salida: 0 = sin errores, 1 = errores de tipo, 2 = tsc no disponible.
set -uo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO"

TSC_JS="$REPO/.tscheck/node_modules/typescript/lib/tsc.js"
TSCONFIG="$REPO/motor/platform/tsconfig.json"

if [ -f "$TSC_JS" ]; then
  echo "[typecheck] usando instalacion local: $TSC_JS"
  node "$TSC_JS" -p "$TSCONFIG"
  exit $?
fi
if command -v tsc >/dev/null 2>&1; then
  echo "[typecheck] usando tsc del PATH: $(command -v tsc)"
  tsc -p "$TSCONFIG"
  exit $?
fi
if command -v npx >/dev/null 2>&1; then
  echo "[typecheck] usando npx typescript@5"
  npx --yes --package typescript@5 tsc -p "$TSCONFIG"
  exit $?
fi
echo "[typecheck] ERROR: no hay tsc disponible (npm i -D typescript o npx typescript@5)" >&2
exit 2
