import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import { api, parseBody } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { ALLOWED_VIDEO_TYPES, MAX_VIDEO_BYTES, getR2Config, r2Client } from "@/lib/storage";

const schema = z.object({
  filename: z.string().trim().min(1).max(200),
  contentType: z
    .string()
    .transform((v) => v.toLowerCase())
    .refine((v) => ALLOWED_VIDEO_TYPES.includes(v), "Invalid video format. Use MP4, WebM or MOV."),
  size: z.number().int().positive().max(MAX_VIDEO_BYTES, "File exceeds the 500MB upload limit.").optional(),
});

// POST /api/manager/upload-url — presigned R2 upload URL (super admin only)
export const POST = api(async (req: NextRequest) => {
  const user = await requireUser({ roles: ["SUPER_ADMIN"] });

  const r2 = getR2Config();
  if (!r2) {
    return NextResponse.json({ configured: false, message: "Cloudflare R2 storage not configured." });
  }

  const { filename, contentType } = await parseBody(req, schema);

  const tenantFolder = user.tenantId || "admin";
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = `${tenantFolder}/videos/${Date.now()}-${sanitizedFilename}`;

  const presignedUrl = await getSignedUrl(
    r2Client(r2),
    new PutObjectCommand({ Bucket: r2.bucket, Key: key, ContentType: contentType }),
    { expiresIn: 15 * 60 }
  );

  return NextResponse.json({
    configured: true,
    presignedUrl,
    publicUrl: `${r2.publicBaseUrl}/${key}`,
    key,
    provider: "Cloudflare R2",
  });
});
