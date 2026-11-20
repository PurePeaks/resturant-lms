import { z } from "zod";

export const equipmentTypeSchema = z.enum(["COOKING_PLATE", "METAL_RING", "SERVING_PLATE"]);
export const equipmentStatusSchema = z.enum(["ACTIVE", "MAINTENANCE", "RETIRED"]);
