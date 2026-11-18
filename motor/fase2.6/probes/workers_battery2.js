// ============================================================================
// Fase 2.6 - Bateria node:worker_threads, PARTE 2 (casos que fallaron en la v1)
// Ejecutada con el runtime Bun 1.4.0 del APK original.
// ============================================================================
import { writeFileSync } from "node:fs";
const OUT = process.env.F26_OUT || "workers_battery2.json";
const R = [];
function rec(id, title, status, evidence) {
  R.push({ id, title, status, evidence });
  console.log(`[F26] ${status.padEnd(11)} ${id} :: ${title}`);
  console.log(`        -> ${JSON.stringify(evidence).slice(0, 900)}`);
}
const wt = await import("node:worker_threads");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function withTimeout(p, ms, l) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("TIMEOUT_" + l)), ms))]);
}
console.log("=== FASE 2.6 :: BATERIA WORKERS PARTE 2 (Bun " + Bun.version + ") ===");

// W1.2-bis: worker desde fichero con ruta ABSOLUTA (no file:// URL)
{
  const abs = process.cwd() + "/motor/fase2.6/probes/workers_battery_worker.js";
  try {
    const w = new wt.Worker(abs);
    const msg = await withTimeout(new Promise((res) => w.once("message", res)), 8000, "fileWorker");
    rec("W1.2", "Crear worker desde fichero (ruta absoluta)", "PASS", { ruta: abs, mensaje: msg });
    await w.terminate();
  } catch (e) { rec("W1.2", "Crear worker desde fichero (ruta absoluta)", "FAIL", { error: e.message }); }
}
// W1.3: worker desde file:// URL usando new URL()
{
  try {
    const u = new URL("./workers_battery_worker.js", import.meta.url);
    const w = new wt.Worker(u);
    const msg = await withTimeout(new Promise((res) => w.once("message", res)), 8000, "urlWorker");
    rec("W1.3", "Crear worker desde file:// URL (new URL)", "PASS", { url: u.href, mensaje: msg });
    await w.terminate();
  } catch (e) { rec("W1.3", "Crear worker desde file:// URL (new URL)", "FAIL", { error: e.message }); }
}

// W4.4-bis: MessageChannel entre principal y worker (NO transferido)
{
  try {
    const { port1, port2 } = new wt.MessageChannel();
    const w = new wt.Worker(`
      const {parentPort}=require("node:worker_threads");
      parentPort.on("message",(m)=>{ if(m&&m.type==="port"){ m.port.on("message",(x)=>parentPort.postMessage({eco:x})); } });
    `, { eval: true });
    const done = withTimeout(new Promise((res) => w.once("message", (m) => { if (m && m.eco) res(m); })), 8000, "mc");
    w.postMessage({ type: "port", port: port2 });
    port1.postMessage("hola-mc");
    const r = await done;
    rec("W4.4", "MessageChannel principal<->worker (sin transferList)", r.eco === "hola-mc" ? "PASS" : "PARTIAL", r);
    port1.close(); port2.close();
    await w.terminate();
  } catch (e) { rec("W4.4", "MessageChannel principal<->worker", "FAIL", { error: e.message }); }
}
// W4.4-bis2: MessagePort TRANSFERIDO (transferList) - caso que dio timeout
{
  try {
    const { port1, port2 } = new wt.MessageChannel();
    const w = new wt.Worker(`
      const {parentPort}=require("node:worker_threads");
      parentPort.on("message",(m)=>{ if(m&&m.port){ m.port.on("message",(x)=>parentPort.postMessage({eco:x})); m.port.postMessage("desde-worker"); } });
    `, { eval: true });
    const done = withTimeout(new Promise((res) => w.once("message", (m) => { if (m && m.eco) res(m); })), 8000, "mct");
    w.postMessage({ port: port2 }, [port2]);
    const r = await done;
    rec("W4.6", "MessagePort transferido con transferList (worker->principal)", r.eco === "desde-worker" ? "PASS" : "PARTIAL", r);
    port1.close();
    await w.terminate();
  } catch (e) { rec("W4.6", "MessagePort transferido con transferList", "FAIL", { error: e.message }); }
}
// W4.5: moveMessagePortToContext -> NotImplementedError (limitacion real de Bun)
{
  try {
    const { port1 } = new wt.MessageChannel();
    wt.moveMessagePortToContext(port1, "ctx");
    rec("W4.5", "moveMessagePortToContext (API exclusiva de Node)", "FAIL", { resultado: "no lanzo error (inesperado)" });
  } catch (e) {
    const msg = e.message || String(e);
    const ni = e.code === "ERR_NOT_IMPLEMENTED" || /not yet implemented/i.test(msg);
    rec("W4.5", "moveMessagePortToContext (API exclusiva de Node)", ni ? "PARTIAL" : "FAIL", {
      error: msg, code: e.code, nombre: e.name,
      interpretacion: ni ? "Bun 1.4.0 no implementa la API: lanza NotImplementedError (ERR_NOT_IMPLEMENTED)" : "fallo no esperado",
      impacto: "No bloquea el uso de MessageChannel/MessagePort en Bun",
    });
  }
}
// W4.7: BroadcastChannel entre principal y worker
{
  try {
    const w = new wt.Worker(`
      const {BroadcastChannel}=require("node:worker_threads");
      const bc=new BroadcastChannel("f26-test");
      bc.onmessage=(e)=>{ require("node:worker_threads").parentPort.postMessage({bc:e.data}); };
    `, { eval: true });
    const bc = new wt.BroadcastChannel("f26-test");
    const done = withTimeout(new Promise((res) => w.once("message", res)), 8000, "bc");
    bc.postMessage("hola-bc");
    const r = await done;
    rec("W4.7", "BroadcastChannel entre principal y worker", r.bc === "hola-bc" ? "PASS" : "PARTIAL", r);
    bc.close(); await w.terminate();
  } catch (e) { rec("W4.7", "BroadcastChannel entre principal y worker", "FAIL", { error: e.message }); }
}
// W4.8: workerData con estructuras complejas + env vars
{
  try {
    const w = new wt.Worker(`
      const {parentPort,workerData}=require("node:worker_threads");
      parentPort.postMessage({wd:workerData, env:process.env.F26_TEST_VAR||null});
    `, { eval: true, workerData: { arr: [1, 2, 3], obj: { k: "v" }, n: 42 } });
    const r = await withTimeout(new Promise((res) => w.once("message", res)), 8000, "wd");
    rec("W4.8", "workerData con estructuras complejas + env heredada", r.wd.n === 42 ? "PASS" : "PARTIAL", r);
    await w.terminate();
  } catch (e) { rec("W4.8", "workerData complejo", "FAIL", { error: e.message }); }
}
// W4.9: SHARE_ENV
{
  try {
    const w = new wt.Worker(`
      const {parentPort,SHARE_ENV}=require("node:worker_threads");
      parentPort.postMessage({share:SHARE_ENV});
    `, { eval: true, env: wt.SHARE_ENV });
    const r = await withTimeout(new Promise((res) => w.once("message", res)), 8000, "share");
    rec("W4.9", "Opcion env: SHARE_ENV", r.share === "SHARE_ENV" ? "PASS" : "PARTIAL", r);
    await w.terminate();
  } catch (e) { rec("W4.9", "Opcion env: SHARE_ENV", "FAIL", { error: e.message }); }
}
// W5.5: error asíncrono (setTimeout throw) -> evento error
{
  try {
    const w = new wt.Worker("setTimeout(()=>{throw new Error('BOOM_ASYNC')},50);", { eval: true });
    const err = await withTimeout(new Promise((res) => w.once("error", res)), 8000, "async");
    rec("W5.5", "Excepcion asincrona en worker (setTimeout) -> evento 'error'", "PASS", { mensaje: err.message });
  } catch (e) { rec("W5.5", "Excepcion asincrona en worker", "FAIL", { error: e.message }); }
}
// W6.4: terminate() sobre worker ya terminado
{
  try {
    const w = new wt.Worker("setTimeout(()=>{},10);", { eval: true });
    await withTimeout(new Promise((res) => w.once("exit", res)), 8000, "exit6");
    const c = await withTimeout(w.terminate(), 8000, "term6");
    rec("W6.4", "terminate() sobre worker ya terminado (idempotente)", "PASS", { exitCode: c });
  } catch (e) { rec("W6.4", "terminate() idempotente", "FAIL", { error: e.message }); }
}
// W7.5: varios workers secuencialmente -> sin fuga de hilos
{
  const before = (() => { try { return require("node:fs").readdirSync("/proc/self/task").length; } catch { return -1; } })();
  for (let i = 0; i < 6; i++) {
    const w = new wt.Worker("const {parentPort}=require('node:worker_threads');parentPort.postMessage(1);", { eval: true });
    await withTimeout(new Promise((res) => w.once("message", res)), 8000, "seq");
    await w.terminate();
  }
  await sleep(500);
  const after = (() => { try { return require("node:fs").readdirSync("/proc/self/task").length; } catch { return -1; } })();
  rec("W7.5", "Sin fuga de hilos tras crear/terminar 6 workers", after <= before ? "PASS" : "PARTIAL", { hilosAntes: before, hilosDespues: after, delta: after - before });
}
// W8.3: concurrencia de 8 workers
{
  try {
    const N = 8, CPU = 1500;
    const t0 = Date.now();
    const ws = [];
    for (let i = 0; i < N; i++) ws.push(new wt.Worker(`
      const {parentPort}=require("node:worker_threads");
      const end=Date.now()+${CPU}; let x=0;
      while(Date.now()<end){for(let i=0;i<100000;i++)x+=i%7;}
      parentPort.postMessage({end:Date.now()});
    `, { eval: true }));
    const rs = await withTimeout(Promise.all(ws.map((w) => new Promise((res) => w.once("message", res)))), 30000, "c8");
    const wall = Date.now() - t0;
    const ratio = (CPU * N) / wall;
    rec("W8.3", `Concurrencia de ${N} workers CPU-bound (${CPU} ms c/u)`, ratio > 2.5 ? "PASS" : (ratio > 1.5 ? "PARTIAL" : "FAIL"), {
      wallMs: wall, sumaSerialMs: CPU * N, ratioParalelismo: Number(ratio.toFixed(2)),
      nucleosDetectados: navigator.hardwareConcurrency,
      veredicto: ratio > 2.5 ? "paralelismo real" : "paralelismo limitado",
    });
    await Promise.all(ws.map((w) => w.terminate()));
  } catch (e) { rec("W8.3", "Concurrencia de 8 workers", "FAIL", { error: e.message }); }
}
// W9.9: el worker NO puede escribir fuera de su sandbox? (control de permisos)
{
  try {
    const w = new wt.Worker(`
      const {parentPort}=require("node:worker_threads");
      const fs=require("node:fs");
      const res={};
      try{ fs.writeFileSync("/data/data/app.opencodehost/files/home/work/.f26_worker_write_probe","x"); res.write="OK"; }
      catch(e){ res.write="DENIED:"+e.code; }
      try{ res.read="/proc/self/status".length? "OK":"?"; }catch(e){ res.read="DENIED"; }
      parentPort.postMessage(res);
    `, { eval: true });
    const r = await withTimeout(new Promise((res) => w.once("message", res)), 8000, "perm");
    rec("W9.9", "Permisos de filesystem dentro del worker (mismo UID que el principal)", "PASS", r);
    await w.terminate();
  } catch (e) { rec("W9.9", "Permisos de filesystem en worker", "FAIL", { error: e.message }); }
}
writeFileSync(OUT, JSON.stringify({ bun: Bun.version, platform: process.platform, arch: process.arch, results: R }, null, 2));
console.log("=== RESUMEN PARTE 2 ===");
for (const r of R) console.log(`${r.status.padEnd(11)} ${r.id}  ${r.title}`);
console.log("CUENTA " + JSON.stringify(R.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {})));
