// Offline play: registers the service worker (production builds only) and reports what it keeps.
// See sw/service-worker.js for the caching rules.

let registrationError: string | null = null;

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((e: unknown) => {
      registrationError = e instanceof Error ? e.message : String(e);
      console.warn("No se pudo activar el modo sin conexión:", e);
    });
  });
}

export interface OfflineStatus {
  /** Why offline play is unavailable, if it is. */
  unavailable: string | null;
  active: boolean;
  appFiles: number;
  pythonFiles: number;
  /** Bytes this site uses in the browser (all storage), when the browser reports it. */
  usage: number | null;
}

export async function offlineStatus(): Promise<OfflineStatus> {
  const none = { active: false, appFiles: 0, pythonFiles: 0, usage: null };
  if (!("serviceWorker" in navigator) || !("caches" in window)) return { ...none, unavailable: "este navegador no admite service workers" };
  if (!import.meta.env.PROD) return { ...none, unavailable: "solo se activa en la versión publicada, no en modo desarrollo" };
  if (registrationError) return { ...none, unavailable: registrationError };
  const reg = await navigator.serviceWorker.getRegistration();
  let appFiles = 0;
  let pythonFiles = 0;
  for (const key of await caches.keys()) {
    if (!key.startsWith("pq-")) continue;
    const n = (await (await caches.open(key)).keys()).length;
    if (key.startsWith("pq-pyodide-")) pythonFiles += n;
    else appFiles += n;
  }
  const est = navigator.storage?.estimate ? await navigator.storage.estimate() : null;
  return { unavailable: null, active: Boolean(reg?.active), appFiles, pythonFiles, usage: est?.usage ?? null };
}

/** Deletes the stored copies; the service worker stores files again as they are used. */
export async function clearOfflineData(): Promise<number> {
  let n = 0;
  for (const key of await caches.keys()) if (key.startsWith("pq-") && (await caches.delete(key))) n++;
  return n;
}
