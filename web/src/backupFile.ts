// Automatic copy of the progress to a file the learner chooses, with the File System Access API
// (Chromium-based desktop browsers). The file handle is kept in IndexedDB; writing needs the
// browser's permission, which it may ask for again in a new session (requires a click).

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: { description: string; accept: Record<string, string[]> }[];
}
type PermissionMode = { mode: "readwrite" };
interface WritableHandle extends FileSystemFileHandle {
  queryPermission?: (d: PermissionMode) => Promise<PermissionState>;
  requestPermission?: (d: PermissionMode) => Promise<PermissionState>;
}
declare global {
  interface Window {
    showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
  }
}

const DB = "python-quest-copia";
const STORE = "archivo";
const KEY = "copia";

export const autoBackupSupported = () => typeof window !== "undefined" && typeof window.showSaveFilePicker === "function" && typeof indexedDB !== "undefined";

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise<T>((resolve, reject) => {
    const req = run(d.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).finally(() => d.close());
}

export async function backupHandle(): Promise<WritableHandle | undefined> {
  if (!autoBackupSupported()) return undefined;
  try {
    return (await tx<WritableHandle | undefined>("readonly", (s) => s.get(KEY) as IDBRequest<WritableHandle | undefined>)) ?? undefined;
  } catch {
    return undefined;
  }
}

/** Opens the "save as" dialog (must run from a click) and remembers the chosen file. */
export async function chooseBackupFile(): Promise<WritableHandle> {
  const handle = (await window.showSaveFilePicker!({
    suggestedName: "python-quest-copia.json",
    types: [{ description: "Progreso de Python Quest", accept: { "application/json": [".json"] } }],
  })) as WritableHandle;
  await tx("readwrite", (s) => s.put(handle, KEY));
  return handle;
}

export async function forgetBackupFile(): Promise<void> {
  await tx("readwrite", (s) => s.delete(KEY));
}

export type BackupPermission = "granted" | "prompt" | "denied" | "none";

export async function backupPermission(ask = false): Promise<BackupPermission> {
  const handle = await backupHandle();
  if (!handle) return "none";
  const opts: PermissionMode = { mode: "readwrite" };
  try {
    const state = (await handle.queryPermission?.(opts)) ?? "granted";
    if (state !== "prompt" || !ask) return state;
    return (await handle.requestPermission?.(opts)) ?? "denied";
  } catch {
    return "denied";
  }
}

/** Writes the copy if a file was chosen and the browser allows writing now; returns whether it did. */
export async function writeBackupFile(json: string): Promise<boolean> {
  const handle = await backupHandle();
  if (!handle || (await backupPermission()) !== "granted") return false;
  try {
    const w = await handle.createWritable();
    await w.write(json);
    await w.close();
    return true;
  } catch {
    return false;
  }
}
