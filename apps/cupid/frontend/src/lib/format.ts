export function formatAge(age: number): string {
  if (!Number.isFinite(age)) return "";
  return String(Math.round(age));
}


