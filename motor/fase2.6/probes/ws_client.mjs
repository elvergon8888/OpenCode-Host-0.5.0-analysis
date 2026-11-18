// Cliente WebSocket RFC6455 sobre http.request (upgrade) - Node puro, sin deps.
// Uso: node ws_client.mjs <url> [--send "texto"] [--send-bin HEX] [--wait MS] [--out FILE]
import { createHash } from "node:crypto";
import http from "node:http";
import { writeFileSync } from "node:fs";

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
const u = new URL(url.replace(/^ws:/, "http:"));
const key = createHash("sha1").update(String(Math.random())).digest("base64"); // 16 bytes base64 valido
const auth = "Basic " + Buffer.from("opencode:" + process.env.OPENCODE_PASSWORD).toString("base64");

const req = http.request({
  hostname: u.hostname, port: Number(u.port || 80), path: u.pathname + (u.search || ""),
  method: "GET",
  headers: {
    Host: u.host, Authorization: auth,
    "Sec-WebSocket-Key": key, "Sec-WebSocket-Version": "13",
  },
});
req.setHeader("Connection", "Upgrade");
req.setHeader("Upgrade", "websocket");
req.on("upgrade", (res, socket) => {
  upgraded = true;
  const expect = createHash("sha1").update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64");
  console.error("WS_UPGRADE", res.statusCode, res.headers["sec-websocket-accept"] === expect ? "ACCEPT_OK" : "ACCEPT_MISMATCH");
  let buf = Buffer.alloc(0);
  socket.on("data", (d) => {
    buf = Buffer.concat([buf, d]);
    for (;;) {
      if (buf.length < 2) break;
      const b0 = buf[0], b1 = buf[1];
      const opcode = b0 & 0x0f, masked = (b1 & 0x80) !== 0;
      let len = b1 & 0x7f, off = 2;
      if (len === 126) { if (buf.length < 4) break; len = buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (buf.length < 10) break; len = Number(buf.readBigUInt64BE(2)); off = 10; }
      const maskOff = masked ? off : -1;
      if (masked) off += 4;
      if (buf.length < off + len) break;
      let payload = buf.slice(off, off + len);
      if (masked) { const mk = buf.slice(maskOff, maskOff + 4); const o = Buffer.alloc(len); for (let i = 0; i < len; i++) o[i] = payload[i] ^ mk[i % 4]; payload = o; }
      buf = buf.slice(off + len);
      if (opcode === 0x8) { closeInfo = { code: payload.length >= 2 ? payload.readUInt16BE(0) : null, reason: payload.slice(2).toString() }; frames.push({ t: "close", ...closeInfo }); }
      else if (opcode === 0x9) sendFrame(payload, 10);
      else if (opcode === 0x1 || opcode === 0x2 || opcode === 0x0) frames.push({ t: opcode === 0x2 ? "bin" : "text", d: payload.toString("utf8"), hex: payload.toString("hex").slice(0, 600), bytes: payload.length });
    }
  });
  socket.on("error", (e) => frames.push({ t: "socket_error", d: e.message }));
  socket.on("close", () => { frames.push({ t: "socket_close" }); });
  function sendFrame(data, opcode = 1) {
    const mask = Buffer.from([1, 2, 3, 4]);
    const len = data.length;
    let h;
    if (len < 126) { h = Buffer.alloc(2); h[1] = 0x80 | len; }
    else if (len < 65536) { h = Buffer.alloc(4); h[1] = 0x80 | 126; h.writeUInt16BE(len, 2); }
    else { h = Buffer.alloc(10); h[1] = 0x80 | 127; h.writeBigUInt64BE(BigInt(len), 2); }
    h[0] = 0x80 | opcode;
    const m = Buffer.alloc(len);
    for (let i = 0; i < len; i++) m[i] = data[i] ^ mask[i % 4];
    socket.write(Buffer.concat([h, mask, m]));
    frames.push({ t: "sent", op: opcode, d: data.toString("utf8").slice(0, 200), bytes: len });
  }
  globalThis.__send = sendFrame;
  if (sends.length) setTimeout(() => { for (const s of sends) sendFrame(s.data, s.op); }, 250);
});
req.on("response", (res) => {
  let body = "";
  res.on("data", (c) => { body += c; });
  res.on("end", () => {
    console.error("WS_HTTP_ERROR status=" + res.statusCode + " body=" + body.slice(0, 600));
    const out = { url, httpStatus: res.statusCode, httpBody: body, frames, close: closeInfo };
    if (outFile) writeFileSync(outFile, JSON.stringify(out, null, 2));
    process.exit(4);
  });
});
req.on("error", (e) => { console.error("WS_REQ_ERROR", e.message); process.exit(5); });
req.end();
setTimeout(() => {
  const out = { url, upgraded, frames, close: closeInfo, total: frames.length };
  if (outFile) writeFileSync(outFile, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
}, waitMs);
