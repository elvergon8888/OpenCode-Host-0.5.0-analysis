/**
 * CreafMotorCode — indice de contratos de plataforma.
 * Cada contrato tiene su fichero propio con la evidencia que lo justifica.
 */
export type { DatabaseProvider, SqliteDatabase, SqliteOpenOptions, SqliteStatement, SqliteValue } from "./database.js"
export type { CredentialProvider, CredentialRecord, CredentialStore, OAuthToken } from "./credential.js"
export type { EnvironmentProvider, PlatformIdentity, PlatformKind, PlatformPaths } from "./environment.js"
export type { Dirent, FileStat, FilesystemProvider, PlatformFile, WatchOptions, Watcher } from "./filesystem.js"
export type { HttpRequestLike, HttpRequestOptions, HttpResponse, NetworkProvider, NetworkServer, NetworkSocket } from "./network.js"
export type { ChildProcess, ExecResult, ProcessProvider, ProcessStdio, ProcessStdioOption, SpawnOptions } from "./process.js"
export type { Pty, PtyBackend, PtyOptions, PtyProvider } from "./pty.js"
export type { RuntimeIdentity, RuntimeProvider } from "./runtime.js"
export type { Worker, WorkerBackend, WorkerMessageEvent, WorkerOptions, WorkerProvider } from "./worker.js"
