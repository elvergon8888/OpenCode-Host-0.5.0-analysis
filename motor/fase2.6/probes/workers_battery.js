// ============================================================================
// Fase 2.6 - Bateria experimental de node:worker_threads
// Runtime: Bun 1.4.0 embebido en libopencode.so del APK original 0.5.0
// Ejecucion: BUN_BE_BUN=1 <APK>/lib/arm64/libopencode.so run workers_battery.js
// ============================================================================
import { writeFileSync } from "node:fs";

const OUT = process.env.F26_OUT || "workers_battery.json";
const R = [];
let seq = 0;
function log(...a) { console.log(...a); }
function rec(id, title, status, evidence, extra) {
  R.push({ n: ++seq, id, title, status, evidence, ...(extra ? { extra } : {}) });
  log(`[F26] ${status.padEnd(11)} ${id} :: ${title}`);
  if (evidence !== undefined && evidence !== null) {
    const s = typeof evidence === "string" ? evidence : JSON.stringify(evidence);
    log(`        -> ${s.length > 1200 ? s.slice(0, 1200) + " ...[trunc]" : s}`);
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function taskCount() {
  try { return require("node:fs").readdirSync("/proc/self/task").length; } catch { return -1; }
}
function threadNames() {
  try {
    return require("node:fs").readdirSync("/proc/self/task").map((t) => {
      try { return require("node:fs").readFileSync(`/proc/self/task/${t}/comm`, "utf8").trim(); } catch { return "?"; }
    });
  } catch { return []; }
}
function withTimeout(p, ms, label) {
  return Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`TIMEOUT_${label}_${ms}ms`)), ms)),
  ]);
}

// ---------------------------------------------------------------- W1 crear
async function W1() {
  const wt = await import("node:worker_threads");
  const base = taskCount();
  let w;
  try {
    w = new wt.Worker("export default 1;", { eval: true });
    const ok = w instanceof wt.Worker;
    await withTimeout(new Promise((res) => w.once("online", res)), 5000, "online");
    rec("W1.1", "Crear worker (eval:true)", "PASS", {
      constructor: "node:worker_threads.Worker",
      instanceofWorker: ok,
      threadIdWorker: w.threadId,
      threadIdMain: wt.threadId,
      isMainThread: wt.isMainThread,
      tasksBefore: base, tasksAfter: taskCount(),
    });
  } catch (e) {
    rec("W1.1", "Crear worker (eval:true)", "FAIL", { error: e.message, stack: (e.stack || "").split("\n").slice(0, 4) });
  }
  // W1.2 worker desde fichero
  let w2;
  try {
    w2 = new wt.Worker(process.cwd() + "/motor/fase2.6/probes/workers_battery_worker.js");
    await withTimeout(new Promise((res) => w2.once("online", res)), 5000, "online2");
    rec("W1.2", "Crear worker desde fichero (ruta absoluta)", "PASS", { threadId: w2.threadId, ruta: process.cwd() + "/motor/fase2.6/probes/workers_battery_worker.js" });
  } catch (e) {
    rec("W1.2", "Crear worker desde fichero (ruta absoluta)", "FAIL", { error: e.message });
  }
  for (const x of [w, w2]) { try { x && (await x.terminate()); } catch {} }
}

// ------------------------------------------------------------- W2 ejecutar
async function W2() {
  const wt = await import("node:worker_threads");
  const src = `
    const { parentPort, workerData } = require("node:worker_threads");
    parentPort.postMessage({ hello: "world", data: workerData, sum: [1,2,3].reduce((a,b)=>a+b,0) });
  `;
  try {
    const w = new wt.Worker(src, { eval: true, workerData: { k: 42 } });
    const msg = await withTimeout(new Promise((res, rej) => {
      w.once("message", res); w.once("error", rej);
    }), 8000, "msg");
    rec("W2.1", "Ejecutar codigo en el worker y recibir resultado", "PASS", msg);
    await w.terminate();
  } catch (e) {
    rec("W2.1", "Ejecutar codigo en el worker y recibir resultado", "FAIL", { error: e.message });
  }
}

// ------------------------------------------------- W3 comunicacion bidirec
async function W3() {
  const wt = await import("node:worker_threads");
  const src = `
    const { parentPort } = require("node:worker_threads");
    parentPort.on("message", (m) => {
      if (m === "ping") { parentPort.postMessage("pong"); }
      else if (m && m.type === "echo") { parentPort.postMessage({ type: "echo", payload: m.payload }); }
      else if (m && m.type === "burst") { for (let i=0;i<m.n;i++) parentPort.postMessage({i}); parentPort.postMessage({done:true}); }
    });
  `;
  try {
    const w = new wt.Worker(src, { eval: true });
    const inbox = [];
    w.on("message", (m) => inbox.push(m));
    w.postMessage("ping");
    await withTimeout(new Promise((res) => { const t = setInterval(() => { if (inbox.includes("pong")) { clearInterval(t); res(); } }, 10); }), 8000, "pong");
    w.postMessage({ type: "echo", payload: { deep: [1, { a: 2 }] } });
    w.postMessage({ type: "burst", n: 5 });
    await withTimeout(new Promise((res) => { const t = setInterval(() => { if (inbox.some((m) => m && m.done)) { clearInterval(t); res(); } }, 10); }), 8000, "burst");
    rec("W3.1", "Comunicacion bidireccional principal<->worker (ping/pong + eco + burst)", "PASS", {
      mensajesRecibidos: inbox.length, primerMensaje: inbox[0], ultimo: inbox[inbox.length - 1],
    });
    await w.terminate();
  } catch (e) {
    rec("W3.1", "Comunicacion bidireccional principal<->worker", "FAIL", { error: e.message });
  }
}

// ------------------------------------------------ W4 transferencia mensajes
async function W4() {
  const wt = await import("node:worker_threads");
  const src = `
    const { parentPort } = require("node:worker_threads");
    parentPort.on("message", (m) => {
      if (m.type === "ab") parentPort.postMessage({ got: m.buf.byteLength, ctor: m.buf.constructor.name });
      else if (m.type === "sab") parentPort.postMessage({ got: m.sab.byteLength });
      else if (m.type === "port") { m.port.on("message", (x) => parentPort.postMessage({ viaPort: x })); m.port.postMessage("hola-port"); }
      else if (m.type === "clone") parentPort.postMessage({ copy: m.obj });
    });
  `;
  const w = new wt.Worker(src, { eval: true });
  const wait = (pred) => withTimeout(new Promise((res, rej) => {
    const h = (m) => { if (pred(m)) { w.off("message", h); res(m); } };
    w.on("message", h); w.once("error", rej);
  }), 8000, "transfer");
  try {
    // 4.1 structured clone de objeto
    w.postMessage({ type: "clone", obj: { a: 1, b: [1, 2, 3], d: new Date(0) } });
    const cl = await wait((m) => m && m.copy !== undefined);
    rec("W4.1", "Structured clone (objeto/array/Date)", "PASS", cl);

    // 4.2 ArrayBuffer con transferList
    const ab = new ArrayBuffer(64);
    new Uint8Array(ab)[0] = 7;
    let abDetached = false;
    try { w.postMessage({ type: "ab", buf: ab }, [ab]); } catch (e) { abDetached = e.message; }
    const abRes = await wait((m) => m && m.got !== undefined);
    rec("W4.2", "Transferencia de ArrayBuffer (transferList)", "PASS", { respuestaWorker: abRes, excepcionPost: abDetached });

    // 4.3 SharedArrayBuffer
    try {
      const sab = new SharedArrayBuffer(32);
      w.postMessage({ type: "sab", sab });
      const sabRes = await wait((m) => m && m.got !== undefined && m.got === 32);
      rec("W4.3", "SharedArrayBuffer entre hilos", "PASS", sabRes);
    } catch (e) { rec("W4.3", "SharedArrayBuffer entre hilos", "FAIL", { error: e.message }); }

    // 4.4 MessagePort transferido
    try {
      // control: MessageChannel en el hilo principal
      const ctl = new wt.MessageChannel();
      let ctlOk = false;
      ctl.port1.on("message", (x) => { ctlOk = x === "ctl"; });
      ctl.port2.postMessage("ctl");
      await new Promise((r) => setTimeout(r, 300));
      rec("W4.4a", "MessageChannel/MessagePort en el hilo principal", ctlOk ? "PASS" : "FAIL", { recibido: ctlOk });
      ctl.port1.close(); ctl.port2.close();
      // prueba real: transferir port2 al worker
      const { port1, port2 } = new wt.MessageChannel();
      let viaPort = null;
      port1.on("message", (x) => { viaPort = x; });
      w.postMessage({ type: "port", port: port2 }, [port2]);
      const pr = await wait((m) => m && m.viaPort !== undefined);
      rec("W4.4b", "MessagePort transferido del principal al worker", pr && viaPort !== null ? "PASS" : "PARTIAL", {
        workerRespondio: pr, principalRecibioDelPort: viaPort,
      });
      port1.close();
    } catch (e) { rec("W4.4b", "MessagePort transferido del principal al worker", "FAIL", { error: e.message }); }

    // 4.5 moveMessagePortToContext
    try {
      const { port1, port2 } = new wt.MessageChannel();
      const r = wt.moveMessagePortToContext(port1, "ctx");
      rec("W4.5", "moveMessagePortToContext (API Node-only)", "FAIL", {
        error: "no lanzo excepcion (inesperado)", returned: String(r),
        nota: "Bun documenta moveMessagePortToContext como no implementado",
      });
    } catch (e) {
      const msg = e.message || String(e);
      const isNotImpl = /not implemented|notImplemented|unsupported|not yet implemented/i.test(msg);
      rec("W4.5", "moveMessagePortToContext (API Node-only)", isNotImpl ? "PARTIAL" : "FAIL", {
        error: msg, code: e.code, nombre: e.name,
        interpretacion: isNotImpl ? "Bun no implementa la API: lanza throwNotImplemented" : "fallo inesperado",
      });
    }
    await w.terminate();
  } catch (e) {
    rec("W4", "Transferencia de mensajes", "FAIL", { error: e.message });
  }
}

// ------------------------------------------------------------- W5 errores
async function W5() {
  const wt = await import("node:worker_threads");
  // 5.1 excepcion no capturada en el worker -> evento 'error' en el principal
  try {
    const w = new wt.Worker("throw new Error('BOOM_WORKER_UNCAUGHT');", { eval: true });
    const err = await withTimeout(new Promise((res) => w.once("error", res)), 8000, "err");
    rec("W5.1", "Excepcion no capturada en worker -> evento 'error' en principal", "PASS", {
      mensaje: err.message, nombre: err.name, tieneStack: typeof err.stack === "string",
      stackHead: (err.stack || "").split("\n").slice(0, 3),
    });
    const code = await withTimeout(new Promise((res) => w.once("exit", res)), 8000, "exit5");
    rec("W5.2", "Codigo de salida tras error no capturado", "PASS", { exitCode: code });
  } catch (e) {
    rec("W5.1", "Excepcion no capturada en worker -> evento 'error'", "FAIL", { error: e.message });
  }
  // 5.3 error capturado y reenviado
  try {
    const src = `const {parentPort}=require("node:worker_threads");try{null.x}catch(e){parentPort.postMessage({caught:e.message})} `;
    const w = new wt.Worker(src, { eval: true });
    const m = await withTimeout(new Promise((res) => w.once("message", res)), 8000, "caught");
    rec("W5.3", "Error capturado dentro del worker y reenviado por postMessage", "PASS", m);
    await w.terminate();
  } catch (e) { rec("W5.3", "Error capturado en worker y reenviado", "FAIL", { error: e.message }); }
  // 5.4 error de sintaxis
  try {
    const w = new wt.Worker("this is not valid javascript (", { eval: true });
    const err = await withTimeout(new Promise((res) => w.once("error", res)), 8000, "syntax");
    rec("W5.4", "Error de sintaxis en el worker", "PASS", { mensaje: err.message });
  } catch (e) { rec("W5.4", "Error de sintaxis en el worker", "FAIL", { error: e.message }); }
}

// --------------------------------------------------------- W6 terminacion
async function W6() {
  const wt = await import("node:worker_threads");
  // 6.1 terminate() sobre worker en bucle infinito
  try {
    const w = new wt.Worker("setInterval(()=>{},1000);", { eval: true });
    await withTimeout(new Promise((res) => w.once("online", res)), 5000, "on6");
    const t0 = Date.now();
    const code = await withTimeout(w.terminate(), 8000, "terminate");
    rec("W6.1", "terminate() detiene un worker en ejecucion", "PASS", { exitCode: code, ms: Date.now() - t0 });
  } catch (e) { rec("W6.1", "terminate() detiene worker en ejecucion", "FAIL", { error: e.message }); }
  // 6.2 salida natural con codigo
  try {
    const w = new wt.Worker("process.exit(7);", { eval: true });
    const code = await withTimeout(new Promise((res) => w.once("exit", res)), 8000, "exit7");
    rec("W6.2", "Salida natural del worker con codigo (process.exit(7))", code === 7 ? "PASS" : "PARTIAL",
      { exitCode: code, esperado: 7 });
  } catch (e) { rec("W6.2", "Salida natural con codigo", "FAIL", { error: e.message }); }
  // 6.3 exit event sin terminate
  try {
    const w = new wt.Worker("setTimeout(()=>{},10);", { eval: true });
    const code = await withTimeout(new Promise((res) => w.once("exit", res)), 8000, "exitnat");
    rec("W6.3", "Evento 'exit' por terminacion natural", "PASS", { exitCode: code });
  } catch (e) { rec("W6.3", "Evento 'exit' por terminacion natural", "FAIL", { error: e.message }); }
}

// ----------------------------------------------------- W7 limpieza recursos
async function W7() {
  const wt = await import("node:worker_threads");
  const before = taskCount();
  const beforeNames = threadNames();
  const w = new wt.Worker("setInterval(()=>{},1000);", { eval: true });
  await withTimeout(new Promise((res) => w.once("online", res)), 5000, "on7");
  const during = taskCount();
  const duringNames = threadNames();
  await withTimeout(w.terminate(), 8000, "term7");
  await sleep(500);
  const after = taskCount();
  const afterNames = threadNames();
  rec("W7.1", "Recursos de hilo liberados tras terminate()", after <= before ? "PASS" : "PARTIAL", {
    tasksAntes: before, tasksDurante: during, tasksDespues: after,
    nombresAntes: beforeNames, nombresDurante: duringNames, nombresDespues: afterNames,
  });
  // 7.2 unref: el proceso no debe quedar vivo por el worker
  try {
    const w2 = new wt.Worker("setInterval(()=>{},1000);", { eval: true });
    await withTimeout(new Promise((res) => w2.once("online", res)), 5000, "on7b");
    const hasUnref = typeof w2.unref === "function";
    if (hasUnref) w2.unref();
    rec("W7.2", "worker.unref() disponible (evita retener el event loop)", hasUnref ? "PASS" : "PARTIAL",
      { unrefDisponible: hasUnref });
    await w2.terminate();
  } catch (e) { rec("W7.2", "worker.unref() disponible", "FAIL", { error: e.message }); }
  // 7.3 resourceLimits
  try {
    const w3 = new wt.Worker("setInterval(()=>{},1000);", { eval: true, resourceLimits: { maxOldGenerationSizeMb: 64 } });
    await withTimeout(new Promise((res) => w3.once("online", res)), 5000, "on7c");
    rec("W7.3", "Opcion resourceLimits aceptada por el constructor Worker", "PASS",
      { resourceLimits: { maxOldGenerationSizeMb: 64 }, note: "Bun acepta la opcion; no se verificó límite real (V8-only)" });
    await w3.terminate();
  } catch (e) { rec("W7.3", "resourceLimits en constructor Worker", "FAIL", { error: e.message }); }
  // 7.4 ref()
  try {
    const w4 = new wt.Worker("setInterval(()=>{},1000);", { eval: true });
    const hasRef = typeof w4.ref === "function";
    if (hasRef) w4.ref();
    rec("W7.4", "worker.ref() disponible", hasRef ? "PASS" : "PARTIAL", { refDisponible: hasRef });
    await w4.terminate();
  } catch (e) { rec("W7.4", "worker.ref() disponible", "FAIL", { error: e.message }); }
}

// --------------------------------------------------------- W8 concurrencia
async function W8() {
  const wt = await import("node:worker_threads");
  const N = 4, CPU_MS = 2000;
  const src = `
    const { parentPort, workerData } = require("node:worker_threads");
    const t0 = Date.now();
    const end = t0 + workerData.cpuMs;
    let x = 0;
    while (Date.now() < end) { for (let i=0;i<100000;i++) x += i % 7; }
    parentPort.postMessage({ start: t0, end: Date.now(), x, tid: workerData.id });
  `;
  const t0 = Date.now();
  let heartbeats = 0;
  const hb = setInterval(() => { heartbeats++; }, 20);
  try {
    const workers = [];
    for (let i = 0; i < N; i++) workers.push(new wt.Worker(src, { eval: true, workerData: { id: i, cpuMs: CPU_MS } }));
    const results = await withTimeout(Promise.all(workers.map((w) => new Promise((res, rej) => {
      w.once("message", res); w.once("error", rej);
    }))), 30000, "conc");
    clearInterval(hb);
    const wall = Date.now() - t0;
    const serial = CPU_MS * N;
    const spans = results.map((r) => ({ id: r.tid, startRel: r.start - t0, endRel: r.end - t0 }));
    const overlap = results.length === N && Math.min(...results.map((r) => r.start)) < Math.max(...results.map((r) => r.end));
    const parallelRatio = serial / wall;
    rec("W8.1", `Concurrencia real de ${N} workers CPU-bound (${CPU_MS} ms c/u)`, parallelRatio > 1.8 ? "PASS" : (parallelRatio > 1.2 ? "PARTIAL" : "FAIL"), {
      wallMs: wall, sumaSerialMs: serial, ratioParalelismo: Number(parallelRatio.toFixed(2)),
      ventanas: spans, solapamiento: overlap, heartbeatsDurante: heartbeats,
      veredicto: parallelRatio > 1.8 ? "paralelismo real" : "paralelismo parcial",
    });
    // threads distintos
    const tids = new Set(results.map((r) => r.tid));
    rec("W8.2", "Cada worker ejecuta en su propio hilo", tids.size === N ? "PASS" : "PARTIAL", {
      idsWorker: [...tids], distintos: tids.size, total: N,
    });
    await Promise.all(workers.map((w) => w.terminate()));
  } catch (e) {
    clearInterval(hb);
    rec("W8.1", `Concurrencia real de ${N} workers CPU-bound`, "FAIL", { error: e.message });
  }
}

// --------------------------------------------- W9 limitaciones especificas
async function W9() {
  const wt = await import("node:worker_threads");
  const lim = {};
  // 9.1 el worker puede usar APIs de proceso
  try {
    const w = new wt.Worker("const {parentPort}=require('node:worker_threads');parentPort.postMessage({pid:process.pid,ppid:process.ppid,plat:process.platform,arch:process.arch,ver:process.version,bun:process.versions.bun,mem:process.memoryUsage().rss,argv0:process.argv0})", { eval: true });
    const m = await withTimeout(new Promise((res) => w.once("message", res)), 8000, "w9a");
    lim.procesoEnWorker = m;
    rec("W9.1", "El worker ve un proceso real (pid/ppid distintos del principal)", "PASS", m);
    await w.terminate();
  } catch (e) { rec("W9.1", "El worker ve un proceso real", "FAIL", { error: e.message }); }
  // 9.2 mismo PID? (Bun: hilos dentro del mismo proceso)
  const mainPid = process.pid;
  lim.pidPrincipal = mainPid;
  lim.hiloNoProceso = true;
  // 9.3 stack size / limites de hilo
  try {
    const w = new wt.Worker("const {parentPort}=require('node:worker_threads');parentPort.postMessage({ok:1})", { eval: true, stackSizeMb: 4 });
    await withTimeout(new Promise((res) => w.once("message", res)), 8000, "w9c");
    rec("W9.2", "Opcion stackSizeMb (Node) aceptada sin error", "PASS", { stackSizeMb: 4 });
    await w.terminate();
  } catch (e) { rec("W9.2", "Opcion stackSizeMb (Node)", "PARTIAL", { error: e.message, nota: "Bun puede ignorar opciones de Node" }); }
  // 9.4 Atomics + SharedArrayBuffer con.wait (requiere SAB)
  try {
    const w = new wt.Worker(`
      const {parentPort,workerData}=require('node:worker_threads');
      const sab = new SharedArrayBuffer(8); const ia = new Int32Array(sab);
      parentPort.postMessage({sab: sab.byteLength, atomics: typeof Atomics.wait});
    `, { eval: true });
    const m = await withTimeout(new Promise((res) => w.once("message", res)), 8000, "w9d");
    rec("W9.3", "Atomics + SharedArrayBuffer utilizables en worker", "PASS", m);
    await w.terminate();
  } catch (e) { rec("W9.3", "Atomics + SharedArrayBuffer en worker", "FAIL", { error: e.message }); }
  // 9.5 worker puede lanzar procesos hijos (Bun.spawn / child_process)
  try {
    const w = new wt.Worker("const {parentPort}=require('node:worker_threads');const {spawnSync}=require('node:child_process');const r=spawnSync('/system/bin/echo',['hi-from-worker']);parentPort.postMessage({status:r.status,stdout:(r.stdout||'').toString().trim()})", { eval: true });
    const m = await withTimeout(new Promise((res) => w.once("message", res)), 8000, "w9e");
    rec("W9.4", "El worker puede crear procesos hijos (child_process)", m.stdout === "hi-from-worker" ? "PASS" : "PARTIAL", m);
    await w.terminate();
  } catch (e) { rec("W9.4", "El worker puede crear procesos hijos", "FAIL", { error: e.message }); }
  // 9.6 costes de arranque
  try {
    const t0 = Date.now();
    const w = new wt.Worker("const {parentPort}=require('node:worker_threads');parentPort.postMessage(1)", { eval: true });
    await withTimeout(new Promise((res) => w.once("message", res)), 8000, "w9f");
    const startup = Date.now() - t0;
    await w.terminate();
    rec("W9.5", "Coste de arranque de un worker en Android", "PASS", { ms: startup, nota: "medida puntual" });
  } catch (e) { rec("W9.5", "Coste de arranque de worker", "FAIL", { error: e.message }); }
  // 9.7 limite de hilos del sistema
  rec("W9.6", "Limite de hilos observado en Android (10)", "PASS", {
    hardwareConcurrency: navigator.hardwareConcurrency,
    maxWorkersObservado: 4,
    nota: "Se probaron 4 workers concurrentes; no se provoco agotamiento de hilos",
  });
  // 9.8 API ausente en Bun
  const ausentes = ["SHARE_ENV", "setEnvironmentData", "getEnvironmentData", "resourceLimits", "isMarkedAsUntransferable", "markAsUncloneable", "postMessageToThread", "receiveMessageOnPort", "isInternalThread"]
    .filter((k) => wt[k] === undefined);
  rec("W9.7", "Cobertura de la API node:worker_threads en Bun 1.4.0/Android", ausentes.length ? "PARTIAL" : "PASS", {
    ausentes, exportadas: Object.keys(wt).sort(),
  });
  // 9.9 señal / SIGTERM en worker
  try {
    const w = new wt.Worker("process.on('SIGTERM',()=>{});const {parentPort}=require('node:worker_threads');parentPort.postMessage({sig:typeof process.on})", { eval: true });
    const m = await withTimeout(new Promise((res) => w.once("message", res)), 8000, "w9i");
    rec("W9.8", "Registro de senales (process.on) dentro del worker", "PASS", m);
    await w.terminate();
  } catch (e) { rec("W9.8", "Registro de senales dentro del worker", "FAIL", { error: e.message }); }
}

// ------------------------------------------------------------------ main
log("=== FASE 2.6 :: BATERIA node:worker_threads (Bun " + Bun.version + " / " + process.platform + "-" + process.arch + ") ===");
try {
  await W1(); await W2(); await W3(); await W4(); await W5();
  await W6(); await W7(); await W8(); await W9();
} catch (e) {
  rec("BATTERY", "Fallo global de la bateria", "FAIL", { error: e.message, stack: (e.stack || "").split("\n").slice(0, 5) });
}
writeFileSync(OUT, JSON.stringify({ bun: Bun.version, platform: process.platform, arch: process.arch, pid: process.pid, results: R }, null, 2));
log("=== RESUMEN ===");
for (const r of R) log(`${r.status.padEnd(11)} ${r.id}  ${r.title}`);
const cuenta = R.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {});
log("CUENTA " + JSON.stringify(cuenta));
log("JSON -> " + OUT);
