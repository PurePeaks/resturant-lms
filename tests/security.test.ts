import { describe, expect, it } from "vitest";
import { safeRedirect } from "@/lib/redirect";
import { poolConfig } from "@/lib/prisma";
import { emailSchema, passwordSchema, questionSchema, videoUrlSchema } from "@/lib/validation";
import { retentionCutoff } from "@/lib/retention";
import { generateTemporaryPassword } from "@/lib/passwords";

describe("safeRedirect", () => {
  const base = "https://app.example.com";

  it("keeps same-origin paths and URLs", () => {
    expect(safeRedirect("/dashboard", base)).toBe("https://app.example.com/dashboard");
    expect(safeRedirect("https://app.example.com/x", base)).toBe("https://app.example.com/x");
  });

  it("blocks protocol-relative and look-alike hosts", () => {
    expect(safeRedirect("//evil.com", base)).toBe(base);
    expect(safeRedirect("/\\evil.com", base)).toBe(base);
    expect(safeRedirect("https://app.example.com.evil.com/x", base)).toBe(base);
    expect(safeRedirect("javascript:alert(1)", base)).toBe(base);
  });
});

describe("database TLS", () => {
  it("verifies certificates even when the URL says sslmode=require", () => {
    const cfg = poolConfig("postgresql://u:p@db.neon.tech/x?sslmode=require");
    expect(cfg.ssl).toEqual({ rejectUnauthorized: true });
    expect(cfg.connectionString).not.toContain("sslmode");
  });

  it("connects to local databases without TLS", () => {
    expect(poolConfig("postgres://u:p@localhost:5432/x").ssl).toBe(false);
  });
});

describe("validation", () => {
  it("lowercases and trims emails", () => {
    expect(emailSchema.parse("  Mixed.Case@Example.COM ")).toBe("mixed.case@example.com");
  });

  it("requires 12+ character passwords", () => {
    expect(passwordSchema.safeParse("short-pass1").success).toBe(false);
    expect(passwordSchema.safeParse("long enough pass").success).toBe(true);
  });

  it("rejects quizzes whose correct answer is not one of the options", () => {
    expect(questionSchema.safeParse({ questionText: "Q", options: ["a", "b"], correctAnswer: 2 }).success).toBe(false);
    expect(questionSchema.safeParse({ questionText: "Q", options: ["a", "b"], correctAnswer: 1 }).success).toBe(true);
  });

  it("only accepts https or local video paths", () => {
    expect(videoUrlSchema.safeParse("javascript:alert(1)").success).toBe(false);
    expect(videoUrlSchema.safeParse("/videos/../../etc/passwd").success).toBe(false);
    expect(videoUrlSchema.safeParse("https://media.example.com/a.mp4").success).toBe(true);
    expect(videoUrlSchema.safeParse("/videos/training-1.mp4").success).toBe(true);
  });
});

describe("generated passwords", () => {
  it("meet the password policy", () => {
    for (let i = 0; i < 50; i++) expect(passwordSchema.safeParse(generateTemporaryPassword()).success).toBe(true);
  });
});

describe("retention", () => {
  it("anonymizes records deactivated more than three years ago", () => {
    expect(retentionCutoff(new Date("2026-11-19T00:00:00Z")).toISOString()).toBe("2023-11-19T00:00:00.000Z");
  });
});
