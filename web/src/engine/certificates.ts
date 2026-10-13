// Internal certificates. The ID is a SHA-256 fingerprint of the learner's name, the route,
// the issue date and the completion record of every mission in the route. Verification
// recomputes it from the progress stored in this app; it proves internal consistency,
// not identity, and it is not an official accreditation.
import type { WorldId } from "../content/types";
import type { Content } from "./derive";
import type { SaveState } from "./state";

export function certificatePayload(s: SaveState, content: Content, world: WorldId): string | null {
  const cert = s.certificates[world];
  if (!cert) return null;
  const missions = certificateMissions(s, content, world)
    .map((id) => `${id}@${s.missions[id]?.done ?? "-"}`)
    .join(",");
  return ["python-quest", "v1", cert.name, world, cert.issuedAt, missions].join("|");
}

/** Missions the certificate covers: those of the route when it was issued (older saves: the current route). */
export function certificateMissions(s: SaveState, content: Content, world: WorldId): string[] {
  const stored = s.certificates[world]?.missions;
  return stored ?? content.missions.filter((m) => m.world === world).map((m) => m.id);
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Human-friendly ID: PQ-XXXX-XXXX-XXXX (first 48 bits of the hash). */
export async function certificateId(s: SaveState, content: Content, world: WorldId): Promise<string | null> {
  const payload = certificatePayload(s, content, world);
  if (!payload) return null;
  const hex = (await sha256Hex(payload)).slice(0, 12).toUpperCase();
  return `PQ-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
}

export async function verifyCertificate(s: SaveState, content: Content, id: string): Promise<WorldId | null> {
  const wanted = id.trim().toUpperCase();
  for (const w of Object.keys(s.certificates) as WorldId[]) {
    if ((await certificateId(s, content, w)) === wanted) return w;
  }
  return null;
}
