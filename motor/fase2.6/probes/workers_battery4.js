// ============================================================================
// Fase 2.6 - Bateria node:worker_threads, PARTE 4 (caracterizacion definitiva)
// Objetivo: separar "limitacion real de Bun" de "artefacto del probe".
//   D1 BroadcastChannel: dos instancias en el hilo principal (control)
//   D2 BroadcastChannel: principal -> worker, con ACK de listo (sin carrera)
//   D3 MessagePort transferido, con ACK de listo (sin carrera)
//   D4 MessageChannel SIN transferList -> comparar con la semantica de Node
//   D5 API exportadas pero no implementadas (postMessageToThread, etc.)
//   D6 SHARE_ENV: comportamiento real (sin clonar Symbol)
// ============================================================================
import { writeFileSync } from "node:fs";
const OUT = process.env.F26_OUT || "workers_battery4.json";
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
console.log("=== FASE 2.6 :: BATERIA WORKERS PARTE 4 (Bun " + Bun.version + ") ===");

// D1: BroadcastChannel con DOS instancias en el hilo principal
{
  const a = new wt.BroadcastChannel("f26-d1");
  const b = new wt.BroadcastChannel("f26-d1");
  let got = null;
  b.onmessage = (e) => { got = e.data; };
  a.postMessage("d1-payload");
  await sleep(800);
  rec("D1", "BroadcastChannel: dos instancias en el MISMO hilo principal", got === "d1-payload" ? "PASS" : "FAIL",
    { recibidoEnOtraInstancia: got, nota: "Si falla aqui, BroadcastChannel no esta implementado en Bun" });
  a.close(); b.close();
}

// D1b: el emisor NO debe recibir su propio mensaje (semantica de la spec)
{
  const a = new wt.BroadcastChannel("f26-d1b");
  let selfGot = null;
  a.onmessage = (e) => { selfGot = e.data; };
  a.postMessage("self");
  await sleep(600);
  rec("D1b", "BroadcastChannel: el emisor NO recibe su propio mensaje (spec)", selfGot === null ? "PASS" : "PARTIAL",
    { recibidoPorElEmisor: selfGot, nota: "La spec de Node/Web exige que el emisor no reciba su propio mensaje" });
  a.close();
}

// D2: BroadcastChannel principal -> worker con ACK de listo (elimina la carrera)
{
  try {
    const w = new wt.Worker(`
      const {BroadcastChannel,parentPort}=require("node:worker_threads");
      const bc=new BroadcastChannel("f26-d2");
      bc.onmessage=(e)=>parentPort.postMessage({bc:e.data});
      parentPort.postMessage({ready:true});
    `, { eval: true });
    await withTimeout(new Promise((res) => w.once("message", res)), 8000, "d2ready");
    const bc = new wt.BroadcastChannel("f26-d2");
    const done = withTimeout(new Promise((res) => w.once("message", (m) => { if (m && m.bc) res(m); })), 6000, "d2");
    bc.postMessage("d2-payload");
    const r = await done;
    rec("D2", "BroadcastChannel: principal -> worker (con ACK de listo)", r.bc === "d2-payload" ? "PASS" : "FAIL", r);
    bc.close(); await w.terminate();
  } catch (e) { rec("D2", "BroadcastChannel: principal -> worker (con ACK de listo)", "FAIL", { error: e.message }); }
}

// D3: MessagePort transferido con ACK de listo (elimina la carrera)
{
  try {
    const { port1, port2 } = new wt.MessageChannel();
    const w = new wt.Worker(`
      const {parentPort}=require("node:worker_threads");
      parentPort.on("message",(m)=>{
        if(!m||!m.port) return;
        m.port.on("message",(x)=>parentPort.postMessage({eco:x}));
        m.port.postMessage("w->main");
        parentPort.postMessage({ready:true});
      });
    `, { eval: true });
    const done = withTimeout(new Promise((res) => w.once("message", (m) => { if (m && m.ready) res(m); })), 8000, "d3ready");
    w.postMessage({ port: port2 }, [port2]);
    await done;
    const got = await withTimeout(new Promise((res) => { port1.on("message", res); }), 6000, "d3");
    rec("D3", "MessagePort transferido principal->worker con ACK de listo", got === "w->main" ? "PASS" : "FAIL",
      { recibidoEnPrincipal: got });
    port1.close(); await w.terminate();
  } catch (e) { rec("D3", "MessagePort transferido con ACK de listo", "FAIL", { error: e.message }); }
}

// D4: MessageChannel SIN transferList -> cual es la semantica real?
{
  try {
    const { port1, port2 } = new wt.MessageChannel();
    const w = new wt.Worker(`const {parentPort}=require("node:worker_threads");parentPort.postMessage({ok:1});`, { eval: true });
    await withTimeout(new Promise((res) => w.once("message", res)), 8000, "d4");
    let error = null;
    try { w.postMessage({ port: port2 }); } catch (e) { error = { message: e.message, name: e.name, code: e.code }; }
    rec("D4", "MessagePort enviado SIN transferList (semantica Node)", error ? "PARTIAL" : "FAIL", {
      error,
      interpretacion: error
        ? "Bun RECHAZA clonar un MessagePort no transferido. En Node.js el mismo uso lanza DataCloneError ('MessagePort objects cannot be cloned'), por lo que es semantica equivalente, NO una limitacion de Bun."
        : "Bun clona el MessagePort sin error (comportamiento divergente respecto a Node)",
      comparacionNode: "pendiente: ejecutar el mismo caso con node v26 (ver workers_node_oracle.mjs)",
    });
    port1.close(); port2.close(); await w.terminate();
  } catch (e) { rec("D4", "MessagePort sin transferList", "FAIL", { error: e.message }); }
}

// D5: APIs exportadas pero potencialmente no implementadas
{
  const casos = [
    ["markAsUntransferable", () => { wt.markAsUntransferable({ a: 1 }); }],
    ["isMarkedAsUntransferable", () => wt.isMarkedAsUntransferable({ a: 1 })],
    ["postMessageToThread", () => wt.postMessageToThread(0, { hola: 1 })],
    ["receiveMessageOnPort", () => wt.receiveMessageOnPort(new wt.MessageChannel().port1)],
    ["isInternalThread", () => wt.isInternalThread(0)],
    ["threadName", () => wt.threadName],
  ];
  for (const [n, fn] of casos) {
    try {
      const v = fn();
      rec("D5." + n, `API exportada: ${n}`, "PASS", { valor: typeof v === "object" ? JSON.stringify(v) : String(v) });
    } catch (e) {
      const ni = /not yet implemented|not implemented|unsupported/i.test(e.message || "");
      rec("D5." + n, `API exportada: ${n}`, ni ? "PARTIAL" : "FAIL", {
        error: e.message, code: e.code, nombre: e.name,
        interpretacion: ni ? "Exportada pero no implementada en Bun 1.4.0" : "error inesperado",
      });
    }
  }
}

// D6: SHARE_ENV real (sin clonar un Symbol)
{
  try {
    const w = new wt.Worker(`
      const {parentPort,getEnvironmentData,setEnvironmentData}=require("node:worker_threads");
      setEnvironmentData("clave","valor");
      parentPort.postMessage({
        dato:getEnvironmentData("clave"),
        compartido:getEnvironmentData("SHARE_ENV")===undefined?"undef":"def",
        envHeredada:process.env.F26_ENV_TEST||null
      });
    `, { eval: true, env: wt.SHARE_ENV });
    const r = await withTimeout(new Promise((res) => w.once("message", res)), 8000, "d6");
    rec("D6", "SHARE_ENV: get/setEnvironmentData + env heredada", r.dato === "valor" ? "PASS" : "PARTIAL", r);
    await w.terminate();
  } catch (e) { rec("D6", "SHARE_ENV", "FAIL", { error: e.message }); }
}

writeFileSync(OUT, JSON.stringify({ bun: Bun.version, platform: process.platform, arch: process.arch, results: R }, null, 2));
console.log("=== RESUMEN PARTE 4 ===");
for (const r of R) console.log(`${r.status.padEnd(11)} ${r.id}  ${r.title}`);
console.log("CUENTA " + JSON.stringify(R.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {})));
