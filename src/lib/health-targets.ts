export type HealthTargets = {
  sleepHours: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  waterMl: number;
};

export const DEFAULT_HEALTH_TARGETS: HealthTargets = {
  sleepHours: 8,
  calories: 2200,
  protein: 120,
  carbs: 250,
  fat: 70,
  waterMl: 2500,
};

export function parseHealthTargets(raw: unknown): HealthTargets {
  let obj: Record<string, unknown> = {};
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      obj = {};
    }
  } else if (raw && typeof raw === "object") {
    obj = raw as Record<string, unknown>;
  }
  const num = (v: unknown, fallback: number) =>
    typeof v === "number" && Number.isFinite(v) && v > 0 ? v : fallback;
  return {
    sleepHours: num(obj.sleepHours, DEFAULT_HEALTH_TARGETS.sleepHours),
    calories: Math.round(num(obj.calories, DEFAULT_HEALTH_TARGETS.calories)),
    protein: Math.round(num(obj.protein, DEFAULT_HEALTH_TARGETS.protein)),
    carbs: Math.round(num(obj.carbs, DEFAULT_HEALTH_TARGETS.carbs)),
    fat: Math.round(num(obj.fat, DEFAULT_HEALTH_TARGETS.fat)),
    waterMl: Math.round(num(obj.waterMl, DEFAULT_HEALTH_TARGETS.waterMl)),
  };
}
