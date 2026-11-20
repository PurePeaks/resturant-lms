// Scroll timeline for the pinned hero story (progress 0 → 1 across the section).
// The WebGL scene and the HTML overlays both read from here so they stay in sync.

export const CHAPTERS = {
  hero: [-0.2, 0.1],
  origin: [0.125, 0.26],
  minerals: [0.285, 0.455],
  heat: [0.485, 0.645],
  chill: [0.665, 0.81],
  cooks: [0.835, 1.2],
} as const;

export type ChapterKey = keyof typeof CHAPTERS;

export const CHAPTER_LABELS: Record<ChapterKey, string> = {
  hero: "Overview",
  origin: "Origin",
  minerals: "Minerals",
  heat: "Hot sear",
  chill: "Chilled",
  cooks: "40 cooks",
};

/** Exploded-view separation between strata. */
export const EXPLODE = [
  [0.28, 0],
  [0.345, 0.42],
  [0.425, 0.42],
  [0.47, 0],
] as const;

export const HEAT = [
  [0.49, 0],
  [0.58, 1],
  [0.64, 1],
  [0.685, 0],
] as const;

export const FROST = [
  [0.67, 0],
  [0.75, 1],
  [0.8, 1],
  [0.84, 0],
] as const;

/** Slab thickness as it wears down over 40 cooks (1 = 2.0"). */
export const THICKNESS = [
  [0.845, 1],
  [0.93, 0.45],
] as const;

export const COOKS_RANGE = [0.845, 0.93] as const;
export const BURST_RANGE = [0.935, 1] as const;

/** Surface temperature readout (°F) shared by the hot and chilled chapters. */
export const TEMP_INPUT = [0.49, 0.58, 0.65, 0.725];
export const TEMP_OUTPUT = [72, 465, 465, 0];
