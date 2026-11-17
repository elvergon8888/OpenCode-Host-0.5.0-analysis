/**
 * CreafMotorCode — PlatformProvider / ProcessProvider
 *
 * EVIDENCIA:
 *   - `node:child_process`: 14 contactos lexicos en 8 modulos.
 *       chunk-w7kwxfqb.js  -> @effect/platform-node ChildProcess (namespace + execFile + taskkill win32)
 *       chunk-thb6qhb7.js  -> Effect runtime, spawn con detached/windowsHide/stdio/env
 *       chunk-4z9vkptb.js  -> spawn del binario nativo `opencode-pty` (extraccion + checksum sha256)
 *       chunk-w59fntk1.js  -> exec para `credential_process` (helpers de credenciales git)
 *       chunk-09yx2ges.js  -> spawn (auth / MCP)
 *       chunk-0hfmf8xt.js  -> spawn (integracion Zed)
 *       chunk-xahy38ty.js  -> execFile/execFileSync SOLO macOS/Windows (deteccion de navegador)
 *       chunk-2nw5waa2.js  -> execFile/execFileSync/spawn (libreria node tipo execa)
 *   - `node:process`     : 7 contactos (stdin/stdout/cwd/platform/env)
 *
 * MEDIDA EN EL APK VIVO: "spawning process command=git args=[...]" — el spawn SI funciona
 * dentro del sandbox de la aplicacion.
 *
 * RESTRICCION ANDROID 10+:
 *   - Una app no puede iniciar procesos en segundo plano fuera de su propio sandbox.
 *   - `execve` de binarios de /system esta limitado; Termux es una app aparte y su
 *     binario NO es ejecutable desde el sandbox de OpenCode-Host sin un permiso explicito.
 *   - `detached` + grupos de procesos (`process.kill(-pid)`) requieren capacidades que
 *     Android restringe; el motor ya lo contempla (`or(e,t)` -> process.kill(-pid,0)).
 */

export type ProcessStdio = "pipe" | "ignore" | "inherit" | "overlapped"

export interface ProcessStdioOption {
  readonly type: "input" | "output" | "error" | "additional"
  readonly stream?: unknown
  readonly fd?: number
}

export interface SpawnOptions {
  readonly cwd?: string
  readonly env?: Record<string, string | undefined>
  readonly argv0?: string
  readonly stdio?: ReadonlyArray<ProcessStdio | ProcessStdioOption | "pipe" | "ignore" | "inherit">
  readonly shell?: boolean | string
  readonly detached?: boolean
  readonly windowsHide?: boolean
  readonly windowsVerbatimArguments?: boolean
  readonly uid?: number
  readonly gid?: number
  readonly timeout?: number
  readonly killSignal?: string
  readonly signal?: AbortSignal
}

export interface ChildProcess {
  readonly pid: number | undefined
  readonly stdin: WritableStreamLike | null
  readonly stdout: ReadableStreamLike | null
  readonly stderr: ReadableStreamLike | null
  readonly exitCode: number | null
  readonly signalCode: string | null
  readonly killed: boolean
  kill(signal?: string): boolean
  on(event: "exit", listener: (code: number | null, signal: string | null) => void): void
  on(event: "error", listener: (error: Error) => void): void
  on(event: "close", listener: (code: number | null, signal: string | null) => void): void
  once(event: "exit", listener: (code: number | null, signal: string | null) => void): void
  once(event: "close", listener: (code: number | null, signal: string | null) => void): void
  removeListener(event: string, listener: (...args: never[]) => void): void
  /** Espera a la salida; resuelve con el codigo. */
  exited(): Promise<number>
}

export interface WritableStreamLike {
  write(chunk: string | Uint8Array): boolean
  end(chunk?: string | Uint8Array): void
  on(event: string, listener: (...args: never[]) => void): void
}

export interface ReadableStreamLike {
  on(event: "data", listener: (chunk: Uint8Array | string) => void): void
  on(event: "end", listener: () => void): void
  on(event: "error", listener: (error: Error) => void): void
  removeListener(event: string, listener: (...args: never[]) => void): void
  [Symbol.asyncIterator](): AsyncIterator<Uint8Array | string>
}

export interface ExecResult {
  readonly stdout: string
  readonly stderr: string
  readonly code: number
  readonly signal: string | null
}

export interface ProcessProvider {
  /** node:child_process.spawn */
  spawn(command: string, args?: readonly string[], options?: SpawnOptions): ChildProcess
  /** node:child_process.exec (shell) */
  exec(command: string, options?: SpawnOptions): Promise<ExecResult>
  /** node:child_process.execFile */
  execFile(file: string, args?: readonly string[], options?: SpawnOptions): Promise<ExecResult>
  /** node:child_process.execFileSync */
  execFileSync(file: string, args?: readonly string[], options?: SpawnOptions): ExecResult

  /**
   * Envio de senales a un grupo de procesos (`kill(-pid, signal)`).
   * En Android el soporte de grupos de procesos puede estar restringido.
   */
  killGroup(pid: number, signal?: string): void

  /** true si el host puede crear grupos de procesos y senalizarlos. */
  readonly supportsProcessGroups: boolean
  /** true si el host puede lanzar procesos en segundo plano (detached). */
  readonly supportsDetached: boolean
  /** Directorios donde el host puede ejecutar binarios (PATH efectivo). */
  executableSearchPath(): readonly string[]
}
