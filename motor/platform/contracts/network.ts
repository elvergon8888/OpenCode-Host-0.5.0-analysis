/**
 * CreafMotorCode — PlatformProvider / NetworkProvider
 *
 * EVIDENCIA:
 *   - `node:http`    : 4 contactos (3 dinámicos) — chunk-0vp63x7m.js usa createServer,
 *                      chunk-0yqrnm6m.js usa http.request, chunk-p1y4s2mr.js usa Agent/request.
 *   - `node:https`   : 3 contactos — mismo modulo (p1y4s2mr) para TLS y agentes.
 *   - `node:net`     : 6 contactos — sockets (Effect platform-node NodeSocket), TTY de PTY,
 *                      conexion del navegador, isIPv4/isIPv6.
 *   - `node:stream`  : 12 contactos, `node:stream/promises` 3, `node:zlib` 2 (brotli, zstd).
 *   - `node:events`  : 6 contactos (EventEmitter).
 *
 * MEDIDO EN EL APK VIVO:
 *   - El servidor OpenCode escucha en 127.0.0.1:4096 y responde (HTTP 200).
 *   - MCP remoto (http://127.0.0.1:8765/mcp) conectado: "mcp connected server=android tools=31".
 *   - Salida HTTPS a Internet operativa (catalogo de modelos, providers).
 *
 * CONCLUSION: la red NO necesita re-arm en Android. El proveedor existe para:
 *   (a) dejar explicito el limite de red del motor,
 *   (b) poder inyectar un agente HTTP nativo (OkHttp) si en el futuro el
 *       almacenamiento de certificados del sistema lo exige,
 *   (c) exponer la lista de autoridades de confianza (diferencia real entre
 *       Bun y Android: el almacen de CA del sistema no es el del Node por defecto).
 */

export interface HttpRequestOptions {
  readonly method?: string
  readonly hostname?: string
  readonly host?: string
  readonly port?: number | string
  readonly path?: string
  readonly headers?: Readonly<Record<string, string | string[]>>
  readonly body?: string | Uint8Array
  readonly timeout?: number
  readonly agent?: unknown
  readonly signal?: AbortSignal
}

export interface HttpResponse {
  readonly status: number
  readonly statusText: string
  readonly headers: Readonly<Record<string, string | string[]>>
  text(): Promise<string>
  json(): Promise<unknown>
  arrayBuffer(): Promise<ArrayBuffer>
  body(): ReadableStreamLike
}

export interface ReadableStreamLike {
  on(event: "data", listener: (chunk: Uint8Array) => void): void
  on(event: "end", listener: () => void): void
  on(event: "error", listener: (error: Error) => void): void
  [Symbol.asyncIterator](): AsyncIterator<Uint8Array>
}

export interface NetworkProvider {
  request(url: string, options?: HttpRequestOptions): Promise<HttpResponse>
  /** Servidor HTTP local (el servidor OpenCode). */
  serve(handler: (request: HttpRequestLike) => Promise<HttpResponse> | HttpResponse): NetworkServer
  /** Escucha en un socket local (unix socket en POSIX). */
  listen(endpoint: { readonly port?: number; readonly host?: string; readonly path?: string }): NetworkServer
  /** Conecta a un socket remoto. */
  connect(endpoint: { readonly port: number; readonly host: string }): Promise<NetworkSocket>

  /**
   * Autoridades de confianza del host.
   * En Android el almacen relevante es el del sistema (Network Security Config),
   * no el de Node/Bun. Permite que el motor lo documente y lo exponga.
   */
  trustStore(): { readonly kind: "system" | "bundled" | "custom"; readonly sources: readonly string[] }
}

export interface HttpRequestLike {
  readonly method: string
  readonly url: string
  readonly headers: Readonly<Record<string, string | string[]>>
  text(): Promise<string>
}

export interface NetworkServer {
  address(): { readonly port: number; readonly host?: string; readonly path?: string }
  close(): Promise<void>
}

export interface NetworkSocket {
  write(data: string | Uint8Array): void
  end(): void
  on(event: "data", listener: (chunk: Uint8Array) => void): void
  on(event: "close", listener: () => void): void
  on(event: "error", listener: (error: Error) => void): void
}
