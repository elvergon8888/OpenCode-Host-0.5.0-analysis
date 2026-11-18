// ============================================================================
// Fase 2.6 - ORACULO Node v26 (Termux) para los casos ambiguos de Bun 1.4.0.
// No forma parte del APK: solo sirve para decidir si un FAIL de Bun es
// "limitacion de Bun" o "semantica estandar de Node" (equivalente).
// ============================================================================
import { writeFileSync } from "node:fs";
const wt = await import("node:worker_threads");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function withTimeout(p, ms, l) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("TIMEOUT_" + l)), ms))]);
}
const R = [];
function rec(id, title, status, evidence) {
  R.push({ id, title, status, evidence });
  console.log("[NODE] " + status.padEnd(11) + " " + id + " :: " + title);
  console.log("        -> " + JSON.stringify(evidence).slice(0, 700));
}
console.log("=== ORACULO NODE " + process.version + " ===");

// N1: MessagePort enviado SIN transferList
{
  const { port1, port2 } = new wt.MessageChannel();
  const w = new wt.Worker("const {parentPort}=require('node:worker_threads');parentPort.postMessage({ok:1});", { eval: true });
  await withTimeout(new Promise((res) => w.once("message", res)), 8000, "n1");
  let error = null;
  try { w.postMessage({ port: port2 }); } catch (e) { error = { message: e.message, name: e.name, code: e.code }; }
  rec("N1", "MessagePort enviado SIN transferList", error ? "PASS" : "FAIL", {
    error,
    interpretacion: error
      ? "Node RECHAZA clonar un MessagePort no transferido: mismo comportamiento que Bun (equivalente, no limitacion)"
      : "Node permite clonar el MessagePort (Bun diverge)",
  });
  port1.close(); port2.close(); await w.terminate();
}

// N2: BroadcastChannel principal -> worker CON ACK de listo
{
  try {
    const w = new wt.Worker(
      "const {BroadcastChannel,parentPort}=require('node:worker_threads');" +
      "const bc=new BroadcastChannel('f26-node-bc');" +
      "bc.onmessage=(e)=>parentPort.postMessage({bc:e.data});" +
      "parentPort.postMessage({ready:true});",
      { eval: true }
    );
    await withTimeout(new Promise((res) => w.once("message", res)), 8000, "n2ready");
    const bc = new wt.BroadcastChannel("f26-node-bc");
    const done = withTimeout(new Promise((res) => w.once("message", (m) => { if (m && m.bc) res(m); })), 6000, "n2");
    bc.postMessage("payload");
    const r = await done;
    rec("N2", "BroadcastChannel principal->worker (con ACK)", r.bc === "payload" ? "PASS" : "FAIL", r);
    bc.close(); await w.terminate();
  } catch (e) { rec("N2", "BroadcastChannel principal->worker (con ACK)", "FAIL", { error: e.message }); }
}

// N3: BroadcastChannel dos instancias en el hilo principal
{
  const a = new wt.BroadcastChannel("f26-node-d1");
  const b = new wt.BroadcastChannel("f26-node-d1");
  let got = null;
  b.onmessage = (e) => { got = e.data; };
  a.postMessage("x");
  await sleep(800);
  rec("N3", "BroadcastChannel dos instancias en el mismo hilo", got === "x" ? "PASS" : "FAIL", { recibido: got });
  a.close(); b.close();
}

// N4: moveMessagePortToContext (API exclusiva de Node)
{
  try {
    const { port1 } = new wt.MessageChannel();
    wt.moveMessagePortToContext(port1, "ctx");
    rec("N4", "moveMessagePortToContext", "FAIL", { resultado: "no lanzo error" });
  } catch (e) {
    rec("N4", "moveMessagePortToContext", "PARTIAL", {
      error: e.message, code: e.code,
      interpretacion: "API exclusiva de Node (contexto vm); Bun la declara pero no la implementa",
    });
  }
}

// N5: env: SHARE_ENV + get/setEnvironmentData
{
  try {
    const w = new wt.Worker(
      "const {parentPort,getEnvironmentData,setEnvironmentData}=require('node:worker_threads');" +
      "setEnvironmentData('k','v');" +
      "parentPort.postMessage({d:getEnvironmentData('k')});",
      { eval: true, env: wt.SHARE_ENV }
    );
    const r = await withTimeout(new Promise((res) => w.once("message", res)), 8000, "n5");
    rec("N5", "env: SHARE_ENV + get/setEnvironmentData", r.d === "v" ? "PASS" : "FAIL", r);
    await w.terminate();
  } catch (e) { rec("N5", "env: SHARE_ENV", "FAIL", { error: e.message }); }
}

// N6: forma de la API isInternalThread
{
  rec("N6", "isInternalThread: forma de la API", typeof wt.isInternalThread === "function" ? "PASS" : "FAIL", {
    tipoEnNode: typeof wt.isInternalThread,
    nota: "Bun exporta isInternalThread como boolean: divergencia de firma frente a Node",
  });
}

// N7: BroadcastChannel: el emisor NO recibe su propio mensaje
{
  const a = new wt.BroadcastChannel("f26-node-self");
  let selfGot = null;
  a.onmessage = (e) => { selfGot = e.data; };
  a.postMessage("self");
  await sleep(600);
  rec("N7", "BroadcastChannel: el emisor NO recibe su propio mensaje", selfGot === null ? "PASS" : "FAIL", {
    recibidoPorElEmisor: selfGot,
  });
  a.close();
}

writeFileSync(process.env.F26_OUT || "workers_node_oracle.json",
  JSON.stringify({ node: process.version, results: R }, null, 2));
console.log("=== RESUMEN ORACULO ===");
for (const r of R) console.log(r.status.padEnd(11) + " " + r.id + "  " + r.title);
console.log("CUENTA " + JSON.stringify(R.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {})));
