export type Print = {
  id: string;
  frame: number;
  at: number;
  jpeg: string;
};

const KEY = "latente.archive.v1";
const FRAME_KEY = "latente.frame.v1";
const MAX = 12;

export function loadPrints(): Print[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Print => {
        if (!item || typeof item !== "object") return false;
        const p = item as Partial<Print>;
        return typeof p.id === "string" && typeof p.jpeg === "string" && typeof p.frame === "number";
      })
      .slice(0, MAX);
  } catch {
    return [];
  }
}

export function savePrints(prints: Print[]) {
  const slim = prints.slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(slim));
  } catch {
    // Quota: drop oldest thumbnails until it fits.
    const smaller = slim.slice(0, Math.max(1, Math.floor(slim.length / 2)));
    try {
      localStorage.setItem(KEY, JSON.stringify(smaller));
    } catch {
      localStorage.removeItem(KEY);
    }
  }
}

export function currentFrame(): number {
  try {
    const n = Number(localStorage.getItem(FRAME_KEY));
    return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
  } catch {
    return 1;
  }
}

export function advanceFrame(): number {
  const n = currentFrame() + 1;
  localStorage.setItem(FRAME_KEY, String(n));
  return n;
}

export function padFrame(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(3, "0");
}
