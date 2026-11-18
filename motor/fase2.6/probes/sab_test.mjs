// SAB compartido entre workers: el worker solo responde tras "start" (sin carrera)
import { Worker } from "node:worker_threads";
const rt = typeof Bun !== "undefined" ? "Bun " + Bun.version : "Node " + process.version;
console.log("runtime:", rt);
const src = `
const {parentPort}=require("node:worker_threads");
parentPort.on("message",(m)=>{
  if(!m||m.cmd!=="start") return;
  const ia=new Int32Array(m.sab);
  const prev=Atomics.load(ia,0);
  Atomics.add(ia,0,1);
  parentPort.postMessage({cmd:"done",prev,ahora:Atomics.load(ia,0)});
});
`;
const sab = new SharedArrayBuffer(8);
const ws = [];
const done = [];
for (let i=0;i<4;i++) {
  const w = new Worker(src,{eval:true});
  w.on("message",(m)=>{ if(m&&m.cmd==="done") done.push(m); });
  ws.push(w);
}
await new Promise(r=>setTimeout(r,300));
for (const w of ws) w.postMessage({cmd:"start",sab});
await new Promise(r=>setTimeout(r,1500));
console.log("lecturas por worker:", JSON.stringify(done.map(d=>d.ahora)));
console.log("valor FINAL leido por el principal:", Atomics.load(new Int32Array(sab),0), "(esperado 4)");
await Promise.all(ws.map(w=>w.terminate()));
