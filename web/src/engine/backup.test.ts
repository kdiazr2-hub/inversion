import { describe, expect, it } from "vitest";
import { BACKUP_KEY, needsBackupReminder, readBackupInfo, recordBackup, snoozeReminder } from "./backup";
import { newSave, type SaveState } from "./state";

class MemoryStorage {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
}

const withDone = (n: number): SaveState => {
  const s = newSave(new Date("2026-10-01T00:00:00Z"));
  for (let i = 0; i < n; i++) s.missions[`m${i}`] = { done: "2026-10-02T00:00:00.000Z", hints: 0, sawSolution: false, attempts: 1, advancedDone: null };
  return s;
};

describe("backup reminder", () => {
  const now = new Date("2026-10-31T12:00:00Z");

  it("waits for progress worth keeping", () => {
    expect(needsBackupReminder(withDone(2), {}, now)).toBe(false);
    expect(needsBackupReminder(withDone(3), {}, now)).toBe(true);
  });

  it("is quiet for a week after a copy or a snooze", () => {
    const st = new MemoryStorage() as unknown as Storage;
    const s = withDone(5);
    recordBackup(new Date("2026-10-28T12:00:00Z"), st);
    expect(needsBackupReminder(s, readBackupInfo(st), now)).toBe(false);
    recordBackup(new Date("2026-10-20T12:00:00Z"), st);
    expect(needsBackupReminder(s, readBackupInfo(st), now)).toBe(true);
    snoozeReminder(now, st);
    expect(needsBackupReminder(s, readBackupInfo(st), new Date("2026-11-06T12:00:00Z"))).toBe(false);
    expect(needsBackupReminder(s, readBackupInfo(st), new Date("2026-11-08T12:00:00Z"))).toBe(true);
  });

  it("ignores damaged data", () => {
    const st = new MemoryStorage() as unknown as Storage;
    st.setItem(BACKUP_KEY, "{no es json");
    expect(readBackupInfo(st)).toEqual({});
  });
});
