import { NextResponse } from "next/server";
import { HeadBucketCommand } from "@aws-sdk/client-s3";
import { api } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { getR2Config, localStorageAllowed, r2Client } from "@/lib/storage";

// GET /api/admin/storage-status — super admin only
export const GET = api(async () => {
  await requireUser({ roles: ["SUPER_ADMIN"] });

  const r2 = getR2Config();
  if (!r2) {
    return NextResponse.json({
      configured: false,
      connected: false,
      provider: localStorageAllowed() ? "Local Disk Storage (development only)" : "Not configured",
      message: "Cloudflare R2 credentials are not fully defined.",
    });
  }

  try {
    await r2Client(r2).send(new HeadBucketCommand({ Bucket: r2.bucket }));
    return NextResponse.json({
      configured: true,
      connected: true,
      provider: "Cloudflare R2",
      bucket: r2.bucket,
      publicUrl: r2.publicBaseUrl,
      message: "Connected to Cloudflare R2 storage bucket",
    });
  } catch (err) {
    console.error("[storage-status] R2 check failed:", err);
    return NextResponse.json({
      configured: true,
      connected: false,
      provider: "Cloudflare R2",
      bucket: r2.bucket,
      message: "Could not reach the R2 bucket. Check the credentials and bucket name.",
    });
  }
});
