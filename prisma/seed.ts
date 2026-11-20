import "dotenv/config";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

// Development data only. Refuses to run in production unless ALLOW_SEED=true.
// Accounts get SEED_PASSWORD if set, otherwise the demo passwords the login
// page fills in during development (admin123 / manager123 / staff123).
if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED !== "true") {
  console.error("Refusing to seed: NODE_ENV is production. Set ALLOW_SEED=true if you really mean it.");
  process.exit(1);
}

const created: { email: string; password: string }[] = [];

/** Creates the user if missing. Existing accounts are left untouched. */
const DEMO_PASSWORDS: Record<Role, string> = {
  SUPER_ADMIN: "admin123",
  MANAGER: "manager123",
  STAFF: "staff123",
};

async function ensureUser(data: { email: string; name: string; role: Role; tenantId: string | null }) {
  const existing = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
  if (existing) return;
  const password = process.env.SEED_PASSWORD || DEMO_PASSWORDS[data.role];
  await prisma.user.create({ data: { ...data, passwordHash: await bcrypt.hash(password, 12) } });
  created.push({ email: data.email, password });
}

async function main() {
  console.log("Seeding database...");

  // 1. Create Super Admin (no tenant)
  await ensureUser({ email: "info@pure-peaks.com", name: "Super Admin", role: Role.SUPER_ADMIN, tenantId: null });

  // 2. Create Tenant: Restaurant A
  const tenantA = await prisma.tenant.upsert({
    where: { id: "tenant-a" },
    update: { name: "Restaurant A" },
    create: { id: "tenant-a", name: "Restaurant A" },
  });

  // 3. Manager for Restaurant A
  await ensureUser({ email: "manager@restaurant-a.com", name: "Alex Manager", role: Role.MANAGER, tenantId: tenantA.id });

  // 4. Staff members
  for (const [email, name] of [
    ["john.doe@restaurant-a.com", "John Doe"],
    ["jane.smith@restaurant-a.com", "Jane Smith"],
  ]) {
    await ensureUser({ email, name, role: Role.STAFF, tenantId: tenantA.id });
  }

  // 5. Module: Food Safety Protocols (tenant A)
  const module1 = await prisma.module.upsert({
    where: { id: "module-food-safety" },
    update: {},
    create: {
      id: "module-food-safety",
      tenantId: tenantA.id,
      title: "Food Safety Protocols",
      description: "Essential food handling, temperature control, and hygiene standards every team member must know.",
      videoUrl: "/videos/module1-safety-protocols.mp4",
      orderIndex: 1,
      publishedAt: new Date(),
    },
  });

  // 6. Quiz questions for module 1
  const questionsData = [
    {
      questionText: "What is the minimum safe internal temperature for cooked poultry?",
      options: ["145°F (63°C)", "155°F (68°C)", "165°F (74°C)", "175°F (79°C)"],
      correctAnswer: 2,
    },
    {
      questionText: "How often should food handlers change gloves when working continuously?",
      options: ["Every 2 hours", "Every 4 hours", "Every 6 hours", "Only when visibly soiled"],
      correctAnswer: 1,
    },
    {
      questionText: "Which of the following is NOT a correct handwashing procedure?",
      options: [
        "Scrub hands for at least 20 seconds",
        "Use warm water and soap",
        "Rinse hands with cold water only",
        "Dry hands with a clean paper towel",
      ],
      correctAnswer: 2,
    },
  ];

  // Delete existing questions for clean re-seed
  await prisma.question.deleteMany({ where: { moduleId: module1.id } });
  await prisma.question.createMany({
    data: questionsData.map((q) => ({ ...q, moduleId: module1.id })),
  });

  console.log("Seed complete. New accounts (existing accounts were left unchanged):");
  for (const { email, password } of created) console.log(`  ${email}  ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
