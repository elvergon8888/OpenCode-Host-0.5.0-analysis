import { MessageChannel, receiveMessageOnPort } from "node:worker_threads";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
console.log("runtime:", typeof Bun !== "undefined" ? "Bun " + Bun.version : "Node " + process.version);
const { port1, port2 } = new MessageChannel();
port2.postMessage("hola-sync");
await sleep(200);
const r = receiveMessageOnPort(port1);
console.log("receiveMessageOnPort(port1) =>", JSON.stringify(r));
