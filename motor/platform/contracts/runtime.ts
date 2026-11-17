/**
 * CreafMotorCode — PlatformProvider / RuntimeProvider
 *
 * EVIDENCIA — APIs de runtime que el motor usa y que NO son E/S ni base de datos:
 *   - `node:crypto`        : 35 contactos (createHash, randomUUID, randomBytes,
 *                            createPrivateKey, createPublicKey, sign, verify)
 *                            -> hash SHA-256 de `opencode-pty`, generacion de IDs.
 *   - `node:buffer`        :  9 contactos (Buffer, isUtf8) — framing del protocolo PTY.
 *   - `node:util`          : 13 contactos (promisify, isDeepStrictEqual, stripVTControlCharacters,
 *                            StringDecoder, inspect, promisify(execFile))
 *   - `node:url`           : 27 contactos (fileURLToPath, pathToFileURL)
 *   - `node:path`          : 171 contactos (join, dirname, basename, resolve, isAbsolute, sep)
 *   - `node:module`        :  7 contactos (createRequire)
 *   - `node:async_hooks`   :  3 contactos (AsyncLocalStorage, AsyncResource)
 *   - `node:process`       :  7 contactos (platform, env, versions, execPath, argv)
 *   - `node:timers`        :  2 contactos (setTimeout de timers/promises)
 *   - `node:assert`        :  1 contacto (fall)
 *   - `node:perf_hooks`    :  1 contacto (monitorEventLoopDelay)
 *   - `node:inspector`     :  0 contactos lexicos (solo referencia textual)
 *   - `Bun.fileURLToPath` / `Bun.pathToFileURL`: usados por el modulo PTY (chunk-kb1j967y.js)
 *   - `Bun.serve` / `Bun.write` / `Bun.env`: solo en dependencias de desarrollo del bundle
 *                            (chunk-7gtsct90.js); NO son camino critico del motor.
 *   - `Bun.spawn`          : 1 contacto REAL y YA ANDROID-SPECIFICO:
 *       chunk-7gtsct90.js @3286419:
 *         Bun.spawn(["/system/bin/am","start","-a","android.intent.action.VIEW","-d",url])
 *
 * MEDIDO:
 *   - `libopencode.so` es BUN compilado para Android (no node-mobile puro):
 *       builtin://bun/ffi, builtin://bun/sqlite, builtin://internal/sql/sqlite,
 *       builtin://node/worker_threads, "node-v26.3.0", plataforma "android" en la
 *       lista de plataformas de Bun.
 *   - El motor corre nativamente: opencode.log -> version=2.2.5 channel=latest,
 *     role=cli, args=["serve","--hostname","127.0.0.1","--port","4096"].
 *
 * Este contrato existe para que el motor NO dependa de APIs que solo existen en Bun,
 * de modo que un futuro host Android nativo (no-Bun) pueda implementarlo.
 */

export interface RuntimeIdentity {
  /** "bun" | "node" | "jsc" | "v8" | ... */
  readonly engine: string
  readonly version: string
  /** process.versions.node equivalente (Bun reporta 26.x). */
  readonly nodeCompatVersion?: string
  /** process.versions.v8 si aplica. */
  readonly v8Version?: string
  /** process.execPath. */
  readonly execPath: string
  /** process.argv. */
  readonly argv: readonly string[]
}

export interface RuntimeProvider {
  readonly identity: RuntimeIdentity

  /** process.platform */
  readonly platform: string
  /** process.arch */
  readonly arch: string

  /** Convierte file:// a ruta del sistema. Bun.fileURLToPath / url.fileURLToPath. */
  fileURLToPath(url: string | URL): string
  /** Convierte una ruta a URL file://. Bun.pathToFileURL / url.pathToFileURL. */
  pathToFileURL(path: string): URL

  /** node:path */
  readonly path: {
    join(...parts: string[]): string
    resolve(...parts: string[]): string
    dirname(p: string): string
    basename(p: string, ext?: string): string
    extname(p: string): string
    isAbsolute(p: string): boolean
    relative(from: string, to: string): string
    normalize(p: string): string
    readonly sep: string
    readonly delimiter: string
  }

  /** node:crypto */
  readonly crypto: {
    sha256(data: Uint8Array | string): Uint8Array
    createHash(algorithm: string): {
      update(data: Uint8Array | string): { digest(): Uint8Array; digest(encoding: "hex"): string }
    }
    randomUUID(): string
    randomBytes(size: number): Uint8Array
  }

  /** node:buffer */
  readonly buffer: {
    from(data: string | Uint8Array, encoding?: string): Uint8Array
    concat(list: readonly Uint8Array[]): Uint8Array
    alloc(size: number): Uint8Array
    isUtf8(data: Uint8Array): boolean
  }

  /** node:util */
  readonly util: {
    promisify<A extends unknown[], R>(fn: (...args: A) => Promise<R>): (...args: A) => Promise<R>
    stripVTControlCharacters(text: string): string
    inspect(value: unknown, options?: Record<string, unknown>): string
    isDeepStrictEqual(a: unknown, b: unknown): boolean
  }

  /** node:module.createRequire */
  createRequire(path: string | URL): (specifier: string) => unknown

  /** node:async_hooks.AsyncLocalStorage */
  createAsyncLocalStorage<T>(): {
    run<R>(store: T, fn: () => R): R
    getStore(): T | undefined
    exit<R>(fn: () => R): R
  }

  /** Abre una URL con el gestor del sistema (intent en Android). */
  openExternal(url: string): Promise<void>
}
