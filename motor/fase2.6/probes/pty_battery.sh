#!/data/data/com.termux/files/usr/bin/bash
# =============================================================================
# Fase 2.6 - Bateria experimental PTY sobre el APK original (OpenCode 2.2.5)
# Servidor: http://127.0.0.1:4096  (proceso original libopencode.so serve)
# Auth: HTTP Basic opencode:$OPENCODE_PASSWORD
# =============================================================================
set -u
PW="${OPENCODE_PASSWORD}"
BASE="http://127.0.0.1:4096"
DIR="/data/data/app.opencodehost/files/home/work"
L=/data/app/app.opencodehost-d0YKWvhGAUJws_Q6Sr_80A==/lib/arm64
BUN="$L/libopencode.so"
RAW="motor/fase2.6/raw/http"
RES="motor/fase2.6/results"
mkdir -p "$RAW" "$RES"
WS() { # WS <url> [args...]
  local url="$1"; shift
  LD_LIBRARY_PATH=$L BUN_BE_BUN=1 timeout 90 "$BUN" run motor/fase2.6/probes/ws_bun.js "$url" "$@" 2>&1
}
AUTH=(-u "opencode:$PW")
echo "=== FASE 2.6 :: BATERIA PTY (servidor vivo del APK) ==="
date -u +"UTC %Y-%m-%dT%H:%M:%SZ"

# ---------------------------------------------------------------- P1 ruta FFI
echo ""
echo "########## P1: ruta FFI (/api/pty -> chunk-xq2yeq74.js -> bun:ffi) ##########"
curl -s -m 25 "${AUTH[@]}" -X POST "$BASE/api/pty" -H 'Content-Type: application/json' \
  -d "{\"command\":\"sh\",\"args\":[\"-c\",\"echo FFI_MARKER; ps -o pid,ppid,comm 2>/dev/null | head -5\"],\"cwd\":\"$DIR\",\"title\":\"f26-P1-ffi\"}" \
  -o "$RAW/p1_ffi_create.json" -w "P1_CREATE_HTTP=%{http_code}\n"
cat "$RAW/p1_ffi_create.json"; echo ""
P1ID=$(python3 -c "import json;print(json.load(open('$RAW/p1_ffi_create.json'))['data']['id'])" 2>/dev/null)
P1PID=$(python3 -c "import json;print(json.load(open('$RAW/p1_ffi_create.json'))['data']['pid'])" 2>/dev/null)
echo "P1_ID=$P1ID P1_PID=$P1PID"
# leer la salida por WS (con ticket de un solo uso)
TICK=$(curl -s -m 20 "${AUTH[@]}" -X POST -H "x-opencode-ticket: 1" "$BASE/api/pty/$P1ID/connect-token" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['ticket'])" 2>/dev/null)
echo "P1_TICKET=$TICK"
WS "ws://127.0.0.1:4096/api/pty/$P1ID/connect?ticket=$TICK" --wait 3000 --out "$RAW/p1_ffi_ws.json" | head -20
echo "--- estado final P1 ---"
curl -s -m 15 "${AUTH[@]}" "$BASE/api/pty/$P1ID" | tee "$RAW/p1_ffi_get.json"; echo ""

# --------------------------------------------------------- P2 ruta helper/daemon
echo ""
echo "########## P2: ruta helper/daemon (OPENCODE_PTY_BIN) ##########"
echo "env OPENCODE_PTY_BIN del servidor:"
tr '\0' '\n' < /proc/24587/environ 2>/dev/null | grep -i "OPENCODE_PTY_BIN" || echo "  (no legible desde este UID)"
echo "binario helper presente en el APK:"
ls -la "$L/libopencode-pty.so" 2>&1 | head -2
echo "-- daemon helper: protocolo service.json + ping/pong (chunk-4z9vkptb.js) --"
"$L/libopencode-pty.so" --help 2>&1 | head -12 || true
echo "P2: el daemon helper 'opencode-pty' es el backend de experimental/persistentPty (ver P10)"

# ---------------------------------------------------- P3 sesion interactiva
echo ""
echo "########## P3: sesion interactiva (sh -i) ##########"
curl -s -m 25 "${AUTH[@]}" -X POST "$BASE/api/pty" -H 'Content-Type: application/json' \
  -d "{\"command\":\"sh\",\"args\":[\"-i\"],\"cwd\":\"$DIR\",\"title\":\"f26-P3-interactive\",\"env\":{\"PS1\":\"P3> \",\"TERM\":\"xterm-256color\"}}" \
  -o "$RAW/p3_create.json" -w "P3_CREATE_HTTP=%{http_code}\n"
P3ID=$(python3 -c "import json;print(json.load(open('$RAW/p3_create.json'))['data']['id'])")
echo "P3_ID=$P3ID"
T3=$(curl -s -m 20 "${AUTH[@]}" -X POST -H "x-opencode-ticket: 1" "$BASE/api/pty/$P3ID/connect-token" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['ticket'])")
WS "ws://127.0.0.1:4096/api/pty/$P3ID/connect?ticket=$T3" --send $'echo P3_INTERACTIVE_MARKER\n' --wait 3500 --out "$RAW/p3_ws.json" | head -20

# ------------------------------------------- P4 ejecutar comandos
echo ""
echo "########## P4: ejecutar comandos (multiples, encadenados) ##########"
curl -s -m 25 "${AUTH[@]}" -X POST "$BASE/api/pty" -H 'Content-Type: application/json' \
  -d "{\"command\":\"sh\",\"args\":[\"-c\",\"echo CMD1; echo CMD2; pwd; uname -m; echo EXIT_CODE_IS_0\"],\"cwd\":\"$DIR\",\"title\":\"f26-P4-commands\"}" \
  -o "$RAW/p4_create.json" -w "P4_CREATE_HTTP=%{http_code}\n"
P4ID=$(python3 -c "import json;print(json.load(open('$RAW/p4_create.json'))['data']['id'])")
sleep 1
T4=$(curl -s -m 20 "${AUTH[@]}" -X POST -H "x-opencode-ticket: 1" "$BASE/api/pty/$P4ID/connect-token" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['ticket'])")
WS "ws://127.0.0.1:4096/api/pty/$P4ID/connect?ticket=$T4" --wait 3000 --out "$RAW/p4_ws.json" | head -20
echo "--- estado P4 (exitCode esperado 0) ---"
curl -s -m 15 "${AUTH[@]}" "$BASE/api/pty/$P4ID" | tee "$RAW/p4_get.json"; echo ""

# --------------------------------- P5 stdin/stdout/stderr (via sesion interactiva)
echo ""
echo "########## P5: stdin/stdout/stderr ##########"
echo "stdout+stderr por el mismo descriptor PTY (semantica de PTY):"
T5=$(curl -s -m 20 "${AUTH[@]}" -X POST -H "x-opencode-ticket: 1" "$BASE/api/pty/$P3ID/connect-token" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['ticket'])")
WS "ws://127.0.0.1:4096/api/pty/$P3ID/connect?ticket=$T5" --send $'echo P5_STDOUT_MARKER; echo P5_STDERR_MARKER 1>&2\n' --wait 3500 --out "$RAW/p5_ws.json" | head -20
echo "--- contraste: /api/shell (no interactivo, stdout/stderr combinados a fichero) ---"
curl -s -m 25 "${AUTH[@]}" -X POST "$BASE/api/shell" -H 'Content-Type: application/json' \
  -d "{\"command\":\"echo P5_SHELL_STDOUT; echo P5_SHELL_STDERR 1>&2; exit 3\",\"cwd\":\"$DIR\"}" \
  -o "$RAW/p5_shell_create.json" -w "P5_SHELL_HTTP=%{http_code}\n"
cat "$RAW/p5_shell_create.json"; echo ""
SHPID=$(python3 -c "import json;print(json.load(open('$RAW/p5_shell_create.json'))['data']['id'])" 2>/dev/null)
sleep 2
echo "--- shell output ---"
curl -s -m 15 "${AUTH[@]}" "$BASE/api/shell/$SHPID/output" | head -c 1200; echo ""

# ---------------------------------------- P6 senales y terminacion
echo ""
echo "########## P6: senales y terminacion (kill del proceso hijo) ##########"
curl -s -m 25 "${AUTH[@]}" -X POST "$BASE/api/pty" -H 'Content-Type: application/json' \
  -d "{\"command\":\"sh\",\"args\":[\"-c\",\"trap 'echo GOT_SIGTERM; exit 42' TERM; echo READY_FOR_SIGNAL; while true; do sleep 1; done\"],\"cwd\":\"$DIR\",\"title\":\"f26-P6-signal\"}" \
  -o "$RAW/p6_create.json" -w "P6_CREATE_HTTP=%{http_code}\n"
P6ID=$(python3 -c "import json;print(json.load(open('$RAW/p6_create.json'))['data']['id'])")
P6PID=$(python3 -c "import json;print(json.load(open('$RAW/p6_create.json'))['data']['pid'])")
echo "P6_ID=$P6ID P6_PID=$P6PID"
sleep 1
echo "-- enviar SIGTERM al PID de la PTY --"
kill -TERM "$P6PID" 2>&1 | head -2 || echo "  (kill desde Termux: permiso denegado si el hijo pertenece a otro UID)"
sleep 2
curl -s -m 15 "${AUTH[@]}" "$BASE/api/pty/$P6ID" | tee "$RAW/p6_get.json"; echo ""
echo "-- P6b: DELETE /api/pty/{id} (terminar+eliminar) --"
curl -s -m 20 "${AUTH[@]}" -X DELETE "$BASE/api/pty/$P6ID" -o /dev/null -w "P6_DELETE_HTTP=%{http_code}\n"
echo "-- P6c: GET tras delete (debe ser 404) --"
curl -s -m 15 "${AUTH[@]}" "$BASE/api/pty/$P6ID" -w "\nP6_GET_AFTER_DELETE_HTTP=%{http_code}\n"

# ---------------------------------------- P7 cierre de sesion
echo ""
echo "########## P7: cierre de sesion ##########"
curl -s -m 25 "${AUTH[@]}" -X POST "$BASE/api/pty" -H 'Content-Type: application/json' \
  -d "{\"command\":\"sh\",\"args\":[\"-c\",\"sleep 60\"],\"cwd\":\"$DIR\",\"title\":\"f26-P7-close\"}" \
  -o "$RAW/p7_create.json" -w "P7_CREATE_HTTP=%{http_code}\n"
P7ID=$(python3 -c "import json;print(json.load(open('$RAW/p7_create.json'))['data']['id'])")
echo "P7_ID=$P7ID"
echo "-- DELETE (cierre) --"
curl -s -m 20 "${AUTH[@]}" -X DELETE "$BASE/api/pty/$P7ID" -o /dev/null -w "P7_DELETE_HTTP=%{http_code}\n"
echo "-- listar tras cierre --"
curl -s -m 15 "${AUTH[@]}" "$BASE/api/pty" | python3 -c "import json,sys;d=json.load(sys.stdin);print('  PTYs restantes:',[p['id'] for p in d['data']])"
echo "-- P7b: PUT /api/pty/{id} (update title + viewport size) --"
curl -s -m 20 "${AUTH[@]}" -X PUT "$BASE/api/pty/$P3ID" -H 'Content-Type: application/json' \
  -d '{"title":"f26-P3-renamed","size":{"rows":40,"cols":120}}' -w "\nP7B_PUT_HTTP=%{http_code}\n"

# ---------------------------------------- P8 deteccion de errores
echo ""
echo "########## P8: deteccion de errores ##########"
echo "-- P8a: comando inexistente --"
curl -s -m 25 "${AUTH[@]}" -X POST "$BASE/api/pty" -H 'Content-Type: application/json' \
  -d "{\"command\":\"no_such_binary_f26\",\"args\":[],\"cwd\":\"$DIR\",\"title\":\"f26-P8a\"}" \
  -o "$RAW/p8a_create.json" -w "P8A_CREATE_HTTP=%{http_code}\n"
cat "$RAW/p8a_create.json"; echo ""
P8A=$(python3 -c "import json;print(json.load(open('$RAW/p8a_create.json'))['data']['id'])" 2>/dev/null)
sleep 2
curl -s -m 15 "${AUTH[@]}" "$BASE/api/pty/$P8A" | tee "$RAW/p8a_get.json"; echo ""
echo "-- P8b: PTY inexistente --"
curl -s -m 15 "${AUTH[@]}" "$BASE/api/pty/pty_doesnotexist" -w "\nP8B_HTTP=%{http_code}\n"
echo "-- P8c: body invalido (command ausente) --"
curl -s -m 15 "${AUTH[@]}" -X POST "$BASE/api/pty" -H 'Content-Type: application/json' -d '{}' -w "\nP8C_HTTP=%{http_code}\n"
echo "-- P8d: comando que falla con exit != 0 --"
curl -s -m 25 "${AUTH[@]}" -X POST "$BASE/api/pty" -H 'Content-Type: application/json' \
  -d "{\"command\":\"sh\",\"args\":[\"-c\",\"exit 7\"],\"cwd\":\"$DIR\",\"title\":\"f26-P8d\"}" \
  -o "$RAW/p8d_create.json" -w "P8D_CREATE_HTTP=%{http_code}\n"
P8D=$(python3 -c "import json;print(json.load(open('$RAW/p8d_create.json'))['data']['id'])")
sleep 2
curl -s -m 15 "${AUTH[@]}" "$BASE/api/pty/$P8D" | tee "$RAW/p8d_get.json"; echo ""

# ---------------------------------------- P9 proceso terminado inesperadamente
echo ""
echo "########## P9: proceso terminado inesperadamente (SIGKILL externo) ##########"
curl -s -m 25 "${AUTH[@]}" -X POST "$BASE/api/pty" -H 'Content-Type: application/json' \
  -d "{\"command\":\"sh\",\"args\":[\"-c\",\"echo WILL_BE_KILLED; sleep 120\"],\"cwd\":\"$DIR\",\"title\":\"f26-P9-kill\"}" \
  -o "$RAW/p9_create.json" -w "P9_CREATE_HTTP=%{http_code}\n"
P9ID=$(python3 -c "import json;print(json.load(open('$RAW/p9_create.json'))['data']['id'])")
P9PID=$(python3 -c "import json;print(json.load(open('$RAW/p9_create.json'))['data']['pid'])")
echo "P9_ID=$P9ID P9_PID=$P9PID"
echo "-- SIGKILL desde el sandbox de la app (mismo UID que el servidor) --"
/system/bin/kill -9 "$P9PID" 2>&1 | head -2 || true
sleep 2
curl -s -m 15 "${AUTH[@]}" "$BASE/api/pty/$P9ID" | tee "$RAW/p9_get.json"; echo ""
echo "-- WS a la PTY muerta (debe cerrar con 4404 'session exited') --"
T9=$(curl -s -m 20 "${AUTH[@]}" -X POST -H "x-opencode-ticket: 1" "$BASE/api/pty/$P9ID/connect-token" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['ticket'])" 2>/dev/null)
if [ -n "$T9" ]; then
  WS "ws://127.0.0.1:4096/api/pty/$P9ID/connect?ticket=$T9" --wait 2500 --out "$RAW/p9_ws.json" | head -12
fi

# ---------------------------------------- P10 ruta helper (persistent-pty)
echo ""
echo "########## P10: ruta helper via experimental/persistent-pty ##########"
echo "-- capabilities de /api/info --"
curl -s -m 15 "${AUTH[@]}" "$BASE/api/info" | tee "$RAW/p10_info.json"; echo ""
echo "-- listar persistent ptys de una sesion (requiere sessionID) --"
curl -s -m 15 "${AUTH[@]}" "$BASE/api/experimental/persistent-pty/handoff" -X POST -w "\nP10_HANDOFF_HTTP=%{http_code}\n" | head -5

echo ""
echo "=== FIN BATERIA PTY ==="
date -u +"UTC %Y-%m-%dT%H:%M:%SZ"
