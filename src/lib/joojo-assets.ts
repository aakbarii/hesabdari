export const STELLA_VARIANTS = ["classic", "reloaded", "journey", "dreamblast", "movie", "summermadness"] as const;
export type StellaVariant = typeof STELLA_VARIANTS[number];
export function stellaForPage(page?: string): StellaVariant {
  if (["sleep", "selfcare", "cycle", "mood", "medications"].includes(page ?? "")) return "dreamblast";
  if (["focus", "learning", "habits", "goals"].includes(page ?? "")) return "reloaded";
  if (["travel", "life", "nutrition"].includes(page ?? "")) return "journey";
  if (["workouts", "weight"].includes(page ?? "")) return "movie";
  if (["journal", "relationships"].includes(page ?? "")) return "summermadness";
  return "classic";
}
export const stellaImage = (variant: StellaVariant) => `/joojo/stella-${variant}.webp`;
