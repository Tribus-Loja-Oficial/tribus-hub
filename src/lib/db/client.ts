/**
 * Legacy DB client intentionally disabled.
 *
 * The runtime data path was migrated to hub-api + D1.
 * Any remaining direct repository call must be migrated before use.
 */
function throwDbRemoved(): never {
  throw new Error("Direct DB client was removed. Use hub-api endpoints (Cloudflare Worker + D1).");
}

export const db: any = new Proxy(
  {},
  {
    get() {
      return throwDbRemoved();
    },
  },
) as any;

export type Database = any;
