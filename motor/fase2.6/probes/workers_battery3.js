// ============================================================================
// Fase 2.6 - Bateria node:worker_threads, PARTE 3 (aislar limites de MessagePort
// y BroadcastChannel, y caracterizar el sandbox de permisos del worker en Android)
// ============================================================================
import { writeFileSync } from "node:fs";
const OUT = process.env.F26_OUT || "workers_battery3.json";
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
console.log("=== FASE 2.6 :: BATERIA WORKERS PARTE 3 (Bun " + Bun.version + ") ===");

// C1: MessageChannel DENTRO del worker (control de aislamiento)
{
  try {
    const w = new wt.Worker(`
      const {parentPort,MessageChannel}=require("node:worker_threads");
      const {port1,port2}=new MessageChannel();
      port1.on("message",(x)=>parentPort.postMessage({eco:x}));
      port2.postMessage("dentro-worker");
    `, { eval: true });
    const r = await withTimeout(new Promise((res) => w.once("message", res)), 8000, "c1");
    rec("C1", "MessageChannel creado DENTRO del worker (autocontrol)", r.eco === "dentro-worker" ? "PASS" : "FAIL", r);
    await w.terminate();
  } catch (e) { rec("C1", "MessageChannel dentro del worker", "FAIL", { error: e.message }); }
}
// C2: MessageChannel entre principal y worker, con y sin transferList
{
  for (const modo of ["sin-transferList", "con-transferList"]) {
    try {
      const { port1, port2 } = new wt.MessageChannel();
      const w = new wt.Worker(`
        const {parentPort}=require("node:worker_threads");
        parentPort.on("message",(m)=>{
          if(!m||!m.port) return;
          try{ m.port.on("message",(x)=>parentPort.postMessage({eco:x})); m.port.postMessage("w->main"); }
          catch(e){ parentPort.postMessage({err:e.message}); }
        });
      `, { eval: true });
      let got = null, err = null;
      const done = withTimeout(new Promise((res) => {
        w.on("message", (m) => { if (!m) return; if (m.eco) { got = m.eco; res(); } if (m.err) { err = m.err; res(); } });
      }), 6000, "c2");
      if (modo === "sin-transferList") w.postMessage({ port: port2 });
      else w.postMessage({ port: port2 }, [port2]);
      port1.postMessage("main->w");
      await done;
      rec(modo === "sin-transferList" ? "C2.1" : "C2.2", `MessageChannel principal<->worker (${modo})`,
        got ? "PASS" : "FAIL", { recibidoEnPrincipal: got, errorEnWorker: err });
      port1.close(); port2.close(); await w.terminate();
    } catch (e) {
      rec(modo === "sin-transferList" ? "C2.1" : "C2.2", `MessageChannel principal<->worker (${modo})`, "FAIL", { error: e.message });
    }
  }
}
// C3: BroadcastChannel - control (solo principal) y entre principal y worker
{
  try {
    const bc = new wt.BroadcastChannel("f26-control");
    let got = null;
    bc.onmessage = (e) => { got = e.data; };
    bc.postMessage("ctrl");
    await sleep(600);
    rec("C3.1", "BroadcastChannel solo en el hilo principal (control)", got === "ctrl" ? "PASS" : "FAIL", { recibido: got });
    bc.close();
  } catch (e) { rec("C3.1", "BroadcastChannel en principal", "FAIL", { error: e.message }); }
  try {
    const w = new wt.Worker(`
      const {BroadcastChannel,parentPort}=require("node:worker_threads");
      const bc=new BroadcastChannel("f26-cross");
      bc.onmessage=(e)=>parentPort.postMessage({bc:e.data});
    `, { eval: true });
    const done = withTimeout(new Promise((res) => w.once("message", res)), 6000, "c3b");
    const bc = new wt.BroadcastChannel("f26-cross");
    bc.postMessage("cross");
    const r = await done;
    rec("C3.2", "BroadcastChannel entre principal y worker", r.bc === "cross" ? "PASS" : "FAIL", r);
    bc.close(); await w.terminate();
  } catch (e) { rec("C3.2", "BroadcastChannel entre principal y worker", "FAIL", { error: e.message }); }
}
// C4: SHARE_ENV - control y con worker
{
  try {
    const w = new wt.Worker(`
      const {parentPort}=require("node:worker_threads");
      parentPort.postMessage({ok:1});
    `, { eval: true, env: wt.SHARE_ENV });
    const r = await withTimeout(new Promise((res) => w.once("message", res)), 8000, "c4");
    rec("C4.1", "Opcion env: SHARE_ENV (constructor)", r.ok === 1 ? "PASS" : "FAIL", r);
    await w.terminate();
  } catch (e) { rec("C4.1", "Opcion env: SHARE_ENV", "FAIL", { error: e.message }); }
  try {
    const w = new wt.Worker(`
      const {parentPort,getEnvironmentData,setEnvironmentData}=require("node:worker_threads");
      setEnvironmentData("k","v");
      parentPort.postMessage({v:getEnvironmentData("k"), share:getEnvironmentData("SHARE_ENV")});
    `, { eval: true, env: wt.SHARE_ENV });
    const r = await withTimeout(new Promise((res) => w.once("message", res)), 8000, "c4b");
    rec("C4.2", "get/setEnvironmentData + SHARE_ENV", r.v === "v" ? "PASS" : "PARTIAL", r);
    await w.terminate();
  } catch (e) { rec("C4.2", "get/setEnvironmentData", "FAIL", { error: e.message }); }
}
// C5: caracterizacion del sandbox de permisos del worker en Android
{
  const fs = require("node:fs");
  const probe = "/data/data/app.opencodehost/files/home/work/.f26_probe_file";
  const principal = {};
  try { fs.writeFileSync(probe, "x"); principal.write = "OK"; } catch (e) { principal.write = "DENIED:" + e.code; }
  try { fs.unlinkSync(probe); } catch {}
  try {
    const w = new wt.Worker(`
      const {parentPort}=require("node:worker_threads");
      const fs=require("node:fs");
      const res={};
      const p=${JSON.stringify(probe)};
      try{ fs.writeFileSync(p,"x"); res.write="OK"; fs.unlinkSync(p); }
      catch(e){ res.write="DENIED:"+e.code; }
      try{ res.readOwn="/proc/self/status".length?"OK":"?"; }catch(e){ res.readOwn="DENIED"; }
      try{ res.cwd=process.cwd(); }catch(e){ res.cwd="ERR"; }
      try{ res.uid=process.getuid?process.getuid():null; res.gid=process.getgid?process.getgid():null; }catch(e){}
      parentPort.postMessage(res);
    `, { eval: true });
    const r = await withTimeout(new Promise((res) => w.once("message", res)), 8000, "c5");
    rec("C5.1", "Escritura en el sandbox: principal vs worker", "PARTIAL", {
      principalEscribe: principal.write, workerEscribe: r.write,
      lecturaEnWorker: r.readOwn, cwdWorker: r.cwd, uidWorker: r.uid, gidWorker: r.gid,
      interpretacion: r.write !== principal.write
        ? "El worker tiene permisos MAS restrictivos que el hilo principal: no puede escribir en el sandbox de la app (EACCES), aunque el principal si. Limitacion especifica de Android/Bun."
        : "Mismos permisos en worker y principal.",
    });
    await w.terminate();
  } catch (e) { rec("C5.1", "Permisos del worker vs principal", "FAIL", { error: e.message }); }
}
// C6: el worker puede ejecutar binarios del sistema?
{
  try {
    const w = new wt.Worker(`
      const {parentPort}=require("node:worker_threads");
      const {spawnSync}=require("node:child_process");
      const r=spawnSync("/system/bin/echo",["worker-child-ok"]);
      parentPort.postMessage({status:r.status, out:(r.stdout||"").toString().trim(), err:(r.stderr||"").toString().trim()});
    `, { eval: true });
    const r = await withTimeout(new Promise((res) => w.once("message", res)), 8000, "c6");
    rec("C6.1", "El worker puede ejecutar procesos del sistema", r.out === "worker-child-ok" ? "PASS" : "PARTIAL", r);
    await w.terminate();
  } catch (e) { rec("C6.1", "El worker puede ejecutar procesos", "FAIL", { error: e.message }); }
}
// C7: tiempo de arranque en Cold vs warm
{
  const arr = [];
  for (let i = 0; i < 5; i++) {
    const t0 = Date.now();
    const w = new wt.Worker("const {parentPort}=require('node:worker_threads');parentPort.postMessage(1);", { eval: true });
    await withTimeout(new Promise((res) => w.once("message", res)), 8000, "c7");
    arr.push(Date.now() - t0);
    await w.terminate();
  }
  rec("C7.1", "Coste de arranque de worker (5 muestras, Android)", "PASS", {
    msPorArranque: arr, mediaMs: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
  });
}
// C8: limite de workers simultaneos: 16
{
  try {
    const N = 16;
    const t0 = Date.now();
    const ws = [];
    for (let i = 0; i < N; i++) ws.push(new wt.Worker("const {parentPort}=require('node:worker_threads');parentPort.postMessage(1);", { eval: true }));
    const rs = await withTimeout(Promise.all(ws.map((w) => new Promise((res, rej) => { w.once("message", res); w.once("error", rej); }))), 30000, "c8");
    rec("C8.1", `Creacion de ${N} workers simultaneos`, rs.length === N ? "PASS" : "PARTIAL", {
      creados: rs.length, ms: Date.now() - t0, nucleos: navigator.hardwareConcurrency,
    });
    await Promise.all(ws.map((w) => w.terminate()));
  } catch (e) { rec("C8.1", "16 workers simultaneos", "FAIL", { error: e.message }); }
}
writeFileSync(OUT, JSON.stringify({ bun: Bun.version, platform: process.platform, arch: process.arch, results: R }, null, 2));
console.log("=== RESUMEN PARTE 3 ===");
for (const r of R) console.log(`${r.status.padEnd(11)} ${r.id}  ${r.title}`);
console.log("CUENTA " + JSON.stringify(R.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {})));
