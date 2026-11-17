/**
 * CreafMotorCode — PlatformProvider / CredentialProvider
 *
 * EVIDENCIA:
 *   - chunk-09yx2ges.js (chunk_0275_272410430.js, cat=auth, 45 exports) @~"auth.json":
 *       function Ph() {
 *         let e = os.homedir(), t = process.env.XDG_DATA_HOME;
 *         if (t) return path.join(t, "opencode", "auth.json");
 *         return path.join(e, ".local", "share", "opencode", "auth.json");
 *       }
 *       existsSync -> readFileSync(path,"utf-8") -> JSON.parse
 *       writeFileSync(path, JSON.stringify(c,null,2), { mode: 384 })   // 384 = 0600
 *       Cache en memoria (Map) de tokens OAuth con refresh:
 *         "gitlab": { type:"oauth", refresh, access, expires, enterpriseUrl }
 *   - chunk-w59fntk1.js (chunk_0068_108834508.js) @188:
 *       import{exec as m}from"child_process"
 *       "Profile {r} credential_process did not return Version 1"
 *       -> ejecucion de credential_process de git (helpers de credenciales).
 *   - chunk-44btap9q.js / chunk-37zemjkn.js: soporte de credential_process / git auth.
 *   - OAuth por proveedor (chunk-09yx2ges.js): intercambio de token, refresh, expiracion.
 *
 * MEDIDO EN EL APK VIVO:
 *   - El directorio de datos real es
 *     /data/user/0/app.opencodehost/files/home/.local/share/opencode/
 *     (XDG_DATA_HOME no definido -> homedir()/.local/share) -> coincide con Ph().
 *   - `.github-token` presente en el mismo directorio.
 *
 * RESTRICCION ANDROID:
 *   - El sandbox de la app es privado: las credenciales quedan en
 *     /data/data/<paquete>/files/home/.local/share/opencode/auth.json (modo 0600).
 *   - Si el usuario quiere credenciales en almacenamiento COMPARTIDO, hace falta
 *     SAF/MediaStore; el motor actual no lo soporta y el contrato lo declara
 *     explicitamente en capabilities.credentialSharedStorage = false.
 */

export interface CredentialRecord {
  readonly type: "api" | "oauth" | "wellknown" | "unknown"
  readonly key?: string
  readonly refresh?: string
  readonly access?: string
  readonly expires?: number
  readonly enterpriseUrl?: string
  readonly [extra: string]: unknown
}

export interface CredentialStore {
  /**
   * Ruta canonica del almacen.
   * Equivalente exacto de `Ph()`: $XDG_DATA_HOME/opencode/auth.json | ~/.local/share/opencode/auth.json
   */
  readonly path: string
  /** Lee todas las credenciales. Devuelve {} si no existe. */
  readAll(): Record<string, CredentialRecord>
  /** Lee una credencial por proveedor (con fallback a la variante con "/" final). */
  read(providerId: string): CredentialRecord | undefined
  /** Escribe el almacen completo con permisos 0600. */
  writeAll(records: Record<string, CredentialRecord>): void
  /** Elimina una credencial. */
  remove(providerId: string): void
}

export interface OAuthToken {
  readonly accessToken: string
  readonly refreshToken: string
  readonly expiresAt: number
  readonly instanceUrl?: string
}

export interface CredentialProvider {
  readonly store: CredentialStore

  /**
   * Ejecuta el `credential_process` configurado por git.
   * Devuelve el credencial o `undefined` si el helper no esta configurado.
   */
  runCredentialProcess(profile: string, cwd?: string): Promise<{ readonly username: string; readonly password: string } | undefined>

  /**
   * Intercambia/renueva tokens OAuth y los persiste.
   * @param exchange funcion que realiza el intercambio en la red (la aporta el motor).
   */
  refreshOAuth(
    providerId: string,
    exchange: (refreshToken: string) => Promise<OAuthToken>,
  ): Promise<string>

  /** true si el almacen esta en almacenamiento compartido (SAF/MediaStore). */
  readonly supportsSharedStorage: boolean
}
