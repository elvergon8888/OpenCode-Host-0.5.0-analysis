/**
 * CreafMotorCode — PlatformProvider / EnvironmentProvider
 *
 * EVIDENCIA (motor OpenCode 2.2.5 embebido en OpenCode-Host-0.5.0-7):
 *   - `node:os`     : 67 contactos lexicos en 50 modulos (audit: motor/platform/api-audit.json)
 *                      simbolos observados: homedir, tmpdir, hostname, release, platform, arch, EOL
 *   - `node:process`:  7 contactos en 3 modulos -> stdin, stdout, stderr, cwd, env, platform, arch, pid, exitCode
 *   - `Bun.env`     :  2 contactos (solo en dependencias drizzle/bun; no es camino critico)
 *   - `XDG_*`       : chunk-dpsr58v2.js (chunk_0191_161918564.js, rdeps=68) — modulo @opencode/core/Global
 *
 * RESPONSABILIDAD: resolver el "entorno" (home, rutas XDG, variables, plataforma, arquitectura).
 * NO resuelve permisos de sandbox: eso es FilesystemProvider.
 */

export type PlatformKind = "bun" | "node" | "android-bun" | "android-native" | "custom"

export interface PlatformIdentity {
  /** Identificador estable del proveedor, p.ej. "creaf:android-native". */
  readonly id: string
  /** Runtime anfitrion real. */
  readonly kind: PlatformKind
  /** os.platform() equivalente. */
  readonly platform: string
  /** os.arch() equivalente. */
  readonly arch: string
  /** Version del runtime anfitrion (Bun.version / process.versions.node). */
  readonly runtimeVersion: string
  /** Version de OpenCode que el host declara soportar. */
  readonly engineVersion?: string
}

/** Rutas base resueltas por el motor. Refleja exactamente @opencode/core/Global (chunk-dpsr58v2.js). */
export interface PlatformPaths {
  /** process.env.OPENCODE_TEST_HOME ?? os.homedir() */
  readonly home: string
  /** $XDG_DATA_HOME/opencode  |  ~/.local/share/opencode */
  readonly data: string
  /** $XDG_CACHE_HOME/opencode |  ~/.cache/opencode */
  readonly cache: string
  /** $XDG_CONFIG_HOME/opencode | ~/.config/opencode */
  readonly config: string
  /** $XDG_STATE_HOME/opencode | ~/.local/state/opencode */
  readonly state: string
  /** os.tmpdir()/opencode */
  readonly tmp: string
  /** <cache>/bin */
  readonly bin: string
  /** <data>/log */
  readonly log: string
  /** <data>/repos */
  readonly repos: string
}

export interface EnvironmentProvider {
  readonly identity: PlatformIdentity

  /**
   * Rutas base del motor.
   * Equivalente exacto de `Global.Path` (chunk-dpsr58v2.js).
   * Permite sobreescribir `config` via OPENCODE_CONFIG_DIR y `tmp` por el host.
   */
  paths(overrides?: Partial<PlatformPaths>): PlatformPaths

  /** Copia del entorno de proceso (process.env). */
  env(): Readonly<Record<string, string | undefined>>

  /** Lectura puntual de una variable. */
  get(name: string): string | undefined

  /** Homedir real del usuario/app. */
  homedir(): string

  /** Directorio temporal del sistema. */
  tmpdir(): string

  /** Nombre del host. */
  hostname(): string

  /** Version del kernel / release del SO. */
  release(): string

  /** Fin de linea por defecto (EOL). */
  eol: string

  /** Directorio de trabajo actual del proceso. */
  cwd(): string

  /** PID del proceso actual. */
  pid(): number
}
