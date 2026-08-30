export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(Math.max(value, min), max);
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
