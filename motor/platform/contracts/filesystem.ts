/**
 * CreafMotorCode — PlatformProvider / FilesystemProvider
 *
 * EVIDENCIA:
 *   - `node:fs`          : 61 contactos en 28 modulos (max rdeps 102)
 *   - `node:fs/promises` : 64 contactos en 30 modulos (max rdeps 52)
 *   - `Bun.file`         : 13 contactos en 5 modulos (incluye la extraccion del binario
 *                          `opencode-pty` con verificacion SHA-256 — chunk-4z9vkptb.js @211622)
 *   - `node:path`        : 171 contactos en 61 modulos
 *   - `node:url`         : 27 contactos (fileURLToPath / pathToFileURL)
 *   - watcher            : `watcher backend not supported` platform=android (chunk-4z9vkptb.js)
 *
 * NOTA ANDROID (medida en el APK vivo):
 *   - `/` y `/data` devuelven EACCES (sandbox de aplicacion).
 *   - El watcher recursivo nativo de Bun no esta disponible en Android: el motor cae a
 *     `backend=node` (fs.watch no recursivo). Ver capabilities.recursiveWatch.
 */

export interface FileStat {
  readonly size: number
  readonly mode: number
  readonly uid: number
  readonly gid: number
  readonly isFile: boolean
  readonly isDirectory: boolean
  readonly isSymbolicLink: boolean
  readonly birthtimeMs: number
  readonly mtimeMs: number
  readonly ctimeMs: number
}

export interface Dirent {
  readonly name: string
  readonly isFile: boolean
  readonly isDirectory: boolean
  readonly isSymbolicLink: boolean
}

export interface WatchOptions {
  /** Observar recursivamente. En Android/Bun no esta soportado -> capabilities.recursiveWatch=false. */
  readonly recursive?: boolean
}

export interface Watcher {
  close(): void
}

/**
 * Handle de archivo equivalente a `Bun.file(path)`.
 * Se usa para leer el binario embebido `opencode-pty` (verificacion sha256) y archivos de sesion.
 */
export interface PlatformFile {
  readonly path: string
  readonly size: number
  readonly type: string
  exists(): Promise<boolean>
  text(): Promise<string>
  json(): Promise<unknown>
  bytes(): Promise<Uint8Array>
  arrayBuffer(): Promise<ArrayBuffer>
  stream(): ReadableStream<Uint8Array>
}

export interface FilesystemProvider {
  /** API Bun.file(path) — archivo como handle lazy. */
  file(path: string, type?: string): PlatformFile

  readFile(path: string): Promise<Uint8Array>
  readFile(path: string, encoding: "utf8"): Promise<string>
  readFileSync(path: string): Uint8Array
  readFileSync(path: string, encoding: "utf8"): string

  writeFile(path: string, data: string | Uint8Array, options?: { mode?: number; flag?: string }): Promise<void>
  writeFileSync(path: string, data: string | Uint8Array, options?: { mode?: number; flag?: string }): void

  appendFile(path: string, data: string | Uint8Array): Promise<void>

  exists(path: string): boolean
  stat(path: string): Promise<FileStat>
  statSync(path: string): FileStat
  lstat(path: string): Promise<FileStat>
  lstatSync(path: string): FileStat
  realpath(path: string): Promise<string>
  realpathSync(path: string): string
  access(path: string, mode?: number): Promise<void>

  mkdir(path: string, options?: { recursive?: boolean; mode?: number }): Promise<void>
  mkdirSync(path: string, options?: { recursive?: boolean; mode?: number }): void
  readdir(path: string): Promise<Dirent[]>
  readdirSync(path: string): Dirent[]

  rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>
  rename(from: string, to: string): Promise<void>
  copyFile(from: string, to: string): Promise<void>
  chmod(path: string, mode: number): Promise<void>
  chown(path: string, uid: number, gid: number): Promise<void>

  /** Apertura exclusiva con flag; usado por la extraccion atomica de opencode-pty ("wx", 0700). */
  open(path: string, flags: string, mode?: number): Promise<{
    writeFile(data: Uint8Array): Promise<void>
    sync(): Promise<void>
    close(): Promise<void>
  }>

  watch(path: string, options: WatchOptions, listener: (event: string, filename: string | null) => void): Watcher
}
