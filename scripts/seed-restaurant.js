const bcrypt = require("bcryptjs");
const { pool } = require("./db");

async function main() {
  console.log("Seeding restaurant into Neon database...");

  // 1. Create or ensure Restaurant Tenant
  const tenantId = "tenant-grand-bistro";
  const tenantName = "The Grand Bistro";

  await pool.query(
    `INSERT INTO "Tenant" (id, name, "createdAt")
     VALUES ($1, $2, NOW())
     ON CONFLICT (id) DO UPDATE SET name = $2`,
    [tenantId, tenantName]
  );
  console.log(`Restaurant tenant ready: "${tenantName}" (${tenantId})`);

  // 2. Passwords: SEED_PASSWORD, or the demo defaults. Only applied to accounts created by this run.
  const managerPassword = process.env.SEED_PASSWORD || "manager123";
  const staffPassword = process.env.SEED_PASSWORD || "staff123";
  const managerHash = await bcrypt.hash(managerPassword, 12);
  const staffHash = await bcrypt.hash(staffPassword, 12);

  // 3. Manager
  const managerEmail = "marcus.vance@grandbistro.com";
  const managerResult = await pool.query(
    `INSERT INTO "User" (id, email, "passwordHash", name, role, "tenantId", "createdAt")
     VALUES (gen_random_uuid(), $1, $2, $3, 'MANAGER', $4, NOW())
     ON CONFLICT (email) DO UPDATE 
     SET name = $3, "tenantId" = $4, role = 'MANAGER'
     RETURNING id, name, email, role`,
    [managerEmail, managerHash, "Chef Marcus Vance", tenantId]
  );
  console.log(`General Manager: ${managerResult.rows[0].name} (${managerResult.rows[0].email})`);

  // 4. Staff members
  const staffMembers = [
    {
      name: "Elena Rostova",
      email: "elena.rostova@grandbistro.com",
    },
    {
      name: "Liam Chen",
      email: "liam.chen@grandbistro.com",
    },
    {
      name: "Maya Patel",
      email: "maya.patel@grandbistro.com",
    },
  ];

  const createdStaff = [];
  for (const s of staffMembers) {
    const res = await pool.query(
      `INSERT INTO "User" (id, email, "passwordHash", name, role, "tenantId", "createdAt")
       VALUES (gen_random_uuid(), $1, $2, $3, 'STAFF', $4, NOW())
       ON CONFLICT (email) DO UPDATE 
       SET name = $3, "tenantId" = $4, role = 'STAFF'
       RETURNING id, name, email, role`,
      [s.email, staffHash, s.name, tenantId]
    );
    createdStaff.push(res.rows[0]);
    console.log(`Staff Member: ${res.rows[0].name} (${res.rows[0].email})`);
  }

  // 5. Training Modules
  const moduleId1 = "module-hospitality-standards";
  await pool.query(
    `INSERT INTO "Module" (id, "tenantId", title, description, "videoUrl", "orderIndex", "createdAt", "publishedAt")
     VALUES ($1, $2, $3, $4, $5, 1, NOW(), NOW())
     ON CONFLICT (id) DO UPDATE 
     SET title = $3, description = $4, "videoUrl" = $5, "tenantId" = $2`,
    [
      moduleId1,
      tenantId,
      "Hospitality & Guest Experience Standards",
      "Premier service etiquette, allergy dispatch, high-volume dining coordination, and VIP protocol.",
      "/videos/module1-safety-protocols.mp4",
    ]
  );

  const moduleId2 = "module-wine-sommelier";
  await pool.query(
    `INSERT INTO "Module" (id, "tenantId", title, description, "videoUrl", "orderIndex", "createdAt", "publishedAt")
     VALUES ($1, $2, $3, $4, $5, 2, NOW(), NOW())
     ON CONFLICT (id) DO UPDATE 
     SET title = $3, description = $4, "videoUrl" = $5, "tenantId" = $2`,
    [
      moduleId2,
      tenantId,
      "Wine Pairing & Sommelier Foundations",
      "Essential grape varietals, table decanting, glassware selection, and pairing chemistry.",
      "/videos/module1-safety-protocols.mp4",
    ]
  );
  console.log(`Modules created: 2 curriculums provisioned for ${tenantName}`);

  // 6. Questions for Module 1
  await pool.query(`DELETE FROM "Question" WHERE "moduleId" = $1`, [moduleId1]);
  const questionsM1 = [
    {
      text: "What is the standard response time to greet guests once they are seated?",
      options: JSON.stringify(["Within 60-90 seconds", "Within 5 minutes", "After the kitchen signals readiness", "When they signal the host"]),
      answer: 0,
    },
    {
      text: "How should severe dietary allergies be communicated to the kitchen expeditor?",
      options: JSON.stringify([
        "Verbal mention during busy rush",
        "Flagged in the POS with allergen alert and verbal confirmation with expeditor",
        "Handwritten note on a beverage coaster",
        "No alert needed if menu item seems safe",
      ]),
      answer: 1,
    },
    {
      text: "When clearing completed courses, what is the proper dining room protocol?",
      options: JSON.stringify([
        "Clear from the guest's right side using the right hand",
        "Stack plates across the diner from the left",
        "Instruct guests to hand their plates forward",
        "Clear only when the entire dining room finishes",
      ]),
      answer: 0,
    },
  ];

  for (const q of questionsM1) {
    await pool.query(
      `INSERT INTO "Question" (id, "moduleId", "questionText", options, "correctAnswer")
       VALUES (gen_random_uuid(), $1, $2, $3::json, $4)`,
      [moduleId1, q.text, q.options, q.answer]
    );
  }

  // 7. Questions for Module 2
  await pool.query(`DELETE FROM "Question" WHERE "moduleId" = $1`, [moduleId2]);
  const questionsM2 = [
    {
      text: "Which wine varietal traditionally best balances a marbled, high-fat prime ribeye?",
      options: JSON.stringify([
        "Light Sweet Moscato",
        "Full-bodied, high-tannin Cabernet Sauvignon",
        "Unoaked Pinot Grigio",
        "Extra Dry Prosecco",
      ]),
      answer: 1,
    },
    {
      text: "At what angle should champagne bottles be uncorked to maintain control and prevent loss?",
      options: JSON.stringify([
        "45-degree angle pointing safely away from guests",
        "Directly perpendicular upwards",
        "Horizontal pointing at table center",
        "Inverted downward",
      ]),
      answer: 0,
    },
  ];

  for (const q of questionsM2) {
    await pool.query(
      `INSERT INTO "Question" (id, "moduleId", "questionText", options, "correctAnswer")
       VALUES (gen_random_uuid(), $1, $2, $3::json, $4)`,
      [moduleId2, q.text, q.options, q.answer]
    );
  }

  // 8. Add sample completion data for Elena Rostova so she has real certificate & progress
  const elena = createdStaff[0];
  if (elena) {
    // Watch Progress completed
    await pool.query(
      `INSERT INTO "WatchProgress" (id, "userId", "moduleId", "watchedSeconds", "maxWatchedSeconds", "durationSeconds", completed, "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, 600, 600, 600, true, NOW())
       ON CONFLICT ("userId", "moduleId") DO UPDATE 
       SET completed = true, "watchedSeconds" = 600, "maxWatchedSeconds" = 600, "durationSeconds" = 600, "updatedAt" = NOW()`,
      [elena.id, moduleId1]
    );

    // Quiz Attempt passed
    await pool.query(
      `INSERT INTO "QuizAttempt" (id, "userId", "moduleId", score, passed, "createdAt")
       VALUES (gen_random_uuid(), $1, $2, 100, true, NOW())`,
      [elena.id, moduleId1]
    );

    // Certificate issued
    await pool.query(
      `INSERT INTO "Certificate" (id, "userId", "moduleId", "pdfUrl", "issuedAt", "expiresAt", "score")
       VALUES (
         'CERT-GRANDBISTRO-001',
         $1,
         $2,
         '/certificates/CERT-GRANDBISTRO-001',
         NOW(),
         NOW() + INTERVAL '1 year',
         100
       )
       ON CONFLICT (id) DO NOTHING`,
      [elena.id, moduleId1]
    );
    console.log(`Issued Certificate "CERT-GRANDBISTRO-001" to ${elena.name}`);
  }

  // Summary
  console.log("\n========================================================");
  console.log(" Restaurant Seeding Successful!");
  console.log("========================================================");
  console.log(` Venue Name   : ${tenantName} (ID: ${tenantId})`);
  console.log(` Manager      : ${managerEmail}`);
  console.log(` Staff        : elena.rostova@ [Certified], liam.chen@, maya.patel@grandbistro.com`);
  console.log(` Passwords    : manager ${managerPassword}, staff ${staffPassword} (new accounts only)`);
  console.log(` Modules      : 2 Curriculums provisioned`);
  console.log(` Certificate  : CERT-GRANDBISTRO-001`);
  console.log("========================================================\n");

  await pool.end();
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
