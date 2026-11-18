// W6.4: que devuelve terminate() sobre un worker YA terminado? (Bun vs Node)
import { Worker } from "node:worker_threads";
const rt = typeof Bun !== "undefined" ? "Bun " + Bun.version : "Node " + process.version;
console.log("runtime:", rt);
const w = new Worker("setTimeout(()=>{},10)", { eval: true });
const natural = await new Promise((res) => w.once("exit", res));
console.log("exitCode natural:", natural);
let r;
try {
  r = await w.terminate();
  console.log("terminate() ->", typeof r, JSON.stringify(r));
} catch (e) {
  console.log("terminate() LANZO:", e.code, "|", e.message);
}
