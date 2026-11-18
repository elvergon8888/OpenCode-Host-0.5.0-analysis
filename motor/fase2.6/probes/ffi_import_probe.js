// Fase 2.6 - Comprueba si el bunfs del APK sigue montado bajo BUN_BE_BUN=1
console.log("BUN", Bun.version);
try {
  const ef = Bun.embeddedFiles;
  const names = Object.keys(ef);
  console.log("EMBEDDED_COUNT", names.length);
  console.log("EMBEDDED_MATCH", names.filter(n => /rust_pty|pty|chunk-/.test(n)).slice(0, 20).join(","));
} catch (e) { console.log("EMBEDDED_FAIL", e.message); }
try {
  const m = await import("/$bunfs/root/chunk-kb1j967y.js");
  console.log("IMPORT_FFI_CHUNK_OK", Object.keys(m).join(","));
} catch (e) { console.log("IMPORT_FFI_CHUNK_FAIL", e.message.slice(0, 300)); }
