/**
 * ============================================================================
 * CreafMotorCode — PlatformProvider (contrato agregado propuesto)
 * ============================================================================
 *
 * OBJETIVO
 *   Desacoplar la LOGICA de OpenCode 2.2.5 del RUNTIME y del SISTEMA OPERATIVO
 *   que la hospeda, sin degradar ninguna capacidad del motor.
 *
 * PRINCIPIO (requisito no negociable)
 *   "OpenCode debe conservar sus capacidades originales.
 *    Android debe adaptarse al motor, no el motor degradarse para adaptarse a Android."
 *
 *   => Este contrato NO es una capa de "fallback" ni de "best effort".
 *      Es un FRONTER: el motor declara QUE necesita; el host decide COMO lo da.
 *      Cuando el host no puede dar una capacidad, lo DECLARA (capabilities),
 *      y el motor elige una RUTA EQUIVALENTE ya prevista por el propio OpenCode.
 *      Nunca se simula una capacidad que no existe.
 *
 * EVIDENCIA DE ORIGEN (todo en este fichero tiene respaldo en el corpus)
 *   - 493 chunks, 364 MB, grafo de 10.318 aristas, 0 imports sin resolver.
 *   - 565 puntos de contacto lexicos verificados sobre 34 APIs de plataforma
 *     (motor/platform/api-audit.json; tokenizador con estados: se descartan
 *      coincidencias dentro de comentarios/strings/templates).
 *   - Runtime real medido: libopencode.so es BUN para Android (no node-mobile).
 *   - Motor real medido: opencode.log -> version=2.2.5, 59 migraciones de BD
 *     aplicadas, spawn de git operativo, MCP conectado.
 *
 * ALCANCE
 *   Este fichero es DISEÑO. No modifica ningun chunk, ni el APK, ni las .so.
 *   La instrumentacion (como se conecta el motor a este contrato) se describe en
 *   motor/platform/migration-strategy.md y se ejecutara solo con autorizacion.
 *
 * ---------------------------------------------------------------------------
 * ARQUITECTURA DE PROVEEDORES (9 interfaces -> 9 responsabilidades)
 * ---------------------------------------------------------------------------
 *   FilesystemProvider ....... E/S de ficheros y watchers
 *   DatabaseProvider ......... SQLite (sesiones, mensajes, credenciales, migraciones)
 *   ProcessProvider .......... procesos hijo (git, shell, helpers)
 *   PtyProvider .............. terminales (2 backends ya existentes en el motor)
 *   WorkerProvider ........... hilos/procesos de trabajo aislado
 *   EnvironmentProvider ...... identidad, rutas base, variables, plataforma
 *   NetworkProvider .......... HTTP/Sockets/TLS
 *   CredentialProvider ....... credenciales de proveedor y OAuth
 *   RuntimeProvider .......... crypto, buffer, path, url, util, async_hooks, intents
 *
 *   Nota de agrupacion: NO se crean proveedores mas pequenos que estos.
 *   Se agrupan por COHERENCIA DE CAPACIDAD y por el seam REAL que ya existe
 *   en el motor (p.ej. `SqliteNative` es un Service Effect del propio OpenCode:
 *   ver chunk-s95j0csq.js). Un proveedor por cada API de Node seria ruido:
 *   34 providers para 565 contactos, sin seam real que los respalde.
 *
 * ---------------------------------------------------------------------------
 * NEGOCIACION DE CAPACIDADES
 * ---------------------------------------------------------------------------
 *   El motor NO debe hardcodear "si platform==='android' entonces...". Debe
 *   preguntar al Platform. Asi, cuando el host improves (p.ej. se compila
 *   ripgrep para arm64-android), el motor lo usa sin cambiar de codigo.
 * ============================================================================
 */

import type { DatabaseProvider } from "./contracts/database.js"
import type { CredentialProvider } from "./contracts/credential.js"
import type { EnvironmentProvider, PlatformIdentity } from "./contracts/environment.js"
import type { FilesystemProvider } from "./contracts/filesystem.js"
import type { NetworkProvider } from "./contracts/network.js"
import type { ProcessProvider } from "./contracts/process.js"
import type { PtyBackend, PtyProvider } from "./contracts/pty.js"
import type { RuntimeProvider } from "./contracts/runtime.js"
import type { WorkerBackend, WorkerProvider } from "./contracts/worker.js"

/**
 * Capacidades declaradas por el host. El motor las consulta ANTES de elegir
 * una ruta de ejecucion. Ningun valor puede ser "true" si el host no puede
 * cumplirlo de verdad (ver equivalence-tests.md).
 */
export interface PlatformCapabilities {
  // --- Datos ---------------------------------------------------------------
  /** SQLite nativo disponible (no emulado). */
  readonly nativeSqlite: boolean
  /** db.serialize() disponible. */
  readonly sqliteSerialize: boolean
  /** db.loadExtension() disponible. */
  readonly sqliteLoadExtension: boolean
  /** Modo `strict` de Bun disponible. */
  readonly sqliteStrictMode: boolean

  // --- Nativo --------------------------------------------------------------
  /** bun:ffi / dlopen disponible. */
  readonly nativeFfi: boolean
  /** Watcher nativo de Bun disponible. */
  readonly nativeWatcher: boolean
  /** Watch recursivo de directorios disponible. */
  readonly recursiveWatch: boolean

  // --- Procesos ------------------------------------------------------------
  /** Puede lanzar procesos hijo. */
  readonly processSpawn: boolean
  /** Puede crear grupos de procesos y senalizarlos (kill(-pid)). */
  readonly processGroups: boolean
  /** Puede lanzar procesos detached. */
  readonly detachedProcesses: boolean

  // --- Terminales ----------------------------------------------------------
  /** Backends de PTY disponibles. */
  readonly pty: PtyBackend
  /** PTY puede redimensionarse (TIOCSWINSZ). */
  readonly ptyResize: boolean

  // --- Workers -------------------------------------------------------------
  /** Backends de worker disponibles. */
  readonly worker: WorkerBackend
  /** El worker ejecuta en paralelo real (hilo o proceso), no en un fiber. */
  readonly workerParallelism: boolean

  // --- Almacenamiento ------------------------------------------------------
  /** Almacenamiento privado de la app (/data/data/<pkg>/files). */
  readonly privateStorage: boolean
  /** Almacenamiento compartido (SAF / MediaStore) accesible para escritura. */
  readonly sharedStorage: boolean

  // --- Sistema -------------------------------------------------------------
  /** Rutas POSIX (no Windows). */
  readonly posixPaths: boolean
  /** Enlaces simbolicos soportados. */
  readonly symlinks: boolean
  /** Senales POSIX disponibles. */
  readonly unixSignals: boolean
  /** Nombres de fichero sensibles a mayusculas/minusculas. */
  readonly caseSensitivePaths: boolean
}

/**
 * Contrato agregado. Un unico objeto describe TODA la superficie de plataforma
 * que el motor necesita. Se pasa al motor como un servicio (en el caso de
 * OpenCode, como un `Effect.Service` / `Context.Tag`).
 */
export interface Platform {
  readonly identity: PlatformIdentity
  readonly capabilities: PlatformCapabilities

  readonly fs: FilesystemProvider
  readonly db: DatabaseProvider
  readonly proc: ProcessProvider
  readonly pty: PtyProvider
  readonly worker: WorkerProvider
  readonly env: EnvironmentProvider
  readonly net: NetworkProvider
  readonly cred: CredentialProvider
  readonly runtime: RuntimeProvider
}

/**
 * Verificacion de cobertura: el motor debe poder consultar el Platform
 * sin depender del host. Esta funcion es parte del contrato para que un
 * host incompleto falle AL ARRANQUE y no a mitad de una sesion.
 */
export function assertPlatformComplete(platform: Platform): void {
  const missing: string[] = []
  const check = (name: string, value: unknown): void => {
    if (value === undefined || value === null) missing.push(name)
  }
  check("identity", platform.identity)
  check("capabilities", platform.capabilities)
  check("fs", platform.fs)
  check("db", platform.db)
  check("proc", platform.proc)
  check("pty", platform.pty)
  check("worker", platform.worker)
  check("env", platform.env)
  check("net", platform.net)
  check("cred", platform.cred)
  check("runtime", platform.runtime)
  if (missing.length > 0) {
    throw new Error(`Platform incompleto: faltan ${missing.join(", ")}`)
  }
}

/**
 * Seleccion de backend de PTY segun capacidades.
 * El motor ya tiene DOS implementaciones de PTY (FFI y proceso-helper);
 * esta funcion es la unica fuente de verdad de cual usar.
 */
export function selectPtyBackend(platform: Platform): Exclude<PtyBackend, "none"> | null {
  switch (platform.capabilities.pty) {
    case "both":
      return "ffi"
    case "ffi":
      return "ffi"
    case "helper":
      return "helper"
    default:
      return null
  }
}

/**
 * Seleccion de backend de worker segun capacidades.
 * IMPORTANTE: "thread" y "process" son paralelos reales. Un fiber de Effect
 * NO es un worker y nunca se devuelve como tal.
 */
export function selectWorkerBackend(platform: Platform): Exclude<WorkerBackend, "none"> | null {
  switch (platform.capabilities.worker) {
    case "thread":
      return "thread"
    case "process":
      return "process"
    default:
      return null
  }
}

export type {
  DatabaseProvider,
  CredentialProvider,
  EnvironmentProvider,
  FilesystemProvider,
  NetworkProvider,
  PlatformIdentity,
  ProcessProvider,
  PtyBackend,
  PtyProvider,
  RuntimeProvider,
  WorkerBackend,
  WorkerProvider,
}
