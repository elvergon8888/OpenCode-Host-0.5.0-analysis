/**
 * CreafMotorCode — PlatformProvider / DatabaseProvider
 *
 * EVIDENCIA — superficie EXACTA de `bun:sqlite` usada por OpenCode 2.2.5.
 * (Extraida leyendo los 3 modulos con contactos lexicos reales; audit: api-audit.json)
 *
 *   chunk-s95j0csq.js @28200   -> `import{Database as Jn}from"bun:sqlite"`
 *        @opencode/core/database/SqliteBun  (Servicio Effect `SqliteNative`)
 *        - new Database(filename, { readonly, readwrite, create })
 *        - db.query(sql) -> statement ; statement.all(...), statement.values(...), statement.safeIntegers(bool)
 *        - db.run("PRAGMA journal_mode = ...")
 *        - db.serialize()        -> Buffer (export de la base)
 *        - db.loadExtension(path)
 *        - db.close()            (via Effect.addFinalizer)
 *
 *   chunk-9f4f8etn.js @161677  -> import dinamico `import("bun:sqlite")`
 *        @opencode/core/server — MIGRACION V1 -> V2 de la base (lectura de sesiones/mensajes)
 *        - new Database(path, { readonly: true, strict: true })
 *        - db.query("SELECT COUNT(*) ... FROM session").get()?.value
 *        - db.run("BEGIN") / db.run("ROLLBACK") ; db.inTransaction
 *        - lectura de tablas `project`, `session` y mensajes
 *
 *   chunk-0hfmf8xt.js @378    -> `import{Database as m}from"bun:sqlite"`
 *        Integracion opcional con el editor Zed: lee su BD en modo SOLO LECTURA.
 *
 * MEDIDA EN EL APK VIVO (opencode.log):
 *   "database schema bootstrap started" migrations=59
 *   "database schema bootstrap completed" migrations=59 durationMs=33
 *   y existen opencode.db + opencode.db-wal + opencode.db-shm en el sandbox.
 *   => bun:sqlite FUNCIONA en Android en el runtime actual (Bun sobre bionic).
 *
 * RESTRICCION DE DISENO: el motor ya define el seam `SqliteNative` (Effect Service).
 * Este contrato NO cambia ese seam: lo implementa. La implementacion Bun actual es
 * la referencia; una implementacion N-API (SQLite compilado con NDK) debe ser
 * OBSERVACIONALMENTE EQUIVALENTE (ver equivalence-tests.md).
 */

export type SqliteValue = string | number | bigint | boolean | null | Uint8Array

export interface SqliteStatement {
  /** Filas como objetos. Equivalente a `stmt.all(...)` de bun:sqlite. */
  all(...params: SqliteValue[]): Array<Record<string, SqliteValue>>
  /** Filas como arrays de valores. Equivalente a `stmt.values(...)`. */
  values(...params: SqliteValue[]): SqliteValue[][]
  /** Primera fila o undefined. Equivalente a `stmt.get(...)`. */
  get(...params: SqliteValue[]): Record<string, SqliteValue> | undefined
  /**
   * Fuerza aritmetica de 64 bits sin perdida.
   * bun:sqlite: `stmt.safeIntegers(true)`. node:sqlite: `stmt.setReadBigInts(true)`.
   */
  safeIntegers(enabled: boolean): SqliteStatement
  /** Libera el statement. */
  finalize(): void
}

export interface SqliteDatabase {
  /** Prepara y devuelve un statement. bun:sqlite: `db.query(sql)`. */
  query(sql: string): SqliteStatement
  /** Ejecuta SQL sin retornar filas. bun:sqlite: `db.run(sql, ...params)`. */
  run(sql: string, ...params: SqliteValue[]): void
  /** Ejecuta SQL con varios statements. */
  exec(sql: string): void
  /** Serializa la base completa a bytes. bun:sqlite: `db.serialize()`. */
  serialize(): Uint8Array
  /** Carga una extension SQLite. bun:sqlite: `db.loadExtension(path)`. */
  loadExtension(path: string): void
  /** true si hay una transaccion abierta. bun:sqlite: `db.inTransaction`. */
  readonly inTransaction: boolean
  /** Cierra la base. Idempotente. */
  close(): void
}

export interface SqliteOpenOptions {
  readonly readonly?: boolean
  readonly readwrite?: boolean
  readonly create?: boolean
  /**
   * Modo estricto de Bun (SQLITE_DBCONFIG_DQS_DDL/DML). Si la implementacion
   * subyacente no lo soporta, debe emularse con PRAGMA equivalentes y documentarse.
   */
  readonly strict?: boolean
}

export interface DatabaseProvider {
  /**
   * Abre una base SQLite.
   * @param path ruta del fichero, o ":memory:" para base en memoria.
   */
  open(path: string, options?: SqliteOpenOptions): SqliteDatabase

  /** true si el proveedor puede cargar extensiones SQLite. */
  readonly supportsLoadExtension: boolean
  /** true si el proveedor puede serializar la base a bytes. */
  readonly supportsSerialize: boolean
  /** true si el proveedor soporta el modo `strict` de Bun. */
  readonly supportsStrictMode: boolean
  /** true si las transacciones se comportan igual (BEGIN/COMMIT/ROLLBACK). */
  readonly supportsTransactions: boolean
}
