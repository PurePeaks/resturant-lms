import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api, parseBody } from "@/lib/api";
import { emailSchema } from "@/lib/validation";
import { enforceRateLimit } from "@/lib/rateLimit";
import { requestIp } from "@/lib/request";
import { isEmailConfigured, sendEmail } from "@/lib/email";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v || null);

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: emailSchema,
  phone: optionalText(40),
  purpose: optionalText(120),
  kitType: optionalText(120),
  city: optionalText(120),
  notes: optionalText(2000),
  // Hidden field humans never fill in; bots usually do.
  website: z.string().max(500).optional(),
});

function referenceCode(): string {
  return `HIM-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

// POST /api/inquiries — public "reserve a kit" form
export const POST = api(async (req: NextRequest) => {
  await enforceRateLimit(`inquiry:ip:${requestIp(req)}`, 5, 60 * 60);
  const body = await parseBody(req, schema);
  const code = referenceCode();
  const kitType = body.kitType ?? "The Master Searing Set";

  if (!body.website) {
    await prisma.inquiry.create({
      data: {
        referenceCode: code,
        name: body.name,
        email: body.email,
        phone: body.phone,
        purpose: body.purpose,
        kitType,
        city: body.city,
        notes: body.notes,
      },
    });

    // Contact details stay in the database; the log only gets the reference.
    console.info(`[inquiry] received ${code}`);

    const notify = process.env.INQUIRY_NOTIFY_EMAIL;
    if (notify && isEmailConfigured()) {
      await sendEmail({
        to: notify,
        subject: `New kit reservation ${code}`,
        text: `${body.name} (${body.email}${body.phone ? `, ${body.phone}` : ""}) reserved ${kitType}${body.city ? ` in ${body.city}` : ""}.\n\n${body.notes ?? ""}`,
      });
    }
  }

  return NextResponse.json({
    success: true,
    referenceCode: code,
    name: body.name,
    email: body.email,
    phone: body.phone,
    kitType,
    purpose: body.purpose,
    city: body.city,
    notes: body.notes,
    message: "Your Himalayan salt slab allocation has been registered successfully.",
    createdAt: new Date().toISOString(),
  });
});
