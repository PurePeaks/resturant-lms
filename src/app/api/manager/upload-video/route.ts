import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import path from "path";
import fs from "fs";
import { api, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/session";
import {
  ALLOWED_VIDEO_EXTENSIONS,
  ALLOWED_VIDEO_TYPES,
  MAX_VIDEO_BYTES,
  getR2Config,
  localStorageAllowed,
  r2Client,
} from "@/lib/storage";

// POST /api/manager/upload-video — server-side upload, used when the browser
// can't upload straight to R2. Without R2 it stores to public/videos, which
// only works in development.
export const POST = api(async (req: NextRequest) => {
  const user = await requireUser({ roles: ["SUPER_ADMIN"] });

  const r2 = getR2Config();
  if (!r2 && !localStorageAllowed()) {
    throw new ApiError(503, "Video storage isn't configured. Set the R2_* environment variables.");
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "No file provided");

  if (file.size > MAX_VIDEO_BYTES) {
    throw new ApiError(413, "File exceeds 500MB maximum upload limit.");
  }
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
    throw new ApiError(415, "Unsupported media type. Only MP4, WebM and MOV are supported.");
  }
  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_VIDEO_EXTENSIONS.includes(ext)) {
    throw new ApiError(400, "Invalid file extension. Use .mp4, .webm or .mov");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeBase = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeFilename = `${Date.now()}-${safeBase}${ext}`;

  if (r2) {
    const key = `${user.tenantId || "admin"}/videos/${safeFilename}`;
    await r2Client(r2).send(
      new PutObjectCommand({ Bucket: r2.bucket, Key: key, Body: buffer, ContentType: file.type })
    );
    return NextResponse.json({
      url: `${r2.publicBaseUrl}/${key}`,
      filename: safeFilename,
      key,
      storage: "cloudflare-r2",
    });
  }

  const uploadDir = path.join(process.cwd(), "public", "videos");
  await fs.promises.mkdir(uploadDir, { recursive: true });
  await fs.promises.writeFile(path.join(uploadDir, safeFilename), buffer);

  return NextResponse.json({ url: `/videos/${safeFilename}`, filename: safeFilename, storage: "local-dev" });
});
