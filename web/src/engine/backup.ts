/**
 * Keeping the guest progress safe: when the last copy was made, when to remind the learner, and
 * asking the browser not to evict the site's data. The reminder state lives in its own
 * localStorage key, outside the save, so restoring an old copy does not hide the reminder.
 */
import type { SaveState } from "./state";

export const BACKUP_KEY = "python-quest-copia";
/** Remind after this many days without a copy, once there is progress worth keeping. */
export const BACKUP_EVERY_DAYS = 7;
export const BACKUP_MIN_MISSIONS = 3;

export interface BackupInfo {
  /** Last time the progress was exported or written to the automatic copy. */
  at?: string;
  /** The reminder stays hidden until then. */
  snoozedUntil?: string;
}

const DAY = 86_400_000;

export function readBackupInfo(storage: Storage | undefined = globalThis.localStorage): BackupInfo {
  try {
    const raw = storage?.getItem(BACKUP_KEY);
    const v = raw ? (JSON.parse(raw) as BackupInfo) : {};
    return { at: typeof v.at === "string" ? v.at : undefined, snoozedUntil: typeof v.snoozedUntil === "string" ? v.snoozedUntil : undefined };
  } catch {
    return {};
  }
}

function write(info: BackupInfo, storage: Storage | undefined) {
  try {
    storage?.setItem(BACKUP_KEY, JSON.stringify(info));
  } catch {
    // Without storage there is nothing to remember; the reminder simply shows again.
  }
}

export function recordBackup(now = new Date(), storage: Storage | undefined = globalThis.localStorage): BackupInfo {
  const info = { at: now.toISOString() };
  write(info, storage);
  return info;
}

export function snoozeReminder(now = new Date(), storage: Storage | undefined = globalThis.localStorage): BackupInfo {
  const info = { ...readBackupInfo(storage), snoozedUntil: new Date(now.getTime() + BACKUP_EVERY_DAYS * DAY).toISOString() };
  write(info, storage);
  return info;
}

/** True when there are at least a few completed missions and no recent copy (nor a snooze). */
export function needsBackupReminder(state: SaveState, info: BackupInfo, now = new Date()): boolean {
  const done = Object.values(state.missions).filter((m) => m.done).length;
  if (done < BACKUP_MIN_MISSIONS) return false;
  if (info.snoozedUntil && Date.parse(info.snoozedUntil) > now.getTime()) return false;
  return !info.at || now.getTime() - Date.parse(info.at) > BACKUP_EVERY_DAYS * DAY;
}

/** Whether the browser already promised not to evict the site's storage (undefined: unknown). */
export async function storagePersisted(): Promise<boolean | undefined> {
  try {
    return (await navigator.storage?.persisted?.()) ?? undefined;
  } catch {
    return undefined;
  }
}

/** Asks the browser to keep the site's storage under pressure; returns whether it agreed. */
export async function requestPersistence(): Promise<boolean | undefined> {
  try {
    return (await navigator.storage?.persist?.()) ?? undefined;
  } catch {
    return undefined;
  }
}
