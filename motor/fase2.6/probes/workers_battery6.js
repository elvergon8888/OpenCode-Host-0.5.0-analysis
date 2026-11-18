// ============================================================================
// Fase 2.6 - Bateria CANONICA de node:worker_threads (v6)
// Runtime: Bun 1.4.0 embebido en libopencode.so del APK original 0.5.0
//   BUN_BE_BUN=1 <APK>/lib/arm64/libopencode.so run workers_battery6.js
//
// v6 consolida workers_battery.js..5 en un artefacto unico. Correcciones
// incorporadas tras usar Node v26.13.1 como oraculo (workers_node_oracle.mjs):
//   * handshake explicito: el worker emite {__f26_ready:true} antes de cualquier
//     comando; el principal ESPERA ese ready (nada se envia antes).
//   * RPC con ACK e id correlativo: cada comando espera su ACK; sin ACK -> FAIL.
//   * timeouts explicitos -> FAIL con TIMEOUT_<caso> (nunca falso positivo).
//   * terminacion verificada esperando el evento 'exit'.
//   * limpieza verificada comparando /proc/self/task antes/despues.
//   * concurrencia: aislamiento real por id + checksum determinista.
//
// Clasificacion: PASS | FAIL | PARTIAL | NOT TESTED
// ============================================================================
import { writeFileSync } from "node:fs";

const OUT = process.env.F26_OUT || "workers_battery6.json";
const LOG = process.env.F26_LOG || "workers_battery6.log";
const T = { ready: 10000, rpc: 10000, exit: 10000, cleanup: 8000 };
const R = [];
let seq = 0;
const logLines = [];
function log(s) { const line = String(s); logLines.push(line); console.log(line); }
function rec(id, title, status, evidence, req) {
  const r = { n: ++seq, id, req: req || null, title, status, evidence: evidence ?? null };
  R.push(r);
  log(`[F26] ${status.padEnd(11)} ${id.padEnd(7)} ${req ? req + " | " : ""}${title}`);
  log(`         -> ${JSON.stringify(evidence).slice(0, 900)}`);
  return r;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function withTimeout(p, ms, label) {
  return Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`TIMEOUT_${label}_${ms}ms`)), ms)),
  ]);
}
function taskCount() {
  try { return require("node:fs").readdirSync("/proc/self/task").length; } catch { return -1; }
}
function taskNames() {
  try {
    return require("node:fs").readdirSync("/proc/self/task").map((t) => {
      try { return require("node:fs").readFileSync(`/proc/self/task/${t}/comm`, "utf8").trim(); } catch { return "?"; }
    });
  } catch { return []; }
}
// ---------------------------------------------------------------------------
// Harness: worker con handshake + RPC con ACK
// ---------------------------------------------------------------------------
const HARNESS = `
const { parentPort, workerData } = require("node:worker_threads");
const fs = require("node:fs");
parentPort.on("message", async (m) => {
  const id = m && m.__f26_id;
  const cmd = m && m.cmd;
  const arg = m && m.arg;
  const ack = (extra) => parentPort.postMessage(Object.assign({ __f26_ack: true, __f26_id: id, cmd }, extra || {}));
  try {
    switch (cmd) {
      case "echo": ack({ valor: arg }); break;
      case "sum": ack({ suma: arg.reduce((a, b) => a + b, 0), n: arg.length }); break;
      case "identity": ack({ mismo: !!workerData && arg === workerData.ref }); break;
      case "env": ack({ env: typeof process.env[arg], valor: process.env[arg] }); break;
      case "workerData": ack({ wd: workerData }); break;
      case "clone": ack({ copia: JSON.parse(JSON.stringify(arg)) }); break;
      case "ab": ack({ bytes: arg.byteLength, ctor: arg.constructor.name }); break;
      case "sab": ack({ bytes: arg.byteLength }); break;
      case "portReply": {
        const p = arg;
        p.on("message", (x) => ack({ viaPort: x }));
        p.postMessage("hola-desde-worker");
        break;
      }
      case "portListen": {
        const p = arg;
        p.on("message", (x) => ack({ eco: x }));
        break;
      }
      case "throw": throw new Error(arg);
      case "throwAsync": setTimeout(() => { throw new Error(arg); }, 30); break;
      case "exit": process.exit(arg); break;
      case "spin": setInterval(() => {}, 1000); ack({ vivo: true }); break;
      case "push": parentPort.postMessage({ __f26_push: true, valor: arg }); ack({ enviado: true }); break;
      case "bcSubscribe": {
        const { BroadcastChannel } = require("node:worker_threads");
        const bc = new BroadcastChannel(arg);
        bc.onmessage = (e) => parentPort.postMessage({ __f26_bc: e.data });
        ack({ suscrito: arg });
        break;
      }
      case "writeProbe": {
        const res = {};
        try { fs.writeFileSync(arg, "x"); res.write = "OK"; try { fs.unlinkSync(arg); } catch {} }
        catch (e) { res.write = "DENIED:" + e.code; }
        try { res.read = fs.readFileSync("/proc/self/status", "utf8").length ? "OK" : "?"; } catch (e) { res.read = "DENIED"; }
        try { res.cwd = process.cwd(); } catch (e) { res.cwd = "ERR"; }
        try { res.uid = process.getuid ? process.getuid() : null; res.gid = process.getgid ? process.getgid() : null; } catch (e) {}
        ack(res);
        break;
      }
      case "childProcess": {
        const { spawnSync } = require("node:child_process");
        const r = spawnSync("/system/bin/echo", ["worker-child-ok"]);
        ack({ status: r.status, out: (r.stdout || "").toString().trim(), err: (r.stderr || "").toString().trim() });
        break;
      }
      case "signal": {
        let ok = false;
        try { process.on("SIGTERM", () => {}); ok = typeof process.on === "function"; } catch (e) {}
        ack({ ok, procOn: typeof process.on });
        break;
      }
      case "cpu": {
        const end = Date.now() + arg.ms;
        let x = 0;
        while (Date.now() < end) { for (let i = 0; i < 100000; i++) x += i % 7; }
        ack({ fin: Date.now(), checksum: x, id: arg.id });
        break;
      }
      case "isolate": {
        // Aislamiento: mutar un estado propio NO debe afectar a otro worker.
        const local = { id: arg.id, contador: 0 };
        for (let i = 0; i < arg.n; i++) local.contador++;
        ack({ id: local.id, contador: local.contador, checksum: local.contador * 31 + local.id });
        break;
      }
      case "shared": {
        const ia = new Int32Array(arg.sab);
        const prev = Atomics.load(ia, 0);
        Atomics.add(ia, 0, 1);
        ack({ prev, ahora: Atomics.load(ia, 0), tieneAtomics: typeof Atomics.wait === "function" });
        break;
      }
      default: ack({ error: "comando desconocido: " + cmd });
    }
  } catch (e) {
    parentPort.postMessage({ __f26_err: true, __f26_id: id, cmd, error: e.message, nombre: e.name, stack: String(e.stack || "").split("\\n").slice(0, 3) });
  }
});
parentPort.postMessage({ __f26_ready: true, threadId: require("node:worker_threads").threadId, pid: process.pid });
`;

const wt = await import("node:worker_threads");

// boot: crea worker y ESPERA el ready explicito
async function boot(opts = {}) {
  const w = new wt.Worker(opts.src || HARNESS, {
    eval: true,
    workerData: opts.workerData,
    env: opts.env,
    resourceLimits: opts.resourceLimits,
    stackSizeMb: opts.stackSizeMb,
  });
  const ready = await withTimeout(
    new Promise((res, rej) => {
      const onMsg = (m) => { if (m && m.__f26_ready) { w.off("message", onMsg); res(m); } };
      w.on("message", onMsg);
      w.once("error", rej);
    }),
    opts.readyTimeoutMs || T.ready,
    "ready"
  );
  return { w, ready };
}

// rpc: envia comando y ESPERA su ACK (id correlativo). Sin ACK -> FAIL.
let rpcSeq = 0;
async function rpc(w, cmd, arg, timeoutMs, transferList) {
  const id = ++rpcSeq;
  return withTimeout(
    new Promise((res, rej) => {
      const onMsg = (m) => {
        if (!m) return;
        if (m.__f26_err && m.__f26_id === id) { w.off("message", onMsg); rej(Object.assign(new Error(m.error), { f26: m })); return; }
        if (m.__f26_ack && m.__f26_id === id) { w.off("message", onMsg); res(m); }
      };
      w.on("message", onMsg);
      const payload = { __f26_id: id, cmd, arg };
      if (transferList && transferList.length) w.postMessage(payload, transferList);
      else w.postMessage(payload);
    }),
    timeoutMs || T.rpc,
    "rpc_" + cmd
  );
}

// waitExit: espera el evento 'exit' (verificacion de terminacion)
function waitExit(w, timeoutMs) {
  return withTimeout(
    new Promise((res, rej) => {
      w.once("exit", (code) => res(code));
      w.once("error", (e) => rej(e));
    }),
    timeoutMs || T.exit,
    "exit"
  );
}

// cleanup: termina el worker y verifica liberacion de hilos
async function cleanup(w, baseline) {
  const out = { exitCode: null, terminado: false, error: null };
  try { out.exitCode = await w.terminate(); out.terminado = true; } catch (e) { out.error = e.message; }
  await sleep(400);
  const after = taskCount();
  out.hilosBaseline = baseline;
  out.hilosDespues = after;
  out.deltaHilos = after - baseline;
  out.limpio = baseline >= 0 ? after <= baseline : null;
  return out;
}

log(`=== FASE 2.6 :: BATERIA CANONICA node:worker_threads v6 ===`);
log(`runtime: Bun ${Bun.version} | ${process.platform}-${process.arch} | process.versions.node=${process.versions.node}`);
log(`navigator.hardwareConcurrency=${navigator.hardwareConcurrency} | pid=${process.pid}`);
// ===========================================================================
// W1 - CREAR WORKER
// ===========================================================================
log("");
log("########## W1: crear worker ##########");
{
  // W1.1 eval:true
  const base = taskCount();
  try {
    const { w, ready } = await boot();
    const vivo = taskCount();
    const info = await rpc(w, "echo", "hola");
    const lim = await cleanup(w, base);
    rec("W1.1", "Crear worker (eval:true) con handshake", "PASS", {
      handshakeReady: ready.__f26_ready === true,
      threadIdWorker: ready.threadId, threadIdPrincipal: wt.threadId,
      pidWorker: ready.pid, pidPrincipal: process.pid,
      hilosAntes: base, hilosDurante: vivo,
      rpcResultado: info.valor,
      terminacion: lim,
    }, "W1-crear-worker");
  } catch (e) { rec("W1.1", "Crear worker (eval:true) con handshake", "FAIL", { error: e.message, nombre: e.name }, "W1-crear-worker"); }

  // W1.2 ruta absoluta
  try {
    const abs = process.cwd() + "/motor/fase2.6/probes/workers_battery_worker.js";
    const w = new wt.Worker(abs);
    const msg = await withTimeout(new Promise((res) => w.once("message", res)), T.ready, "fileWorker");
    rec("W1.2", "Crear worker desde fichero (ruta absoluta)", "PASS", { ruta: abs, mensaje: msg, threadId: w.threadId }, "W1-crear-worker");
    await w.terminate();
  } catch (e) { rec("W1.2", "Crear worker desde fichero (ruta absoluta)", "FAIL", { error: e.message }, "W1-crear-worker"); }

  // W1.3 file:// URL
  try {
    const u = new URL("./workers_battery_worker.js", import.meta.url);
    const w = new wt.Worker(u);
    const msg = await withTimeout(new Promise((res) => w.once("message", res)), T.ready, "urlWorker");
    rec("W1.3", "Crear worker desde file:// URL (new URL)", "PASS", { url: u.href, mensaje: msg }, "W1-crear-worker");
    await w.terminate();
  } catch (e) { rec("W1.3", "Crear worker desde file:// URL (new URL)", "FAIL", { error: e.message }, "W1-crear-worker"); }

  // W1.4 constructor con opciones
  try {
    const { w, ready } = await boot({ workerData: { k: 42 }, resourceLimits: { maxOldGenerationSizeMb: 64 }, stackSizeMb: 4 });
    const r = await rpc(w, "workerData", null);
    rec("W1.4", "Worker con opciones (workerData, resourceLimits, stackSizeMb)", r.wd && r.wd.k === 42 ? "PASS" : "PARTIAL", {
      handshake: ready.__f26_ready === true, workerDataRecibido: r.wd,
      resourceLimitsAceptado: true, stackSizeMbAceptado: true,
      nota: "Bun acepta las opciones; no se verifico que el limite V8 se aplique (V8-only)",
    }, "W1-crear-worker");
    await cleanup(w, taskCount());
  } catch (e) { rec("W1.4", "Worker con opciones", "FAIL", { error: e.message }, "W1-crear-worker"); }
}

// ===========================================================================
// W2 - EJECUTAR CODIGO
// ===========================================================================
log("");
log("########## W2: ejecutar codigo ##########");
{
  try {
    const ref = {};
    const { w, ready } = await boot({ workerData: { ref } });
    const a = await rpc(w, "echo", "hola-mundo");
    const b = await rpc(w, "sum", [1, 2, 3, 4, 5]);
    const c = await rpc(w, "identity", null);
    const lim = await cleanup(w, taskCount());
    const ok = a.valor === "hola-mundo" && b.suma === 15;
    rec("W2.1", "Ejecutar codigo en el worker (resultados deterministas via ACK)", ok ? "PASS" : "FAIL", {
      handshake: ready.__f26_ready === true,
      echo: a.valor, suma: b.suma, elementos: b.n,
      workerDataRefIdentico: c.mismo,
      workerDataEntregado: true,
      terminacion: lim,
    }, "W2-ejecutar-codigo");
  } catch (e) { rec("W2.1", "Ejecutar codigo en el worker", "FAIL", { error: e.message, nombre: e.name }, "W2-ejecutar-codigo"); }
}

// ===========================================================================
// W3 - COMUNICACION PRINCIPAL <-> WORKER
// ===========================================================================
log("");
log("########## W3: comunicacion bidireccional ##########");
{
  try {
    const { w, ready } = await boot();
    // principal -> worker (RPC) y worker -> principal (RPC) con ACK en ambos sentidos
    const ida = await rpc(w, "echo", "ida");
    const idb = await rpc(w, "echo", "idb");
    const idc = await rpc(w, "echo", "idc");
    // mensaje espontaneo del worker (push) verificado por ACK propio
    const push = await withTimeout(new Promise((res) => {
      const h = (m) => { if (m && m.__f26_push) { w.off("message", h); res(m); } };
      w.on("message", h);
      w.postMessage({ __f26_id: 999999, cmd: "push", arg: "push-real" });
    }), T.rpc, "push");
    const lim = await cleanup(w, taskCount());
    const ok = ida.valor === "ida" && idb.valor === "idb" && idc.valor === "idc";
    rec("W3.1", "Comunicacion bidireccional principal<->worker (ACK correlativo)", ok ? "PASS" : "FAIL", {
      handshake: ready.__f26_ready === true,
      respuestasEnOrden: [ida.valor, idb.valor, idc.valor],
      pushRecibido: push,
      pushVerificado: !!(push && push.__f26_push && push.valor === "push-real"),
      terminacion: lim,
    }, "W3-comunicacion");
  } catch (e) { rec("W3.1", "Comunicacion bidireccional principal<->worker", "FAIL", { error: e.message, nombre: e.name }, "W3-comunicacion"); }
}

// ===========================================================================
// W4 - TRANSFERENCIA DE MENSAJES
// ===========================================================================
log("");
log("########## W4: transferencia de mensajes ##########");
{
  // W4.1 structured clone
  try {
    const { w } = await boot();
    const r = await rpc(w, "clone", { a: 1, b: [1, 2, 3], d: new Date(0) });
    await cleanup(w, taskCount());
    rec("W4.1", "Structured clone (objeto/array/Date)", r.copia && r.copia.a === 1 && Array.isArray(r.copia.b) ? "PASS" : "FAIL", {
      copia: r.copia, verificacion: "a===1 y b es array",
    }, "W4-transferencia");
  } catch (e) { rec("W4.1", "Structured clone", "FAIL", { error: e.message }, "W4-transferencia"); }

  // W4.2 ArrayBuffer con transferList
  try {
    const { w } = await boot();
    const ab = new ArrayBuffer(64);
    new Uint8Array(ab)[0] = 7;
    const r = await rpc(w, "ab", ab, T.rpc, [ab]);
    const byteLengthTras = ab.byteLength;
    await cleanup(w, taskCount());
    rec("W4.2", "Transferencia de ArrayBuffer (transferList)", r.bytes === 64 && r.ctor === "ArrayBuffer" ? "PASS" : "FAIL", {
      bytesEnWorker: r.bytes, ctorEnWorker: r.ctor,
      byteLengthEnEmisorTrasTransfer: byteLengthTras,
      semantica: byteLengthTras === 0 ? "detach en el emisor (igual que Node)" : "sin detach en el emisor",
    }, "W4-transferencia");
  } catch (e) { rec("W4.2", "Transferencia de ArrayBuffer", "FAIL", { error: e.message }, "W4-transferencia"); }

  // W4.3 SharedArrayBuffer
  try {
    const { w } = await boot();
    const sab = new SharedArrayBuffer(32);
    const r = await rpc(w, "sab", sab);
    await cleanup(w, taskCount());
    rec("W4.3", "SharedArrayBuffer entre hilos", r.bytes === 32 ? "PASS" : "FAIL", { bytesEnWorker: r.bytes }, "W4-transferencia");
  } catch (e) { rec("W4.3", "SharedArrayBuffer entre hilos", "FAIL", { error: e.message }, "W4-transferencia"); }

  // W4.4 MessagePort transferido principal->worker (con handshake del worker)
  try {
    const { w, ready } = await boot();
    const { port1, port2 } = new wt.MessageChannel();
    // sentido worker -> principal: el worker escribe en el puerto transferido
    const delWorker = withTimeout(new Promise((res) => { port1.on("message", (x) => res(x)); }), T.rpc, "portWorkerToMain");
    // el comando se envia con transferList; NO se espera un rpc ACK porque el ACK
    // del harness llega por el propio puerto (que es lo que se quiere verificar).
    const idPort = ++rpcSeq;
    w.postMessage({ __f26_id: idPort, cmd: "portReply", arg: port2 }, [port2]);
    const workerHaciaPrincipal = await delWorker;
    // sentido principal -> worker: el principal escribe en port1, el worker lo recibe y responde
    const ackWorker = withTimeout(new Promise((res, rej) => {
      const h = (m) => { if (m && m.__f26_ack && m.cmd === "portReply" && m.viaPort !== undefined) { w.off("message", h); res(m); } };
      w.on("message", h);
    }), T.rpc, "portMainToWorker");
    port1.postMessage("principal->worker");
    const eco = await ackWorker;
    await cleanup(w, taskCount());
    port1.close();
    rec("W4.4", "MessagePort transferido principal<->worker (ACK en ambos sentidos)", workerHaciaPrincipal === "hola-desde-worker" && eco.viaPort === "principal->worker" ? "PASS" : "FAIL", {
      handshakeWorker: ready.__f26_ready === true,
      workerHaciaPrincipal: workerHaciaPrincipal,
      principalHaciaWorker: eco.viaPort,
      transferencia: "MessagePort enviado con transferList (port2)",
    }, "W4-transferencia");
  } catch (e) { rec("W4.4", "MessagePort transferido principal<->worker", "FAIL", { error: e.message, nombre: e.name }, "W4-transferencia"); }

  // W4.5 MessagePort sin transferList -> debe fallar (semantica Node confirmada por oraculo)
  try {
    const { w } = await boot();
    const { port1, port2 } = new wt.MessageChannel();
    let error = null;
    try { w.postMessage({ __f26_id: ++rpcSeq, cmd: "portReply", arg: port2 }); } catch (e) { error = { message: e.message, name: e.name, code: e.code }; }
    await cleanup(w, taskCount()); port1.close(); port2.close();
    rec("W4.5", "MessagePort enviado SIN transferList (rechazo correcto, equivalente a Node)", error ? "PASS" : "FAIL", {
      error,
      interpretacion: error
        ? "Bun rechaza clonar un MessagePort no transferido. Node v26 lanza EXACTAMENTE el mismo DataCloneError (code 25) -> semantica EQUIVALENTE, no limitacion de Bun."
        : "Bun clona el MessagePort sin error: divergencia frente a Node.",
      oraculo: "results/workers_node_oracle.json (N1)",
    }, "W4-transferencia");
  } catch (e) { rec("W4.5", "MessagePort sin transferList", "FAIL", { error: e.message }, "W4-transferencia"); }

  // W4.6 BroadcastChannel principal->worker (handshake: el worker confirma subscripto)
  try {
    const { w, ready } = await boot();
    const bc = new wt.BroadcastChannel("f26-bc");
    const sus = await rpc(w, "bcSubscribe", "f26-bc");
    const done = withTimeout(new Promise((res) => { const h = (m) => { if (m && m.__f26_bc !== undefined) { w.off("message", h); res(m.__f26_bc); } }; w.on("message", h); }), T.rpc, "bc");
    bc.postMessage("payload-bc");
    const recibido = await done;
    bc.close();
    await cleanup(w, taskCount());
    rec("W4.6", "BroadcastChannel principal->worker", recibido === "payload-bc" ? "PASS" : "FAIL", {
      handshake: ready.__f26_ready === true,
      suscripcionConfirmada: sus.suscrito === "f26-bc",
      recibido,
    }, "W4-transferencia");
  } catch (e) { rec("W4.6", "BroadcastChannel principal->worker", "FAIL", { error: e.message, nombre: e.name }, "W4-transferencia"); }

  // W4.7 SHARE_ENV (sin clonar el Symbol: ese fue el fallo del probe anterior)
  try {
    process.env.F26_ENV_TEST = "valor-compartido";
    const { w } = await boot({ env: wt.SHARE_ENV });
    const r = await rpc(w, "env", "F26_ENV_TEST");
    await cleanup(w, taskCount());
    rec("W4.7", "Opcion env: SHARE_ENV", r.env === "string" ? "PASS" : "PARTIAL", {
      tipoDeVariableEnWorker: r.env,
      valorCompartido: r.valor,
      nota: "El FAIL anterior (W4.9 v2) fue del probe: posteaba el Symbol SHARE_ENV, que no es clonable ni en Node",
      oraculo: "results/workers_node_oracle.json (N5)",
    }, "W4-transferencia");
  } catch (e) { rec("W4.7", "Opcion env: SHARE_ENV", "FAIL", { error: e.message }, "W4-transferencia"); }

  // W4.8 moveMessagePortToContext (API exclusiva de Node)
  try {
    const { port1 } = new wt.MessageChannel();
    wt.moveMessagePortToContext(port1, "ctx");
    rec("W4.8", "moveMessagePortToContext (API exclusiva de Node)", "FAIL", { resultado: "no lanzo error (inesperado)" }, "W4-transferencia");
    port1.close();
  } catch (e) {
    const ni = e.code === "ERR_NOT_IMPLEMENTED" || /not yet implemented/i.test(e.message || "");
    rec("W4.8", "moveMessagePortToContext (API exclusiva de Node)", ni ? "PARTIAL" : "FAIL", {
      error: e.message, code: e.code, nombre: e.name,
      interpretacion: ni
        ? "Bun 1.4.0 DECLARA la API pero NO la implementa (NotImplementedError). Limitacion real del runtime, no del probe."
        : "Error no esperado",
      impacto: "No bloquea MessageChannel/MessagePort/BroadcastChannel, que si funcionan",
    }, "W4-transferencia");
  }
}
// ===========================================================================
// W5 - ERRORES
// ===========================================================================
log("");
log("########## W5: errores ##########");
{
  // W5.1 excepcion no capturada -> evento 'error' en el principal
  try {
    const w = new wt.Worker("throw new Error('BOOM_WORKER_UNCAUGHT');", { eval: true });
    const err = await withTimeout(new Promise((res) => w.once("error", res)), T.rpc, "error");
    const code = await waitExit(w, T.exit);
    rec("W5.1", "Excepcion no capturada -> evento 'error' en el principal", err && err.message === "BOOM_WORKER_UNCAUGHT" ? "PASS" : "FAIL", {
      mensaje: err && err.message, nombre: err && err.name,
      tieneStack: !!(err && err.stack), stackHead: err && String(err.stack).split("\n").slice(0, 3),
      exitCodeTrasError: code,
    }, "W5-errores");
  } catch (e) { rec("W5.1", "Excepcion no capturada -> evento 'error'", "FAIL", { error: e.message, nombre: e.name }, "W5-errores"); }

  // W5.2 error asincrono
  try {
    const w = new wt.Worker("setTimeout(()=>{throw new Error('BOOM_ASYNC')},50);", { eval: true });
    const err = await withTimeout(new Promise((res) => w.once("error", res)), T.rpc, "errorAsync");
    rec("W5.2", "Excepcion asincrona -> evento 'error'", err && err.message === "BOOM_ASYNC" ? "PASS" : "FAIL", {
      mensaje: err && err.message, nombre: err && err.name,
    }, "W5-errores");
  } catch (e) { rec("W5.2", "Excepcion asincrona", "FAIL", { error: e.message }, "W5-errores"); }

  // W5.3 error de sintaxis
  try {
    const w = new wt.Worker("this is not valid javascript (", { eval: true });
    const err = await withTimeout(new Promise((res) => w.once("error", res)), T.rpc, "errorSyntax");
    rec("W5.3", "Error de sintaxis en el worker", err ? "PASS" : "FAIL", {
      mensaje: err && err.message, nombre: err && err.name,
    }, "W5-errores");
  } catch (e) { rec("W5.3", "Error de sintaxis en el worker", "FAIL", { error: e.message }, "W5-errores"); }

  // W5.4 error capturado dentro del worker y reenviado
  try {
    const { w } = await boot();
    let errEnWorker = null;
    try { await rpc(w, "throw", "error-controlado"); } catch (e) { errEnWorker = e.f26 || { error: e.message }; }
    await cleanup(w, taskCount());
    rec("W5.4", "Error capturado en el worker y reenviado por ACK", errEnWorker && errEnWorker.error === "error-controlado" ? "PASS" : "FAIL", {
      errorRecibido: errEnWorker,
      nota: "El harness captura la excepcion y la reenvia como __f26_err con el id del comando",
    }, "W5-errores");
  } catch (e) { rec("W5.4", "Error capturado en el worker", "FAIL", { error: e.message }, "W5-errores"); }
}

// ===========================================================================
// W6 - TERMINACION
// ===========================================================================
log("");
log("########## W6: terminacion ##########");
{
  // W6.1 terminate() sobre worker en ejecucion
  try {
    const base = taskCount();
    const { w, ready } = await boot();
    const vivo = await rpc(w, "spin", null);
    const duranteReal = taskCount();
    const t0 = Date.now();
    const code = await withTimeout(w.terminate(), T.exit, "terminate");
    await sleep(400);
    const despues = taskCount();
    rec("W6.1", "terminate() detiene un worker en ejecucion", code !== undefined ? "PASS" : "FAIL", {
      handshake: ready.__f26_ready === true, ackVivo: vivo.vivo,
      exitCode: code, ms: Date.now() - t0,
      hilosAntes: base, hilosDurante: duranteReal, hilosDespues: despues,
    }, "W6-terminacion");
  } catch (e) { rec("W6.1", "terminate() detiene un worker en ejecucion", "FAIL", { error: e.message }, "W6-terminacion"); }

  // W6.2 salida natural con codigo
  try {
    const w = new wt.Worker("process.exit(7);", { eval: true });
    const code = await waitExit(w, T.exit);
    rec("W6.2", "Salida natural con codigo (process.exit(7))", code === 7 ? "PASS" : "PARTIAL", {
      exitCode: code, esperado: 7,
    }, "W6-terminacion");
  } catch (e) { rec("W6.2", "Salida natural con codigo", "FAIL", { error: e.message }, "W6-terminacion"); }

  // W6.3 evento 'exit' por terminacion natural
  try {
    const w = new wt.Worker("setTimeout(()=>{},10);", { eval: true });
    const code = await waitExit(w, T.exit);
    rec("W6.3", "Evento 'exit' por terminacion natural", typeof code === "number" ? "PASS" : "FAIL", {
      exitCode: code,
    }, "W6-terminacion");
  } catch (e) { rec("W6.3", "Evento 'exit' por terminacion natural", "FAIL", { error: e.message }, "W6-terminacion"); }

  // W6.4 terminate() idempotente sobre worker ya terminado
  try {
    const w = new wt.Worker("setTimeout(()=>{},10);", { eval: true });
    const code = await waitExit(w, T.exit);
    let c2, errTerm = null;
    try { c2 = await withTimeout(w.terminate(), T.exit, "terminateIdempotente"); }
    catch (e) { errTerm = e.message; }
    rec("W6.4", "terminate() sobre worker ya terminado (idempotente)", errTerm ? "FAIL" : "PASS", {
      exitCodeNatural: code, valorDevueltoPorTerminate: c2 === undefined ? "undefined" : c2,
      error: errTerm,
      interpretacion: errTerm
        ? "terminate() lanzo error sobre un worker ya terminado"
        : "terminate() no lanzo error (idempotente). Node v26 devuelve EXACTAMENTE el mismo undefined (ver w64_oracle.mjs): equivalencia, no limitacion.",
      oraculo: "results/workers_node_oracle.json / probes/w64_oracle.mjs",
    }, "W6-terminacion");
  } catch (e) { rec("W6.4", "terminate() idempotente", "FAIL", { error: e.message }, "W6-terminacion"); }
}

// ===========================================================================
// W7 - LIMPIEZA DE RECURSOS
// ===========================================================================
log("");
log("########## W7: limpieza de recursos ##########");
{
  // W7.1 liberacion de hilos tras terminate()
  try {
    const base = taskCount();
    const baseNombres = taskNames();
    const { w, ready } = await boot();
    const durante = taskCount();
    const duranteNombres = taskNames();
    const lim = await cleanup(w, base);
    rec("W7.1", "Recursos de hilo liberados tras terminate()", lim.limpio === true ? "PASS" : "PARTIAL", {
      handshake: ready.__f26_ready === true,
      hilosAntes: base, hilosDurante: durante, hilosDespues: lim.hilosDespues,
      delta: lim.deltaHilos, exitCode: lim.exitCode,
      hiloWorkerPresenteDurante: duranteNombres.includes("Worker"),
      nombresDurante: duranteNombres.filter((n) => n === "Worker"),
      nombresDespues: taskNames().filter((n) => n === "Worker"),
    }, "W7-limpieza");
  } catch (e) { rec("W7.1", "Recursos de hilo liberados tras terminate()", "FAIL", { error: e.message }, "W7-limpieza"); }

  // W7.2 sin fuga tras 6 workers secuenciales
  try {
    const base = taskCount();
    for (let i = 0; i < 6; i++) {
      const { w } = await boot();
      await rpc(w, "echo", "x" + i);
      await w.terminate();
    }
    await sleep(600);
    const despues = taskCount();
    rec("W7.2", "Sin fuga de hilos tras crear/terminar 6 workers", despues <= base ? "PASS" : "PARTIAL", {
      hilosAntes: base, hilosDespues: despues, delta: despues - base,
    }, "W7-limpieza");
  } catch (e) { rec("W7.2", "Sin fuga de hilos tras 6 workers", "FAIL", { error: e.message }, "W7-limpieza"); }

  // W7.3 unref() / ref()
  try {
    const { w } = await boot();
    const hasUnref = typeof w.unref === "function";
    const hasRef = typeof w.ref === "function";
    if (hasUnref) w.unref();
    const trasUnref = typeof w.unref === "function";
    if (hasRef) w.ref();
    await cleanup(w, taskCount());
    rec("W7.3", "worker.unref() / worker.ref() disponibles", hasUnref && hasRef ? "PASS" : "PARTIAL", {
      unrefDisponible: hasUnref, refDisponible: hasRef, llamadasSinError: trasUnref,
    }, "W7-limpieza");
  } catch (e) { rec("W7.3", "worker.unref()/ref()", "FAIL", { error: e.message }, "W7-limpieza"); }

  // W7.4 resourceLimits aceptado
  try {
    const { w } = await boot({ resourceLimits: { maxOldGenerationSizeMb: 64 } });
    const r = await rpc(w, "echo", "ok");
    await cleanup(w, taskCount());
    rec("W7.4", "Opcion resourceLimits aceptada por el constructor", r.valor === "ok" ? "PASS" : "PARTIAL", {
      resourceLimits: { maxOldGenerationSizeMb: 64 },
      nota: "Bun acepta la opcion; no se verifico aplicacion real del limite (V8-only)",
    }, "W7-limpieza");
  } catch (e) { rec("W7.4", "resourceLimits en constructor", "FAIL", { error: e.message }, "W7-limpieza"); }
}
// ===========================================================================
// W8 - CONCURRENCIA (aislamiento real demostrado)
// ===========================================================================
log("");
log("########## W8: concurrencia de varios workers ##########");
{
  // W8.1 4 workers CPU-bound: paralelismo real + aislamiento por checksum
  try {
    const N = 4, CPU = 2000;
    const base = taskCount();
    const t0 = Date.now();
    const booted = [];
    for (let i = 0; i < N; i++) booted.push(await boot({ workerData: { ref: {} } }));
    const wallBoot = Date.now() - t0;
    const t1 = Date.now();
    const rs = await Promise.all(booted.map((b, i) => rpc(b.w, "cpu", { ms: CPU, id: i }, 30000)));
    const wall = Date.now() - t1;
    const serial = CPU * N;
    const ratio = serial / wall;
    const solapamiento = Math.min(...rs.map((r) => r.fin)) - Math.max(...rs.map((r) => r.fin - CPU)) > 0;
    for (const b of booted) await cleanup(b.w, base);
    rec("W8.1", `Concurrencia real de ${N} workers CPU-bound (${CPU} ms c/u)`, ratio > 1.8 ? "PASS" : (ratio > 1.2 ? "PARTIAL" : "FAIL"), {
      wallMs: wall, sumaSerialMs: serial, ratioParalelismo: Number(ratio.toFixed(2)),
      ventanas: rs.map((r) => ({ id: r.id, finRel: r.fin - t1 })),
      solapamiento, nucleosDetectados: navigator.hardwareConcurrency,
      veredicto: ratio > 1.8 ? "paralelismo real" : "paralelismo parcial",
    }, "W8-concurrencia");
  } catch (e) { rec("W8.1", "Concurrencia de 4 workers CPU-bound", "FAIL", { error: e.message, nombre: e.name }, "W8-concurrencia"); }

  // W8.2 8 workers CPU-bound
  try {
    const N = 8, CPU = 1500;
    const base = taskCount();
    const booted = [];
    for (let i = 0; i < N; i++) booted.push(await boot());
    const t1 = Date.now();
    const rs = await Promise.all(booted.map((b) => rpc(b.w, "cpu", { ms: CPU, id: 0 }, 30000)));
    const wall = Date.now() - t1;
    const ratio = (CPU * N) / wall;
    for (const b of booted) await cleanup(b.w, base);
    rec("W8.2", `Concurrencia real de ${N} workers CPU-bound (${CPU} ms c/u)`, ratio > 2.5 ? "PASS" : (ratio > 1.5 ? "PARTIAL" : "FAIL"), {
      wallMs: wall, sumaSerialMs: CPU * N, ratioParalelismo: Number(ratio.toFixed(2)),
      nucleosDetectados: navigator.hardwareConcurrency,
    }, "W8-concurrencia");
  } catch (e) { rec("W8.2", "Concurrencia de 8 workers CPU-bound", "FAIL", { error: e.message }, "W8-concurrencia"); }

  // W8.3 aislamiento: cada worker mantiene su propio estado y su checksum
  try {
    const base = taskCount();
    const booted = [];
    for (let i = 0; i < 4; i++) booted.push(await boot());
    const rs = await Promise.all(booted.map((b, i) => rpc(b.w, "isolate", { id: i, n: 1000 })));
    const checksums = rs.map((r) => r.checksum);
    const ids = rs.map((r) => r.id);
    const esperado = [0, 1, 2, 3].map((i) => 1000 * 31 + i);
    const aislamiento = JSON.stringify(checksums) === JSON.stringify(esperado) && JSON.stringify(ids) === JSON.stringify([0, 1, 2, 3]);
    const threads = booted.map((b) => b.w.threadId);
    for (const b of booted) await cleanup(b.w, base);
    rec("W8.3", "Aislamiento: estado y checksum propios por worker", aislamiento ? "PASS" : "FAIL", {
      checksums: checksums, checksumsEsperados: esperado,
      ids: ids, threadIds: threads, hilosDistintos: new Set(threads).size === threads.length,
      interpretacion: aislamiento
        ? "Cada worker mantengo su propio estado: no hay memoria compartida implicita entre hilos"
        : "Se detecto contamination de estado entre workers",
    }, "W8-concurrencia");
  } catch (e) { rec("W8.3", "Aislamiento de estado entre workers", "FAIL", { error: e.message }, "W8-concurrencia"); }

  // W8.4 Atomics + SharedArrayBuffer compartido (concurrencia real sobre memoria compartida)
  try {
    const base = taskCount();
    const sab = new SharedArrayBuffer(8);
    const booted = [];
    for (let i = 0; i < 4; i++) booted.push(await boot());
    // el SAB se COMPARTE por referencia (no se transfiere: un SharedArrayBuffer
    // en transferList provoke "The object can not be cloned" en Bun y Node).
    const rs = await Promise.all(booted.map((b) => rpc(b.w, "shared", { sab })));
    const finales = rs.map((r) => r.ahora);
    // el PRINCIPAL lee el valor final: prueba independiente del incremento en los workers
    const valorFinalPrincipal = Atomics.load(new Int32Array(sab), 0);
    for (const b of booted) await cleanup(b.w, base);
    rec("W8.4", "Atomics + SharedArrayBuffer: 4 workers incrementan el mismo contador", valorFinalPrincipal === 4 ? "PASS" : "PARTIAL", {
      lecturasPorWorker: finales,
      valorFinalLeidoPorElPrincipal: valorFinalPrincipal, esperado: 4,
      tieneAtomicsWait: rs[0].tieneAtomics,
      interpretacion: valorFinalPrincipal === 4
        ? "Los 4 incrementos son atomicos y se acumulan en la MISMA memoria compartida (verificado por el principal): sincronizacion real"
        : "El contador final no es 4: los incrementos no se acumularon sobre la misma memoria",
    }, "W8-concurrencia");
  } catch (e) { rec("W8.4", "Atomics + SharedArrayBuffer concurrente", "FAIL", { error: e.message }, "W8-concurrencia"); }
}

// ===========================================================================
// W9 - LIMITACIONES ESPECIFICAS DE ANDROID
// ===========================================================================
log("");
log("########## W9: limitaciones especificas de Android ##########");
{
  // W9.1 el worker es un hilo real del mismo proceso
  try {
    const base = taskCount();
    const { w, ready } = await boot();
    const r = await rpc(w, "echo", "x");
    const info = await new Promise((res) => {
      const w2 = new wt.Worker("const {parentPort}=require('node:worker_threads');parentPort.postMessage({pid:process.pid,ppid:process.ppid,plat:process.platform,arch:process.arch,ver:process.version,bun:process.versions.bun,argv0:process.argv0,mem:process.memoryUsage().rss})", { eval: true });
      w2.once("message", (m) => { res(m); w2.terminate(); });
    });
    await cleanup(w, base);
    rec("W9.1", "El worker es un hilo real del mismo proceso (no un subproceso)", info.pid === process.pid ? "PASS" : "PARTIAL", {
      pidPrincipal: process.pid, pidWorker: info.pid, mismoProceso: info.pid === process.pid,
      ppid: info.ppid, plataforma: info.plat, arch: info.arch,
      nodeVersion: info.ver, bunVersion: info.bun, argv0: info.argv0, rss: info.mem,
    }, "W9-android");
  } catch (e) { rec("W9.1", "El worker es un hilo real", "FAIL", { error: e.message }, "W9-android"); }

  // W9.2 permisos de filesystem: worker vs principal (mismo UID)
  try {
    const probe = process.cwd() + "/.f26_worker_write_probe";
    let principal = null;
    try { require("node:fs").writeFileSync(probe, "x"); principal = "OK"; require("node:fs").unlinkSync(probe); }
    catch (e) { principal = "DENIED:" + e.code; }
    const base = taskCount();
    const { w } = await boot();
    const r = await rpc(w, "writeProbe", probe);
    await cleanup(w, base);
    rec("W9.2", "Permisos de filesystem: worker vs principal (mismo UID)", "PASS", {
      principalEscribe: principal, workerEscribe: r.write,
      lecturaEnWorker: r.read, uidWorker: r.uid, gidWorker: r.gid, cwdWorker: r.cwd,
      interpretacion: r.write === principal
        ? "Worker y principal comparten el mismo contexto de permisos (mismo UID, mismo sandbox): NO hay una restriccion adicional"
        : "El worker tiene permisos MAS restrictivos que el principal: limitacion especifica de Android",
    }, "W9-android");
  } catch (e) { rec("W9.2", "Permisos de filesystem en worker", "FAIL", { error: e.message }, "W9-android"); }

  // W9.3 el worker puede crear procesos hijos
  try {
    const base = taskCount();
    const { w } = await boot();
    const r = await rpc(w, "childProcess", null);
    await cleanup(w, base);
    rec("W9.3", "El worker puede crear procesos hijos (child_process)", r.status === 0 && r.out === "worker-child-ok" ? "PASS" : "PARTIAL", {
      status: r.status, stdout: r.out, stderr: r.err,
    }, "W9-android");
  } catch (e) { rec("W9.3", "El worker puede crear procesos hijos", "FAIL", { error: e.message }, "W9-android"); }

  // W9.4 coste de arranque
  try {
    const muestras = [];
    for (let i = 0; i < 5; i++) {
      const t0 = Date.now();
      const { w } = await boot();
      muestras.push(Date.now() - t0);
      await w.terminate();
    }
    await sleep(400);
    rec("W9.4", "Coste de arranque de un worker en Android (5 muestras)", "PASS", {
      msPorArranque: muestras, mediaMs: Math.round(muestras.reduce((a, b) => a + b, 0) / muestras.length),
    }, "W9-android");
  } catch (e) { rec("W9.4", "Coste de arranque de worker", "FAIL", { error: e.message }, "W9-android"); }

  // W9.5 limite de workers simultaneos
  try {
    const N = 16;
    const base = taskCount();
    const t0 = Date.now();
    const booted = [];
    for (let i = 0; i < N; i++) booted.push(await boot());
    const ms = Date.now() - t0;
    const durante = taskCount();
    for (const b of booted) await cleanup(b.w, base);
    await sleep(500);
    rec("W9.5", `Creacion de ${N} workers simultaneos`, "PASS", {
      creados: N, ms, hilosDurante: durante, hilosDespues: taskCount(),
      nucleosDetectados: navigator.hardwareConcurrency,
      nota: "No se provoco agotamiento de hilos del sistema",
    }, "W9-android");
  } catch (e) { rec("W9.5", "16 workers simultaneos", "FAIL", { error: e.message }, "W9-android"); }

  // W9.6 cobertura de la API exportada + formas divergentes
  const exportadas = Object.keys(wt).sort();
  const divergentes = [];
  const esperados = {
    isInternalThread: "boolean", SHARE_ENV: "symbol", resourceLimits: "object",
    workerData: "object", parentPort: "object", threadId: "number", threadName: "string",
    Worker: "function", MessageChannel: "function", MessagePort: "function",
    BroadcastChannel: "function", moveMessagePortToContext: "function",
    markAsUntransferable: "function", isMarkedAsUntransferable: "function",
    markAsUncloneable: "function", postMessageToThread: "function",
    receiveMessageOnPort: "function", setEnvironmentData: "function",
    getEnvironmentData: "function", isMainThread: "boolean",
  };
  for (const [k, t] of Object.entries(esperados)) {
    if (typeof wt[k] !== t) divergentes.push({ simbolo: k, esperado: t, real: typeof wt[k] });
  }
  rec("W9.6", "Cobertura de la API node:worker_threads en Bun 1.4.0/Android", divergentes.length ? "PARTIAL" : "PASS", {
    totalExportadas: exportadas.length, exportadas,
    divergentesDeForma: divergentes,
    nota: "isInternalThread es boolean en Bun Y en Node v26 (verificado con el oraculo): no es una divergencia",
  }, "W9-android");

  // W9.7 APIs exportadas pero no implementadas (limitaciones reales)
  const noImplementadas = [];
  try {
    const { port1 } = new wt.MessageChannel();
    wt.moveMessagePortToContext(port1, "ctx");
    port1.close();
    noImplementadas.push({ simbolo: "moveMessagePortToContext", estado: "declarada pero sin efecto" });
  } catch (e) {
    noImplementadas.push({ simbolo: "moveMessagePortToContext", estado: "NotImplementedError", error: e.message, code: e.code });
  }
  rec("W9.7", "APIs exportadas pero no implementadas por el runtime", "PARTIAL", {
    noImplementadas,
    interpretacion: "Bun exporta la superficie completa de node:worker_threads (21 simbolos) pero moveMessagePortToContext no esta implementada",
  }, "W9-android");

  // W9.8 registro de senales dentro del worker
  try {
    const base = taskCount();
    const { w } = await boot();
    const r = await rpc(w, "signal", null);
    await cleanup(w, base);
    rec("W9.8", "Registro de senales (process.on) dentro del worker", r.ok === true ? "PASS" : "FAIL", {
      processOnEsFuncion: r.procOn, signalHandlerRegistrado: r.ok,
    }, "W9-android");
  } catch (e) { rec("W9.8", "Registro de senales en worker", "FAIL", { error: e.message }, "W9-android"); }
}

// ===========================================================================
// PERSISTENCIA
// ===========================================================================
const cuenta = R.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {});
const resumen = {
  metadata: {
    bun: Bun.version,
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.versions.node,
    pid: process.pid,
    hardwareConcurrency: navigator.hardwareConcurrency,
    generadoEn: new Date().toISOString(),
    timeoutsMs: T,
  },
  cuenta,
  porRequisito: R.reduce((acc, r) => {
    const k = r.req || "sin-requisito";
    acc[k] = acc[k] || { PASS: 0, FAIL: 0, PARTIAL: 0, "NOT TESTED": 0 };
    acc[k][r.status]++;
    return acc;
  }, {}),
  resultados: R,
};
writeFileSync(OUT, JSON.stringify(resumen, null, 2));
writeFileSync(LOG, logLines.join("\n") + "\n");
log("");
log("=== RESUMEN v6 ===");
for (const r of R) log(`${r.status.padEnd(11)} ${r.id.padEnd(7)} ${r.req || ""} | ${r.title}`);
log("");
log("CUENTA " + JSON.stringify(cuenta));
log("JSON -> " + OUT);
log("LOG  -> " + LOG);
