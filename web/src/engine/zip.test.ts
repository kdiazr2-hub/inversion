import { describe, expect, it } from "vitest";
import { crc32, dosDateTime, zip } from "./zip";

const u8 = (s: string) => new TextEncoder().encode(s);

describe("zip", () => {
  it("computes the standard CRC-32", () => {
    expect(crc32(u8("123456789"))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array())).toBe(0);
  });

  it("encodes MS-DOS dates", () => {
    const { time, date } = dosDateTime(new Date(2026, 9, 23, 14, 30, 41));
    expect(date).toBe(((2026 - 1980) << 9) | (10 << 5) | 23);
    expect(time).toBe((14 << 11) | (30 << 5) | 20);
  });

  it("writes stored entries with UTF-8 names and a central directory", () => {
    const out = zip([{ name: "año/datos.csv", data: "a,b\n1,2\n" }, { name: "año/vacío.txt", data: "" }], new Date(2026, 0, 1));
    const view = new DataView(out.buffer);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(view.getUint16(6, true)).toBe(0x0800);
    const end = out.length - 22;
    expect(view.getUint32(end, true)).toBe(0x06054b50);
    expect(view.getUint16(end + 10, true)).toBe(2);
    const cdOffset = view.getUint32(end + 16, true);
    expect(view.getUint32(cdOffset, true)).toBe(0x02014b50);
    expect(cdOffset + view.getUint32(end + 12, true)).toBe(end);
    const nameLen = view.getUint16(26, true);
    expect(new TextDecoder().decode(out.slice(30, 30 + nameLen))).toBe("año/datos.csv");
    expect(view.getUint32(14, true)).toBe(crc32(u8("a,b\n1,2\n")));
  });
});
