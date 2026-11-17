/**
 * CreafMotorCode — PlatformProvider / PtyProvider
 *
 * EVIDENCIA — el motor tiene DOS implementaciones de PTY, ambas ya contemplan Android:
 *
 * (1) RUTA FFI — `bun:ffi` + librust_pty
 *     chunk-kb1j967y.js (chunk_0263_213351226.js) @133
 *       import{dlopen as I,FFIType as _,ptr as l}from"bun:ffi";
 *       J.exports="/$bunfs/root/librust_pty_arm64-2resfh96.so"   <- asset embebido en el VFS de Bun
 *       function c(platform, arch, musl) {
 *         if (platform === "darwin") ...
 *         if (platform === "win32")  ...
 *         return arch === "arm64" ? ["librust_pty_arm64.so","librust_pty.so"] : ["librust_pty.so"]
 *       }                                                            <- YA incluye "android"
 *       Resolucion del binario: BUN_PTY_LIB -> native module del VFS -> rutas del filesystem
 *       Firma FFI (8 funciones):
 *         bun_pty_spawn(cstring,cstring,cstring,i32,i32)->i32
 *         bun_pty_write(i32,pointer,i32)->i32
 *         bun_pty_read(i32,pointer,i32)->i32
 *         bun_pty_resize(i32,i32,i32)->i32
 *         bun_pty_kill(i32)->i32
 *         bun_pty_get_pid(i32)->i32
 *         bun_pty_get_exit_code(i32)->i32
 *         bun_pty_close(i32)->void
 *
 * (2) RUTA PROCESO — binario helper `opencode-pty` + framing JSON
 *     chunk-4z9vkptb.js (chunk_0003_93889274.js) @211622
 *       mt = { path:"/$bunfs/root/opencode-pty-8yhk1nqj.", version:"0.4.0", sha256:"1e5bdbc5..." }
 *       Extraccion atomica: mkdir(0700) -> lstat anti-symlink -> Bun.file(path).arrayBuffer()
 *                          -> sha256 verify -> open("wx",0700) -> write -> fsync -> rename
 *       Framing: cabecera de longitud uint32 BE + payload JSON, max 8 MiB.
 *       El helper se lanza con child_process.spawn (chunk-4z9vkptb.js @198796).
 *
 * ESTADO EN ANDROID (medido):
 *   - `builtin://bun/ffi` esta registrado en libopencode.so (Bun para Android).
 *   - `librust_pty_arm64-2resfh96.so` esta embebido en el VFS.
 *   - La APK ya incluye `libopencode-pty.so` (2.9 MB, Rust, portable_pty/openpty,
 *     OPENCODE_PTY_SOCKET_DIR): implementacion PTY bionic propia del host.
 *   - NO se ha observado en opencode.log ningun error de PTY: la ruta no se ha ejercitado.
 *     => verificacion empirica pendiente (prueba PTY-01..04 de equivalence-tests.md).
 */

export type PtyBackend = "none" | "ffi" | "helper" | "both"

export interface PtyOptions {
  readonly cols?: number
  readonly rows?: number
  readonly name?: string
  readonly cwd?: string
  readonly env?: Record<string, string | undefined>
  readonly userData?: string
}

export interface Pty {
  readonly pid: number
  readonly cols: number
  readonly rows: number
  write(data: string | Uint8Array): void
  resize(cols: number, rows: number): void
  kill(signal?: string): void
  /** Codigo de salida una vez terminado. */
  readonly exitCode: number | null
  onData(listener: (chunk: Uint8Array) => void): () => void
  onExit(listener: (code: number) => void): () => void
  /** Cierra los descriptores. */
  dispose(): void
}

export interface PtyProvider {
  /**
   * Crea una terminal pseudo-tty.
   * @param backend forzar un backend concreto ("ffi" | "helper"). Si se omite, el
   *                proveedor elige segun `capabilities.pty` y disponibilidad real.
   */
  spawn(
    command: string,
    args?: readonly string[],
    options?: PtyOptions & { readonly backend?: Exclude<PtyBackend, "none" | "both"> },
  ): Pty

  /** Backends efectivamente disponibles en este host. */
  readonly backends: PtyBackend

  /** true si el backend puede redimensionar la terminal (ioctl TIOCSWINSZ). */
  readonly supportsResize: boolean
  /** true si el host puede asignar una PTY (openpty/forkpty) desde el sandbox. */
  readonly supportsPty: boolean
}
