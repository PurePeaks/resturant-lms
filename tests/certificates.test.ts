import { describe, expect, it } from "vitest";
import {
  addMonths,
  certificateStatus,
  formatVerificationCode,
  generateVerificationCode,
  normalizeVerificationCode,
} from "@/lib/training";


describe("verification codes", () => {
  it("are 16 uppercase hex characters and unique", () => {
    const codes = new Set(Array.from({ length: 1000 }, generateVerificationCode));
    expect(codes.size).toBe(1000);
    for (const c of codes) expect(c).toMatch(/^[0-9A-F]{16}$/);
  });

  it("round-trip through formatting and loose typing", () => {
    const code = "5F32A364A87941B9";
    expect(formatVerificationCode(code)).toBe("5F32-A364-A879-41B9");
    expect(normalizeVerificationCode(" 5f32-a364 a879-41b9 ")).toBe(code);
  });

  it("drop characters that could widen a database match", () => {
    expect(normalizeVerificationCode("%_/*")).toBe("");
  });
});

describe("certificateStatus", () => {
  const now = new Date("2026-06-01T00:00:00Z");

  it("is valid with no expiry", () => {
    expect(certificateStatus({ revokedAt: null, expiresAt: null }, now)).toBe("valid");
  });

  it("is expired after the expiry date", () => {
    expect(certificateStatus({ revokedAt: null, expiresAt: new Date("2026-05-31T00:00:00Z") }, now)).toBe("expired");
  });

  it("is revoked regardless of expiry", () => {
    expect(certificateStatus({ revokedAt: now, expiresAt: null }, now)).toBe("revoked");
  });
});

describe("addMonths", () => {
  it("adds calendar months", () => {
    expect(addMonths(new Date("2026-01-15T00:00:00Z"), 12).toISOString()).toBe("2027-01-15T00:00:00.000Z");
  });
});
