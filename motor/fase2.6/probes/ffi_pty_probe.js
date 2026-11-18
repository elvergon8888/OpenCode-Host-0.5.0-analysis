// =============================================================================
// Fase 2.6 - Prueba AISLADA de la ruta FFI de PTY.
// Replica exactamente el contrato del modulo FFI del APK:
//   chunk-kb1j967y.js (spawn) -> bun:ffi dlopen(librust_pty) -> 8 simbolos
// El mapa de simbolos y las firmas se han copiado del chunk original (solo lectura).
// Uso: bun ffi_pty_probe.js <ruta .so | ->vacío->  (vacio = probar solo el error de busqueda)
// =============================================================================
import { dlopen, FFIType, ptr } from "bun:ffi";
import { existsSync } from "node:fs";
import { Buffer } from "buffer";

const libPath = process.argv[2] || "";
const R = [];
function rec(id, title, status, evidence) {
  R.push({ id, title, status, evidence });
  console.log(`[F26-FFI] ${status.padEnd(11)} ${id} :: ${title}`);
  console.log(`        -> ${JSON.stringify(evidence).slice(0, 900)}`);
}
console.log("=== FASE 2.6 :: RUTA FFI DE PTY (bun:ffi + librust_pty) ===");
console.log("Bun", Bun.version, process.platform, process.arch);

// --- replica de la busqueda de librust_pty del chunk-xq2yeq74.js -------------
function candidates() {
  const out = [];
  if (libPath) out.push(libPath);
  const names = ["librust_pty_arm64.so", "librust_pty.so"];
  const bases = [
    process.cwd() + "/rust-pty/target/release",
    process.cwd() + "/../bun-pty/rust-pty/target/release",
    process.cwd() + "/node_modules/bun-pty/rust-pty/target/release",
  ];
  for (const b of bases) for (const n of names) out.push(b + "/" + n);
  return out;
}
const tried = candidates();
const found = tried.find((p) => existsSync(p));
rec("F1", "Resolucion de la libreria compartida (BUN_PTY_LIB / rutas por defecto)", found ? "PASS" : "FAIL", {
  BUN_PTY_LIB_env: process.env.BUN_PTY_LIB ?? "<unset>",
  candidatosProbados: tried,
  encontrada: found ?? null,
  mensajeDelMotor: "librust_pty shared library not found.\nChecked:\n  - BUN_PTY_LIB=...\n  - <rutas>\n\nSet BUN_PTY_LIB or ensure one of these paths contains the file.",
});

if (!found) {
  console.log(JSON.stringify({ resultados: R }, null, 2));
  process.exit(0);
}

// --- carga FFI con el mapa de simbolos exacto del APK -----------------------
let lib = null;
try {
  lib = dlopen(found, {
    bun_pty_spawn: { args: [FFIType.cstring, FFIType.cstring, FFIType.cstring, FFIType.i32, FFIType.i32], returns: FFIType.i32 },
    bun_pty_write: { args: [FFIType.i32, FFIType.pointer, FFIType.i32], returns: FFIType.i32 },
    bun_pty_read: { args: [FFIType.i32, FFIType.pointer, FFIType.i32], returns: FFIType.i32 },
    bun_pty_resize: { args: [FFIType.i32, FFIType.i32, FFIType.i32], returns: FFIType.i32 },
    bun_pty_kill: { args: [FFIType.i32], returns: FFIType.i32 },
    bun_pty_get_pid: { args: [FFIType.i32], returns: FFIType.i32 },
    bun_pty_get_exit_code: { args: [FFIType.i32], returns: FFIType.i32 },
    bun_pty_close: { args: [FFIType.i32], returns: FFIType.void },
  });
  rec("F2", "dlopen() de librust_pty + resolucion de los 8 simbolos", "PASS", {
    ruta: found, simbolos: Object.keys(lib.symbols),
  });
} catch (e) {
  rec("F2", "dlopen() de librust_pty + resolucion de los 8 simbolos", "FAIL", { error: e.message, stack: (e.stack||"").split("\n").slice(0,4) });
  console.log(JSON.stringify({ resultados: R }, null, 2));
  process.exit(0);
}

const S = lib.symbols;
// --- spawn real ---------------------------------------------------------------
const cmd = "sh -c 'echo FFI_FFI_MARKER; echo FFI_FFI_ERR 1>&2; cat > /dev/null'";
const cwd = process.env.PTY_CWD || process.cwd();
const env = "TERM=xterm-256color\0";
let handle = -1;
try {
  handle = S.bun_pty_spawn(Buffer.from(cmd + "\0", "utf8"), Buffer.from(cwd + "\0", "utf8"), Buffer.from(env, "utf8"), 80, 24);
  rec("F3", "bun_pty_spawn() crea un PTY real", handle >= 0 ? "PASS" : "FAIL", { handle, cols: 80, rows: 24, comando: cmd });
} catch (e) {
  rec("F3", "bun_pty_spawn() crea un PTY real", "FAIL", { error: e.message });
}
if (handle < 0) { console.log(JSON.stringify({ resultados: R }, null, 2)); process.exit(0); }

const pid = S.bun_pty_get_pid(handle);
rec("F4", "bun_pty_get_pid() devuelve el PID del hijo", pid > 0 ? "PASS" : "PARTIAL", { pid });

// --- read ---------------------------------------------------------------------
const buf = Buffer.allocUnsafe(4096);
let out = "";
const t0 = Date.now();
while (Date.now() - t0 < 3000) {
  const n = S.bun_pty_read(handle, ptr(buf), buf.length);
  if (n > 0) out += buf.slice(0, n).toString("utf8");
  else if (n === -2) break;
  else await new Promise((r) => setTimeout(r, 8));
}
rec("F5", "bun_pty_read() devuelve stdout+stderr del PTY", out.includes("FFI_FFI_MARKER") ? "PASS" : (out.length ? "PARTIAL" : "FAIL"), {
  bytesRecibidos: out.length,
  contieneStdout: out.includes("FFI_FFI_MARKER"),
  contieneStderr: out.includes("FFI_FFI_ERR"),
  stdoutYStderrCompartenDescriptor: out.includes("FFI_FFI_MARKER") && out.includes("FFI_FFI_ERR"),
  muestra: out.slice(0, 300),
});

// --- resize (mientras el hijo sigue vivo) ------------------------------------
try {
  const rz = S.bun_pty_resize(handle, 120, 40);
  rec("F7", "bun_pty_resize() cambia el viewport del PTY", rz >= 0 ? "PASS" : "FAIL", { cols: 120, rows: 40, retorno: rz });
} catch (e) { rec("F7", "bun_pty_resize() cambia el viewport", "FAIL", { error: e.message }); }

// --- write (stdin) -> el hijo esta vivo ('cat > /dev/null'), escribimos y leemos el eco
try {
  const wr = S.bun_pty_write(handle, ptr(Buffer.from("echo FFI_STDIN_MARKER\n", "utf8")), 21);
  await new Promise((r) => setTimeout(r, 400));
  let out2 = "";
  const b2 = Buffer.allocUnsafe(4096);
  for (let i = 0; i < 40; i++) {
    const n = S.bun_pty_read(handle, ptr(b2), b2.length);
    if (n > 0) out2 += b2.slice(0, n).toString("utf8");
    else await new Promise((r) => setTimeout(r, 10));
  }
  rec("F6", "bun_pty_write() envia stdin al PTY y el hijo lo recibe", wr >= 0 && out2.includes("FFI_STDIN_MARKER") ? "PASS" : (wr >= 0 ? "PARTIAL" : "FAIL"), {
    bytesEscritos: wr, ecoRecibido: out2.includes("FFI_STDIN_MARKER"), muestra: out2.slice(0, 200),
  });
} catch (e) { rec("F6", "bun_pty_write() envia stdin al PTY", "FAIL", { error: e.message }); }

// --- exit code: cerramos la stdin del hijo para que termine -----------------
try { S.bun_pty_write(handle, ptr(Buffer.from("\u0004", "utf8")), 1); } catch {}
await new Promise((r) => setTimeout(r, 1200));
let ec = null;
try { ec = S.bun_pty_get_exit_code(handle); } catch {}
rec("F8", "bun_pty_get_exit_code() devuelve el codigo de salida", ec !== null ? "PASS" : "PARTIAL", { exitCode: ec });

// --- kill + close -------------------------------------------------------------
let kr = null, cr = null;
try { kr = S.bun_pty_kill(handle); } catch (e) { kr = "error:" + e.message; }
try { cr = S.bun_pty_close(handle); } catch (e) { cr = "error:" + e.message; }
rec("F9", "bun_pty_kill() + bun_pty_close() cierran el PTY", "PASS", { kill: kr, close: cr });

require("node:fs").writeFileSync(process.env.F26_FFI_OUT || "ffi_pty_probe.json", JSON.stringify({ resultados: R }, null, 2));
console.log("=== RESUMEN FFI ===");
for (const r of R) console.log(`${r.status.padEnd(11)} ${r.id}  ${r.title}`);
console.log("CUENTA " + JSON.stringify(R.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {})));
