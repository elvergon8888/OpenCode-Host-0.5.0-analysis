/**
 * CreafMotorCode — PlatformProvider / WorkerProvider
 *
 * EVIDENCIA:
 *   - `node:worker_threads`: 3 contactos lexicos reales.
 *       chunk-yq5qw44s.js @1110203 -> dentro de un BLOB BINARIO (worker embebido):
 *           "import { parentPort } from "node:worker_threads"" + puente
 *           globalThis.postMessage / __opentuiWorkerMessageBridge
 *           => asset de worker (OpenTUI / parser.worker) embebido en el bundle.
 *       chunk-z4ny5a8k.js @131    -> modulo ES de worker real:
 *           import{parentPort as s}from"worker_threads"; var e=s;
 *           e.load().then(... e.on("message", ...) ; e.postMessage({_tag:"Done", ...}))
 *       chunk-23n3wbjy.js @2420   -> import DINAMICO:
 *           let{Worker:u}=await import("worker_threads");
 *           r=new u(s ?? new URL("./photon-worker.js",import.meta.url))
 *           r.terminate(); r.once("message"|"error"|"exit")
 *
 * PRECEDENTE DEL PROPIO MOTOR (no una suposicion):
 *   Image.Photon (chunk-23n3wbjy.js) YA tiene dos modos:
 *     1) `spawnWorker` -> Worker real, con timeout de 10 s y WorkerUnavailableError.
 *     2) `makeWith`      -> si el worker no esta disponible, usa `c ??= y.load()`
 *                            (carga la libreria EN PROCESO) y aplica el mismo limite.
 *   Es decir: el motor YA degrade de forma deliberada y EXPLiCITA el worker de Photon
 *   cuando `worker_threads` no existe. Ese patron es el precedente para el diseno.
 *
 * PROHIBICION EXPRESA (requisito de la fase): NO se puede asumir que un "fiber" de
 * Effect sea funcionalmente equivalente a un worker de Node. Un fiber:
 *   - comparte el mismo isolate y el mismo event loop (no hay paralelismo real),
 *   - no puede ejecutar CPU-bound de forma bloqueante sin congelar el loop,
 *   - no tiene `postMessage`/`terminate`/`ref`/`unref`,
 *   - no puede cargar codigo en un contexto de V8 separado,
 *   - muere con el proceso padre.
 * Por eso el contrato NO ofrece "fibers como workers": ofrece workers reales
 * (hilo) y, si no hay hilo, un backend de PROCESO con protocolo de mensajes.
 */

export type WorkerBackend = "none" | "thread" | "process"

export interface WorkerMessageEvent {
  readonly data: unknown
}

export interface WorkerOptions {
  /** Datos iniciales (equivalente a workerData). */
  readonly workerData?: unknown
  /** Variables de entorno del worker. */
  readonly env?: Record<string, string | undefined>
  /** URL o ruta del script del worker. */
  readonly script?: string | URL
  /** Reescritura del prefijo de import.meta. */
  readonly execArgv?: readonly string[]
}

export interface Worker {
  readonly threadId: number
  readonly pid: number | undefined
  postMessage(value: unknown, transfer?: readonly unknown[]): void
  terminate(): Promise<number>
  ref(): void
  unref(): void
  on(event: "message", listener: (value: unknown) => void): void
  on(event: "messageerror", listener: (error: Error) => void): void
  on(event: "error", listener: (error: Error) => void): void
  on(event: "exit", listener: (code: number) => void): void
  once(event: "message", listener: (value: unknown) => void): void
  once(event: "exit", listener: (code: number) => void): void
  removeListener(event: string, listener: (...args: never[]) => void): void
}

export interface WorkerProvider {
  /**
   * Crea un worker.
   * @param backend forzar "thread" | "process". Si se omite, se elige segun
   *                `capabilities.worker` y disponibilidad real; si no hay ninguna,
   *                se lanza `WorkerUnavailableError` COMO EL MOTOR YA HACE con Photon.
   */
  spawn(script: string | URL, options?: WorkerOptions & { readonly backend?: Exclude<WorkerBackend, "none"> }): Worker

  /** Backends efectivamente disponibles. */
  readonly backends: WorkerBackend

  /** true si el worker puede ejecutarse en paralelo real (hilo o proceso). */
  readonly supportsParallelism: boolean
  /** true si el worker puede cargar codigo en un contexto JS aislado. */
  readonly supportsIsolatedContext: boolean
}
