import { NextRequest, NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";

/** An error that is safe to show to the client. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public extra?: Record<string, unknown>
  ) {
    super(message);
  }
}

/**
 * Wraps a route handler so that ApiErrors become JSON responses and anything
 * unexpected is logged server-side and returned as a generic 500. Internal
 * error messages (database, storage SDK) never reach the browser.
 */
export function api<C>(handler: (req: NextRequest, ctx: C) => Promise<Response>) {
  return async (req: NextRequest, ctx: C): Promise<Response> => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      // Next.js signals (e.g. "stop prerendering, this route reads the request") must pass through.
      unstable_rethrow(err);
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message, ...err.extra }, { status: err.status });
      }
      console.error(`[api] ${req.method} ${req.nextUrl.pathname} failed:`, err);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}

/** Parses and validates a JSON body, throwing a 400 with the first problem found. */
export async function parseBody<T extends z.ZodType>(req: NextRequest, schema: T): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError(400, "Invalid JSON body");
  }
  return parseWith(schema, raw);
}

export function parseWith<T extends z.ZodType>(schema: T, raw: unknown): z.infer<T> {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue.path.length ? `${issue.path.join(".")}: ` : "";
    throw new ApiError(400, `${field}${issue.message}`);
  }
  return result.data;
}
