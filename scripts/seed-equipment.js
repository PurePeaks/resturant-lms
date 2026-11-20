const { pool } = require("./db");

async function main() {
  console.log("Seeding Salt Slab Cooking Plates, Metal Rings, and Serving Plates...");

  // Seed for tenant-grand-bistro
  const grandBistroItems = [
    {
      id: "eq-gb-cook-01",
      name: "Himalayan Pink Salt Cooking Slab #01 (Station A)",
      type: "COOKING_PLATE",
      cooksCount: 6,
      maxCooks: 40,
      quantity: 1,
      status: "ACTIVE",
      notes: "Slight bevel on edges. Excellent thermal retention. Regular oiling protocol active.",
    },
    {
      id: "eq-gb-cook-02",
      name: "Himalayan Pink Salt Cooking Slab #02 (Station A)",
      type: "COOKING_PLATE",
      cooksCount: 14,
      maxCooks: 40,
      quantity: 1,
      status: "ACTIVE",
      notes: "Clean smooth surface. Used for prime ribeye steaks.",
    },
    {
      id: "eq-gb-cook-03",
      name: "Himalayan Pink Salt Cooking Slab #03 (Station B)",
      type: "COOKING_PLATE",
      cooksCount: 28,
      maxCooks: 40,
      quantity: 1,
      status: "ACTIVE",
      notes: "Minor surface micro-fissure from high sear. Inspected and cleared for continued service.",
    },
    {
      id: "eq-gb-cook-04",
      name: "Himalayan Pink Salt Cooking Slab #04 (Station B)",
      type: "COOKING_PLATE",
      cooksCount: 38,
      maxCooks: 40,
      quantity: 1,
      status: "ACTIVE",
      notes: "High wear warning. Thickness under 1.2 inches. Scheduled for retirement in 2 cooks.",
    },
    {
      id: "eq-gb-cook-05",
      name: "Himalayan Pink Salt Cooking Slab #05 (Reserve)",
      type: "COOKING_PLATE",
      cooksCount: 40,
      maxCooks: 40,
      quantity: 1,
      status: "RETIRED",
      notes: "Lifespan depleted (40 cooks reached). Slated for cold grinding into coarse finishing salt.",
    },
    {
      id: "eq-gb-ring-01",
      name: "Cast Iron Heat Dispersal Rings (Standard 8x8)",
      type: "METAL_RING",
      cooksCount: 0,
      maxCooks: 40,
      quantity: 8,
      status: "ACTIVE",
      notes: "Direct burner protection rings. Flawless condition.",
    },
    {
      id: "eq-gb-ring-02",
      name: "Stainless Steel Table Trivet Service Rings",
      type: "METAL_RING",
      cooksCount: 0,
      maxCooks: 40,
      quantity: 6,
      status: "ACTIVE",
      notes: "Table-side searing presentation rings with heat insulation legs.",
    },
    {
      id: "eq-gb-serve-01",
      name: "Chilled Himalayan Salt Steak Presentation Slabs",
      type: "SERVING_PLATE",
      cooksCount: 0,
      maxCooks: 40,
      quantity: 14,
      status: "ACTIVE",
      notes: "Chilled in walk-in for beef carpaccio and carved tomahawk presentation.",
    },
    {
      id: "eq-gb-serve-02",
      name: "Carved Salt Block Appetizer Platters",
      type: "SERVING_PLATE",
      cooksCount: 0,
      maxCooks: 40,
      quantity: 10,
      status: "ACTIVE",
      notes: "Charcuterie and cured seafood presentation boards.",
    },
  ];

  for (const item of grandBistroItems) {
    await pool.query(
      `INSERT INTO "EquipmentItem" (id, "tenantId", name, type, "cooksCount", "maxCooks", quantity, status, notes, "createdAt", "updatedAt")
       VALUES ($1, 'tenant-grand-bistro', $2, $3::"EquipmentType", $4, $5, $6, $7::"EquipmentStatus", $8, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE 
       SET name = $2, type = $3::"EquipmentType", "cooksCount" = $4, "maxCooks" = $5, quantity = $6, status = $7::"EquipmentStatus", notes = $8, "updatedAt" = NOW()`,
      [item.id, item.name, item.type, item.cooksCount, item.maxCooks, item.quantity, item.status, item.notes]
    );
  }

  // Seed for tenant-a (Restaurant A)
  const tenantAItems = [
    {
      id: "eq-ra-cook-01",
      name: "Salt Cooking Slab Alpha-1",
      type: "COOKING_PLATE",
      cooksCount: 11,
      maxCooks: 40,
      quantity: 1,
      status: "ACTIVE",
      notes: "Line 1 primary cooking slab.",
    },
    {
      id: "eq-ra-cook-02",
      name: "Salt Cooking Slab Alpha-2",
      type: "COOKING_PLATE",
      cooksCount: 24,
      maxCooks: 40,
      quantity: 1,
      status: "ACTIVE",
      notes: "Mid-lifespan slab. Regularly seasoned.",
    },
    {
      id: "eq-ra-cook-03",
      name: "Salt Cooking Slab Alpha-3",
      type: "COOKING_PLATE",
      cooksCount: 39,
      maxCooks: 40,
      quantity: 1,
      status: "ACTIVE",
      notes: "Near 40 cooks limit. Check for micro-cracks before searing.",
    },
    {
      id: "eq-ra-ring-01",
      name: "Base Station Metal Support Rings",
      type: "METAL_RING",
      cooksCount: 0,
      maxCooks: 40,
      quantity: 6,
      status: "ACTIVE",
      notes: "Kitchen burner ring fixtures.",
    },
    {
      id: "eq-ra-serve-01",
      name: "Himalayan Cured Steak Serving Platters",
      type: "SERVING_PLATE",
      cooksCount: 0,
      maxCooks: 40,
      quantity: 12,
      status: "ACTIVE",
      notes: "Serving trays for tabletop steak carving.",
    },
  ];

  for (const item of tenantAItems) {
    await pool.query(
      `INSERT INTO "EquipmentItem" (id, "tenantId", name, type, "cooksCount", "maxCooks", quantity, status, notes, "createdAt", "updatedAt")
       VALUES ($1, 'tenant-a', $2, $3::"EquipmentType", $4, $5, $6, $7::"EquipmentStatus", $8, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE 
       SET name = $2, type = $3::"EquipmentType", "cooksCount" = $4, "maxCooks" = $5, quantity = $6, status = $7::"EquipmentStatus", notes = $8, "updatedAt" = NOW()`,
      [item.id, item.name, item.type, item.cooksCount, item.maxCooks, item.quantity, item.status, item.notes]
    );
  }

  console.log("Equipment seeded successfully for both venues!");
  await pool.end();
}

main().catch((err) => {
  console.error("Equipment seed failed:", err);
  process.exit(1);
});
