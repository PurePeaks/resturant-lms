import { S3Client } from "@aws-sdk/client-s3";

export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/ogg"];
export const ALLOWED_VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".avi", ".ogg"];
export const MAX_VIDEO_BYTES = 500 * 1024 * 1024;

export interface R2Config {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
}

/** Cloudflare R2 settings from the environment, or null when not fully configured. */
export function getR2Config(): R2Config | null {
  let endpoint = process.env.R2_ENDPOINT?.trim();
  if (endpoint && !endpoint.startsWith("http")) endpoint = `https://${endpoint}`;
  endpoint = endpoint?.replace(/\/+$/, "");

  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET_NAME?.trim();
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) return null;

  const publicBaseUrl = (process.env.R2_PUBLIC_URL?.trim() || `${endpoint}/${bucket}`).replace(/\/+$/, "");
  return { endpoint, accessKeyId, secretAccessKey, bucket, publicBaseUrl };
}

export function r2Client(config: R2Config): S3Client {
  // Cloudflare R2 requires forcePathStyle: true
  return new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
}

/** Local disk storage is a development convenience only: production servers
 *  don't serve files added to public/ after the build. */
export function localStorageAllowed(): boolean {
  return process.env.NODE_ENV !== "production";
}
