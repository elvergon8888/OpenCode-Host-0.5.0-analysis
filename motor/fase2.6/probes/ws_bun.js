// Cliente WebSocket con el runtime Bun del APK original.
// Uso: bun ws_bun.js <url> [--send "texto"] [--send-bin HEX] [--wait MS] [--out FILE]
const args = process.argv.slice(2);
const url = args[0];
const sends = [];
let waitMs = 4000, outFile = null;
for (let i = 1; i < args.length; i++) {
  if (args[i] === "--send") sends.push({ op: 1, data: Buffer.from(args[++i], "utf8") });
  else if (args[i] === "--send-bin") sends.push({ op: 2, data: Buffer.from(args[++i], "hex") });
  else if (args[i] === "--wait") waitMs = Number(args[++i]);
  else if (args[i] === "--out") outFile = args[++i];
}
const auth = "Basic " + Buffer.from("opencode:" + (process.env.OPENCODE_PASSWORD || "")).toString("base64");
const frames = [], events = [];
const ws = new WebSocket(url, { headers: { Authorization: auth } });
ws.binaryType = "arraybuffer";
ws.onopen = () => {
  events.push({ t: "open" });
  if (sends.length) setTimeout(() => { for (const s of sends) { ws.send(s.data); events.push({ t: "sent", op: s.op, d: s.data.toString("utf8").slice(0, 200), bytes: s.data.length }); } }, 250);
};
ws.onmessage = (e) => {
  const isBin = typeof e.data !== "string";
  const buf = isBin ? Buffer.from(e.data) : Buffer.from(e.data, "utf8");
  frames.push({ type: isBin ? "binary" : "text", data: buf.toString("utf8"), hex: buf.toString("hex").slice(0, 400), bytes: buf.length });
};
ws.onerror = (e) => events.push({ t: "error", message: e.message || String(e) });
ws.onclose = (e) => events.push({ t: "close", code: e.code, reason: e.reason });
setTimeout(() => {
  const out = { url, events, frames, framesText: frames.map((f) => f.data).join("") };
  if (outFile) require("node:fs").writeFileSync(outFile, JSON.stringify(out, null, 2));
  console.log("=== EVENTOS ===");
  for (const ev of events) console.log("  " + JSON.stringify(ev));
  console.log("=== FRAMES (" + frames.length + ") ===");
  for (const f of frames) console.log("  [" + f.type + "] bytes=" + f.bytes + " hex=" + f.hex + " :: " + JSON.stringify(f.data));
  process.exit(0);
}, waitMs);
