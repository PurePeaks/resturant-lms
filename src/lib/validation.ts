import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 12;

/** Trimmed, lowercased email. Every place that stores or looks up an email uses this. */
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address").max(254));

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// bcrypt only uses the first 72 bytes, so longer passwords would be misleading.
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(72, "Password must be at most 72 characters");

export const nameSchema = z.string().trim().min(1, "Name is required").max(120);

export const idSchema = z.string().trim().min(1).max(64);

export const roleSchema = z.enum(["SUPER_ADMIN", "MANAGER", "STAFF"]);

// Uploaded videos live in R2 (https) or, in development, under /videos/.
export const videoUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => /^https:\/\/[^\s]+$/i.test(v) || /^\/videos\/[A-Za-z0-9._-]+$/.test(v), {
    message: "Video URL must be an https:// link or a /videos/ path",
  });

export const questionSchema = z
  .object({
    questionText: z.string().trim().min(1, "Question text is required").max(500),
    options: z
      .array(z.string().trim().min(1, "Options cannot be empty").max(200))
      .min(2, "Each question needs at least 2 options")
      .max(6, "Each question can have at most 6 options"),
    correctAnswer: z.number().int().min(0),
  })
  .refine((q) => q.correctAnswer < q.options.length, {
    message: "Correct answer must be one of the options",
    path: ["correctAnswer"],
  });

const moduleFields = {
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2000).nullish(),
  videoUrl: videoUrlSchema,
  questions: z.array(questionSchema).max(50).optional(),
  published: z.boolean().optional(),
  validityMonths: z.number().int().min(1).max(120).nullable().optional(),
  durationSeconds: z.number().positive().max(6 * 60 * 60).optional(),
};

export const moduleCreateSchema = z.object({
  ...moduleFields,
  tenantId: z.union([z.literal("ALL"), idSchema]),
});

export const moduleUpdateSchema = z.object({
  title: moduleFields.title.optional(),
  description: moduleFields.description,
  videoUrl: moduleFields.videoUrl.optional(),
  questions: moduleFields.questions,
  published: moduleFields.published,
  validityMonths: moduleFields.validityMonths,
  durationSeconds: moduleFields.durationSeconds,
});
